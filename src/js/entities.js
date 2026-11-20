/* ==========================================================================
   ENTITAS MEDAN PERANG: SIR ALDRIC, 7 TIPE ZOMBIE, 5 BOSS, SEKUTU, & KAVALERI
   ========================================================================== */

let nextUid = 1;

/* ==========================================================================
   1. SIR ALDRIC — KESATRIA BENTENG (HOLD-TO-GUARD, PARRY, SLAM, PALU, KAVALERI)
   ========================================================================== */
class Knight {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 50;
        this.h = 80;
        this.vx = 0;
        this.vy = 0;
        this.facing = 1;

        this.onGround = false;
        this.jumpsLeft = 2;
        this.coyoteTimer = 0;
        this.jumpBuffer = 0;
        this.scaleX = 1;
        this.scaleY = 1;

        // Statistik dasar & tempaan
        this.maxHp = 150;
        this.hp = 150;
        this.atk = 34;
        this.speed = 5.8;

        // Pedang Besar 3-Hit Combo + Execution Empowered + Plunge Slam
        this.attackTimer = 0;
        this.attackDuration = 14;
        this.attackCooldown = 0;
        this.comboStep = 0;
        this.comboReset = 0;
        this.empoweredSlash = false;
        this.slamming = false;
        this.hitIds = new Set();

        // Hold-to-Guard Perisai & Jendela Tangkis Balas (Parry!)
        this.guarding = false;
        this.wasGuarding = false;
        this.parryWindow = 0;
        this.parryCooldown = 0;
        this.shieldFlash = 0;

        // Palu Boomerang Suci
        this.hammerCooldown = 0;
        this.hammerMaxCd = 62;

        // Terompet Kavaleri Fajar (Valor 0..100)
        this.valor = 0;
        this.hornAnim = 0;

        // Status kebal & animasi
        this.invulnTimer = 0;
        this.damageBlinkTimer = 0;
        this.hurtFlash = 0;
        this.animTick = 0;
        this.capePhase = 0;

        this.recalcStats(false);
    }

    recalcStats(healBoost = false) {
        const prevMax = this.maxHp;
        const haste = getBlessingLevel('crusader_haste');
        const twin = getBlessingLevel('twin_hammer');
        this.atk = 34 + (game.forge.atkLv - 1) * 11;
        this.maxHp = 150 + (game.forge.hpLv - 1) * 32;
        this.speed = Math.min(8.6, 5.8 * (1 + haste * 0.16));
        this.hammerMaxCd = Math.max(30, 62 - twin * 10 - haste * 6);
        if (healBoost && this.maxHp > prevMax) {
            this.hp = Math.min(this.maxHp, this.hp + (this.maxHp - prevMax));
        } else {
            this.hp = Math.min(this.hp, this.maxHp);
        }
    }

    getArmorTier() {
        const lv = game.forge.atkLv + Math.floor(getTotalBlessings() / 2);
        if (lv >= 6) return 3; // Golden Dawn Crusader
        if (lv >= 3) return 2; // Silver Templar
        return 1;              // Steel Bastion Knight
    }

    gainValor(amt) {
        const mult = 1 + getBlessingLevel('crusader_haste') * 0.35;
        this.valor = Math.min(100, this.valor + amt * mult);
    }

    update() {
        this.animTick++;
        this.capePhase += 0.14 + Math.abs(this.vx) * 0.032;

        if (this.invulnTimer > 0) this.invulnTimer--;
        if (this.damageBlinkTimer > 0) this.damageBlinkTimer--;
        if (this.hurtFlash > 0) this.hurtFlash--;
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.hammerCooldown > 0) this.hammerCooldown--;
        if (this.parryWindow > 0) this.parryWindow--;
        if (this.parryCooldown > 0) this.parryCooldown--;
        if (this.shieldFlash > 0) this.shieldFlash--;
        if (this.hornAnim > 0) this.hornAnim--;
        if (this.coyoteTimer > 0) this.coyoteTimer--;
        if (this.jumpBuffer > 0) this.jumpBuffer--;
        if (this.comboReset > 0) {
            this.comboReset--;
            if (this.comboReset === 0) this.comboStep = 0;
        }

        // 1. Hold-to-Guard Perisai & Timed Perfect Parry!
        const wantGuard = keys.guardHeld && !this.slamming && this.attackTimer <= 2;
        if (wantGuard && !this.wasGuarding && this.parryCooldown <= 0) {
            this.parryWindow = 14; // 14 frame awal = Tangkis Balas Sempurna!
            this.parryCooldown = 24;
            this.shieldFlash = 14;
            sfx.play('block');
            spawnShockRing(this.x + this.w / 2 + this.facing * 24, this.y + 42, 42, '#7dd3fc', 3);
        }
        this.guarding = wantGuard;
        this.wasGuarding = wantGuard;

        // Cek proyektil musuh saat Perisai aktif (Parry Reflect / Block!)
        if (this.guarding) {
            this._checkShieldProjectiles();
        }

        // 2. Input Ultimate: Terompet Kavaleri Fajar
        if (keys.ultiPressed) {
            keys.ultiPressed = false;
            if (this.valor >= 100) this.summonCavalry();
        }

        // 3. Input Palu Boomerang Suci
        if (keys.hammerPressed) {
            keys.hammerPressed = false;
            if (this.hammerCooldown <= 0 && !this.slamming) {
                this.throwBoomerangHammer();
            }
        }

        // 4. Input Lompat
        if (keys.jumpPressed) {
            keys.jumpPressed = false;
            this.jumpBuffer = 8;
        }

        // 5. Input Tebas Pedang / Plunging Earthshaker Slam!
        if (keys.attackPressed) {
            keys.attackPressed = false;
            if (!this.onGround && this.y < GROUND_Y - 120 && !this.slamming) {
                this.startEarthshakerSlam();
            } else if (this.attackCooldown <= 0 && !this.slamming) {
                this.performSwordSwing();
            }
        }

        // 6. Gerakan Horizontal (lebih mantap & sedikit lambat saat menahan Perisai)
        let dir = 0;
        if (keys.left) dir -= 1;
        if (keys.right) dir += 1;

        if (this.slamming) {
            this.vx *= 0.82;
            this.vy = 19.2;
            if (this.animTick % 2 === 0) {
                spawnParticles(this.x + this.w / 2, this.y + this.h * 0.5, '#f8d274', 2);
            }
        } else if (dir !== 0) {
            this.facing = dir;
            const moveSpd = this.guarding ? this.speed * 0.45 : this.speed;
            if (Math.sign(this.vx) !== 0 && Math.sign(this.vx) !== dir) {
                this.vx = dir * moveSpd * 0.78;
            } else {
                this.vx += (dir * moveSpd - this.vx) * 0.36;
            }
        } else {
            this.vx *= this.onGround ? 0.72 : 0.88;
            if (Math.abs(this.vx) < 0.15) this.vx = 0;
        }

        // 7. Lompat / Double Jump
        if (this.jumpBuffer > 0 && !this.slamming) {
            if (this.coyoteTimer > 0) {
                this.vy = -13.6;
                this.onGround = false;
                this.coyoteTimer = 0;
                this.jumpsLeft = 1;
                this.jumpBuffer = 0;
                this.scaleX = 0.86;
                this.scaleY = 1.18;
                sfx.play('jump');
                spawnParticles(this.x + this.w / 2, this.y + this.h, '#d6d3d1', 6);
            } else if (this.jumpsLeft > 0) {
                this.vy = -12.4;
                this.jumpsLeft--;
                this.jumpBuffer = 0;
                this.scaleX = 0.84;
                this.scaleY = 1.2;
                sfx.play('jump');
                spawnShockRing(this.x + this.w / 2, this.y + this.h, 36, '#f8d274', 3);
            }
        }

        // 8. Gravitasi
        if (!this.slamming) {
            this.vy = Math.min(16, this.vy + 0.64);
        }

        // 9. Aktif Tebas Pedang
        if (this.attackTimer > 0) {
            this.attackTimer--;
            this._checkSwordHits();
        }

        // 10. Kolisi Horizontal dalam Halaman Benteng
        this.x += this.vx;
        if (this.x < GATE_X - 18) { this.x = GATE_X - 18; this.vx = 0; }
        if (this.x + this.w > WORLD_WIDTH - 24) { this.x = WORLD_WIDTH - 24 - this.w; this.vx = 0; }

        // 11. Kolisi Vertikal (Platform Menara/Jembatan & Jalan Batu Utama)
        const wasGround = this.onGround;
        const prevVy = this.vy;
        const prevBottom = this.y + this.h;
        this.y += this.vy;
        this.onGround = false;

        // Platform satu arah (tidak menghalangi saat Slam menembus ke bawah!)
        if (!this.slamming && !keys.down) {
            for (const p of ARENA_PLATFORMS) {
                if (this.x + this.w > p.x + 8 && this.x < p.x + p.w - 8) {
                    if (this.vy >= 0 && prevBottom <= p.y + 16 && this.y + this.h >= p.y) {
                        this.y = p.y - this.h;
                        this.vy = 0;
                        this.onGround = true;
                        this.coyoteTimer = 8;
                        this.jumpsLeft = 2;
                    }
                }
            }
        }

        // Jalan Batu Halaman Utama
        if (this.y + this.h >= GROUND_Y) {
            this.y = GROUND_Y - this.h;
            this.vy = 0;
            this.onGround = true;
            this.coyoteTimer = 8;
            this.jumpsLeft = 2;
            if (this.slamming) {
                this._finishEarthshakerSlam();
            }
        }

        if (this.onGround && !wasGround && prevVy > 5 && !this.slamming) {
            this.scaleX = 1.16;
            this.scaleY = 0.86;
            spawnParticles(this.x + this.w / 2, GROUND_Y, '#a8a29e', 6);
        }
        this.scaleX += (1 - this.scaleX) * 0.24;
        this.scaleY += (1 - this.scaleY) * 0.24;
    }

    performSwordSwing() {
        this.guarding = false;
        this.comboStep = (this.comboStep % 3) + 1;
        this.comboReset = 38;
        this.hitIds.clear();

        const haste = getBlessingLevel('crusader_haste');
        const isHeavy = this.comboStep === 3 || this.empoweredSlash;
        this.attackDuration = isHeavy ? 16 : 12;
        this.attackTimer = this.attackDuration;
        this.attackCooldown = Math.max(10, Math.round((isHeavy ? 19 : 14) / (1 + haste * 0.16)));
        this.scaleX = isHeavy ? 1.16 : 1.07;
        this.scaleY = isHeavy ? 0.9 : 0.96;

        if (this.onGround) this.vx += this.facing * (isHeavy ? 4.4 : 2.2);
        sfx.play(isHeavy ? 'heavy' : 'slash');

        if (isHeavy) {
            const fx = this.x + this.w / 2 + this.facing * 56;
            spawnShockRing(fx, this.y + 44, 62, this.empoweredSlash ? '#fde047' : '#f97316', 4);
            // Berkah: Gelombang Gempa Fajar pada Combo ke-3
            if (getBlessingLevel('earthshaker') > 0 && this.onGround) {
                this._spawnFlameWave(fx, this.facing);
            }
        }
    }

    startEarthshakerSlam() {
        this.slamming = true;
        this.guarding = false;
        this.vy = 19;
        this.invulnTimer = Math.max(this.invulnTimer, 18);
        sfx.play('heavy');
    }

    _finishEarthshakerSlam() {
        this.slamming = false;
        this.scaleX = 1.32;
        this.scaleY = 0.74;
        game.screenShake = 13;
        game.hitStop = 4;
        sfx.play('slam');

        const cx = this.x + this.w / 2;
        const eqLv = getBlessingLevel('earthshaker');
        const radius = 165 + eqLv * 38;
        const dmg = Math.round(this.atk * (1.75 + eqLv * 0.35));

        spawnShockRing(cx, GROUND_Y - 6, radius, '#f97316', 6);
        spawnShockRing(cx, GROUND_Y - 6, radius * 0.65, '#fde047', 4);
        spawnParticles(cx, GROUND_Y - 4, '#f8d274', 24);
        addFloatingText('HANTAMAN GEMPA!', cx, this.y - 24, '#fde047', true);

        // Hantam semua zombie & tong minyak dalam radius
        for (const z of zombies) {
            if (z.dead) continue;
            const zx = z.x + z.w / 2;
            const dist = Math.abs(zx - cx);
            if (dist < radius && z.y + z.h > GROUND_Y - 120) {
                z.takeDamage(dmg, Math.sign(zx - cx || this.facing) * 11, { isHeavy: true, isCrit: true, breakShield: true });
                z.stunTimer = Math.max(z.stunTimer, 42);
                if (getBlessingLevel('flame_blade') > 0) z.burnTimer = 150;
                registerComboHit();
                this.gainValor(6);
            }
        }
        for (const b of barrels) {
            if (!b.exploded && Math.abs((b.x + b.w / 2) - cx) < radius) explodeBarrel(b);
        }

        if (eqLv > 0) {
            this._spawnFlameWave(cx - 24, -1);
            this._spawnFlameWave(cx + 24, 1);
        }
    }

    _spawnFlameWave(x, dir) {
        const dmg = Math.round(this.atk * (0.95 + getBlessingLevel('earthshaker') * 0.35));
        heroProjectiles.push({
            kind: 'flame_wave',
            x,
            y: GROUND_Y - 22,
            vx: dir * 10.5,
            vy: 0,
            w: 44,
            h: 48,
            facing: dir,
            dmg,
            hitIds: new Set(),
            life: 44
        });
    }

    _checkSwordHits() {
        const isHeavy = this.comboStep === 3 || this.empoweredSlash;
        const reach = (isHeavy ? 108 : 88) + (this.getArmorTier() - 1) * 8;
        const box = {
            x: this.facing === 1 ? this.x + this.w * 0.35 : this.x + this.w * 0.65 - reach,
            y: this.y - 16,
            w: reach,
            h: this.h + 24
        };

        // 1. Tebas Tong Minyak Peledak
        for (const b of barrels) {
            if (!b.exploded && rectOverlap(box, b)) {
                explodeBarrel(b);
            }
        }

        // 2. Tebas proyektil musuh
        for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
            const ep = enemyProjectiles[i];
            if (rectOverlap(box, { x: ep.x - ep.r, y: ep.y - ep.r, w: ep.r * 2, h: ep.r * 2 })) {
                spawnParticles(ep.x, ep.y, '#fde047', 8);
                sfx.play('block');
                enemyProjectiles.splice(i, 1);
            }
        }

        // 3. Tebas Zombie & Boss
        const baseMult = this.empoweredSlash ? 2.2 : (this.comboStep === 3 ? 1.6 : (this.comboStep === 2 ? 1.2 : 1.0));
        const flameLv = getBlessingLevel('flame_blade');
        let landedAny = false;

        for (const z of zombies) {
            if (z.dead || this.hitIds.has(z.uid)) continue;
            if (rectOverlap(box, z)) {
                this.hitIds.add(z.uid);
                landedAny = true;
                const isCrit = this.empoweredSlash || this.comboStep === 3 || Math.random() < 0.2;
                const dmg = Math.round(this.atk * baseMult * (isCrit ? 1.35 : 1.0));
                z.takeDamage(dmg, this.facing * (isHeavy ? 10 : 5.5), {
                    isCrit,
                    isHeavy,
                    breakShield: isHeavy
                });
                if (flameLv > 0) z.burnTimer = Math.max(z.burnTimer, 140 + flameLv * 45);
                registerComboHit();
                this.gainValor(isHeavy ? 8 : 5);
                game.hitStop = Math.max(game.hitStop, isHeavy ? 4 : 2);
                game.screenShake = Math.max(game.screenShake, isHeavy ? 6 : 3);
            }
        }

        if (landedAny && this.empoweredSlash) {
            this.empoweredSlash = false;
            addFloatingText('EKSEKUSI BALAS!', this.x + this.w / 2 + this.facing * 50, this.y - 26, '#fde047', true);
        }
    }

    _checkShieldProjectiles() {
        const shieldBox = {
            x: this.facing === 1 ? this.x + this.w - 6 : this.x - 24,
            y: this.y + 4,
            w: 30,
            h: this.h - 8
        };
        for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
            const ep = enemyProjectiles[i];
            if (rectOverlap(shieldBox, { x: ep.x - ep.r, y: ep.y - ep.r, w: ep.r * 2, h: ep.r * 2 })) {
                if (this.parryWindow > 0) {
                    // TANGKIS BALAS: Pantulkan panah/bola mantra langsung balik ke gerombolan zombie!
                    this.triggerPerfectParry(ep.x, ep.y, null);
                    heroProjectiles.push({
                        kind: 'reflected_bolt',
                        x: ep.x,
                        y: ep.y,
                        vx: this.facing * 15.5,
                        vy: -0.6,
                        w: 34,
                        h: 14,
                        facing: this.facing,
                        dmg: Math.round(this.atk * 2.4),
                        hitIds: new Set(),
                        life: 70
                    });
                } else {
                    sfx.play('block');
                    spawnParticles(ep.x, ep.y, '#7dd3fc', 9);
                    addFloatingText('TANGKIS!', ep.x, ep.y - 12, '#7dd3fc');
                }
                enemyProjectiles.splice(i, 1);
            }
        }
    }

    triggerPerfectParry(px, py, attacker) {
        game.totalParries++;
        this.shieldFlash = 22;
        this.empoweredSlash = true;
        this.invulnTimer = Math.max(this.invulnTimer, 22);
        this.hp = Math.min(this.maxHp, this.hp + 8);
        this.gainValor(20);
        game.hitStop = 6;
        game.screenShake = 8;

        sfx.play('parry');
        spawnShockRing(px, py, 95, '#fde047', 6);
        spawnParticles(px, py, '#fde047', 22);
        addFloatingText('TANGKIS BALAS!', this.x + this.w / 2, this.y - 28, '#fde047', true);

        const thornLv = getBlessingLevel('thorn_shield');
        for (const z of zombies) {
            if (z.dead) continue;
            if (Math.hypot((z.x + z.w / 2) - px, (z.y + z.h / 2) - py) < 135) {
                z.stunTimer = Math.max(z.stunTimer, z.isBoss ? 28 : 75);
                z.vx = Math.sign((z.x + z.w / 2) - px || this.facing) * 8;
                if (thornLv > 0 || z === attacker) {
                    const refDmg = Math.round(this.atk * (0.9 + thornLv * 0.65));
                    z.takeDamage(refDmg, this.facing * 9, { isCrit: true, breakShield: true });
                }
            }
        }
    }

    throwBoomerangHammer() {
        this.hammerCooldown = this.hammerMaxCd;
        const twinLv = getBlessingLevel('twin_hammer');
        const count = twinLv > 0 ? 2 : 1;
        const baseDmg = Math.round(this.atk * (1.15 + twinLv * 0.15));

        for (let i = 0; i < count; i++) {
            const sy = this.y + 30 - i * 26;
            const speed = 13.8 + i * 1.4;
            heroProjectiles.push({
                kind: 'boomerang_hammer',
                x: this.x + this.w / 2 + this.facing * 26,
                y: sy,
                vx: this.facing * speed,
                vy: i === 1 ? -1.8 : 0,
                originDir: this.facing,
                returning: false,
                spin: 0,
                w: 38,
                h: 38,
                dmg: baseDmg,
                hitCooldowns: new Map(),
                life: 110
            });
        }
        sfx.play('hammer');
        spawnParticles(this.x + this.w / 2 + this.facing * 22, this.y + 32, '#f8d274', 8);
    }

    summonCavalry() {
        this.valor = 0;
        this.hornAnim = 40;
        this.invulnTimer = Math.max(this.invulnTimer, 45);
        game.screenShake = 15;
        sfx.play('cavalry_horn');

        // Pulihkan Sir Aldric & Gerbang Benteng
        const hornLv = getBlessingLevel('golden_horn');
        const heroHeal = Math.round(this.maxHp * 0.24);
        const gateHeal = Math.round(game.gateMaxHp * (0.12 + hornLv * 0.16));
        this.hp = Math.min(this.maxHp, this.hp + heroHeal);
        game.gateHp = Math.min(game.gateMaxHp, game.gateHp + gateHeal);

        addFloatingText('SERBUAN KAVALERI FAJAR!', this.x + this.w / 2, this.y - 38, '#fde047', true);
        spawnShockRing(this.x + this.w / 2, this.y + 30, 140, '#fde047', 6);

        // Panggil Barisan Kuda Perang Emas menerjang dari Gerbang melintasi seluruh medan perang!
        const riders = 4 + hornLv * 3;
        const dmg = Math.round(this.atk * (2.6 + hornLv * 0.65));
        for (let i = 0; i < riders; i++) {
            cavalryRiders.push({
                x: GATE_X - 80 - i * 115,
                y: GROUND_Y - 82 - (i % 2) * 14,
                vx: 15.5 + (i % 3) * 1.1,
                w: 96,
                h: 82,
                dmg,
                hitIds: new Set(),
                phase: i * 1.2
            });
        }
    }

    takeDamage(amount, knockX = 0, attacker = null) {
        if (this.invulnTimer > 0 || game.state !== 'playing') return false;

        // Cek Guard / Perfect Parry dari depan!
        const fromFront = attacker
            ? Math.sign((attacker.x + attacker.w / 2) - (this.x + this.w / 2)) === this.facing
            : Math.sign(-knockX) === this.facing;

        if (this.guarding && fromFront) {
            if (this.parryWindow > 0) {
                this.triggerPerfectParry(this.x + this.w / 2 + this.facing * 26, this.y + 38, attacker);
                return false;
            }
            // Normal Shield Block: tahan 82% damage!
            const reduced = Math.max(2, Math.round(amount * 0.18));
            this.hp = Math.max(1, this.hp - reduced);
            this.invulnTimer = 18;
            this.shieldFlash = 10;
            this.vx = knockX * 0.35;
            this.gainValor(6);
            sfx.play('block');
            spawnParticles(this.x + this.w / 2 + this.facing * 24, this.y + 40, '#7dd3fc', 10);
            addFloatingText(`TAHAN (-${reduced})`, this.x + this.w / 2, this.y - 14, '#7dd3fc');

            // Berkah Perisai Duri Pembalas
            const thornLv = getBlessingLevel('thorn_shield');
            if (thornLv > 0 && attacker && !attacker.dead) {
                attacker.takeDamage(Math.round(amount * (1.3 * thornLv)), this.facing * 8, { breakShield: true });
                attacker.stunTimer = Math.max(attacker.stunTimer, 45);
            }
            return false;
        }

        // Terkena Serangan Langsung
        this.hp = Math.max(0, this.hp - amount);
        this.invulnTimer = 36;
        this.damageBlinkTimer = 34;
        this.hurtFlash = 14;
        this.vx = knockX;
        this.vy = -5.2;
        game.comboCount = 0;
        game.comboTimer = 0;
        game.screenShake = Math.max(game.screenShake, 8);
        game.hurtVignette = 18;

        sfx.play('hurt');
        spawnParticles(this.x + this.w / 2, this.y + 38, '#ef4444', 12);
        addFloatingText(`-${amount}`, this.x + this.w / 2, this.y - 16, '#fca5a5', true);

        if (this.hp <= 0) triggerGameOver('Sir Aldric gugur di medan tempur.');
        return true;
    }

    draw(ctx) {
        if (this.damageBlinkTimer > 0 && Math.floor(this.damageBlinkTimer / 3) % 2 === 0) return;

        const tier = this.getArmorTier();
        const pal = tier === 3
            ? { plate: '#f8d274', shade: '#926018', hi: '#fffbeb', cape: '#b91c1c', tabard: '#7f1d1d', trim: '#fffbeb', blade: '#fef08a', glow: '#f59e0b' }
            : (tier === 2
                ? { plate: '#e2e8f0', shade: '#64748b', hi: '#ffffff', cape: '#991b1b', tabard: '#7f1d1d', trim: '#f8d274', blade: '#f1f5f9', glow: '#38bdf8' }
                : { plate: '#b6bec8', shade: '#475569', hi: '#e2e8f0', cape: '#991b1b', tabard: '#7f1d1d', trim: '#d69c35', blade: '#cbd5e1', glow: '#f8d274' });

        const cx = this.x + this.w / 2;
        const by = this.y + this.h;
        const moving = Math.abs(this.vx) > 0.6 && this.onGround;
        const stride = moving ? Math.sin(this.animTick * 0.32) * 10 : 0;
        const bob = moving ? Math.abs(Math.cos(this.animTick * 0.32)) * 3 : Math.sin(this.animTick * 0.08) * 1.4;

        ctx.save();
        ctx.translate(cx, by);
        ctx.scale(this.facing * this.scaleX, this.scaleY);

        // Bayangan tanah
        if (this.onGround) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.44)';
            ctx.beginPath();
            ctx.ellipse(0, 2, 26, 7, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Aura Emas saat Empowered Slash / Terompet Penuh
        if (this.empoweredSlash || this.valor >= 100) {
            ctx.save();
            ctx.globalAlpha = 0.25 + Math.sin(this.animTick * 0.24) * 0.12;
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.ellipse(0, -42, 34, 46, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 1. Jubah Perang Merah Berkibar Multi-Kurva
        const flutter = Math.sin(this.capePhase) * 7 + Math.abs(this.vx) * 2.1;
        const capeGrad = ctx.createLinearGradient(-38, -60, 0, -10);
        capeGrad.addColorStop(0, '#6b1212');
        capeGrad.addColorStop(1, pal.cape);
        ctx.fillStyle = capeGrad;
        ctx.beginPath();
        ctx.moveTo(-8, -58 - bob);
        ctx.quadraticCurveTo(-28 - flutter * 0.7, -38 - bob, -38 - flutter, -10 - bob);
        ctx.lineTo(-14 - flutter * 0.35, -6 - bob);
        ctx.quadraticCurveTo(-8, -28 - bob, -4, -36 - bob);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = pal.trim;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-36 - flutter, -11 - bob);
        ctx.lineTo(-14 - flutter * 0.35, -7 - bob);
        ctx.stroke();

        // 2. Kaki Berzirah Greaves + Pelindung Lutut
        const drawLeg = (lx, offset, isFront) => {
            ctx.fillStyle = isFront ? pal.plate : pal.shade;
            ctx.beginPath();
            ctx.roundRect(lx + offset, -28, 11, 28, 3);
            ctx.fill();
            ctx.fillStyle = pal.trim;
            ctx.fillRect(lx + offset, -17, 11, 4); // Knee guard
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(lx + offset - 1, -6, 14, 6); // Sabaton boot
        };
        drawLeg(-12, -stride * 0.65, false);
        drawLeg(2, stride * 0.65, true);

        // 3. Zirah Dada Bergradasi Metalik + Tabard Salib Emas
        const chestGrad = ctx.createLinearGradient(-16, -60 - bob, 16, -24 - bob);
        chestGrad.addColorStop(0, this.hurtFlash > 0 ? '#ffffff' : pal.hi);
        chestGrad.addColorStop(0.5, this.hurtFlash > 0 ? '#ffffff' : pal.plate);
        chestGrad.addColorStop(1, pal.shade);
        ctx.fillStyle = chestGrad;
        ctx.beginPath();
        ctx.roundRect(-16, -60 - bob, 32, 36, 7);
        ctx.fill();
        ctx.strokeStyle = pal.shade;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Tabard & Emblem Salib Kesatria
        ctx.fillStyle = pal.tabard;
        ctx.fillRect(-7, -56 - bob, 14, 34);
        ctx.fillStyle = pal.trim;
        ctx.fillRect(-2, -53 - bob, 4, 22);
        ctx.fillRect(-7, -46 - bob, 14, 4);
        // Sabuk Kulit & Gesper Emas
        ctx.fillStyle = '#3b2413';
        ctx.fillRect(-16, -31 - bob, 32, 6);
        ctx.fillStyle = pal.trim;
        ctx.fillRect(-4, -32 - bob, 8, 8);

        // Pelindung Bahu Berukir (Pauldrons)
        ctx.fillStyle = pal.plate;
        ctx.beginPath();
        ctx.arc(-14, -54 - bob, 9.5, Math.PI * 0.75, Math.PI * 2.15);
        ctx.fill();
        ctx.strokeStyle = pal.trim;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // 4. Greathelm Kesatria + Jambul Bulu Panjang
        const plumeW = Math.sin(this.capePhase * 1.25) * 4 + Math.abs(this.vx) * 1.1;
        ctx.fillStyle = pal.cape;
        ctx.beginPath();
        ctx.moveTo(-2, -78 - bob);
        ctx.quadraticCurveTo(-20 - plumeW, -90 - bob, -32 - plumeW * 1.2, -73 - bob);
        ctx.quadraticCurveTo(-18 - plumeW * 0.6, -70 - bob, -6, -71 - bob);
        ctx.closePath();
        ctx.fill();

        const helmGrad = ctx.createLinearGradient(-13, -80 - bob, 14, -56 - bob);
        helmGrad.addColorStop(0, this.hurtFlash > 0 ? '#ffffff' : pal.hi);
        helmGrad.addColorStop(0.55, pal.plate);
        helmGrad.addColorStop(1, pal.shade);
        ctx.fillStyle = helmGrad;
        ctx.beginPath();
        ctx.roundRect(-13, -80 - bob, 26, 24, 7);
        ctx.fill();
        ctx.strokeStyle = pal.shade;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Palang Emas Greathelm + Visor Menyala
        ctx.fillStyle = pal.trim;
        ctx.fillRect(-13, -80 - bob, 26, 4);
        ctx.fillRect(1, -80 - bob, 3, 23);
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, -70 - bob, 13, 5);
        ctx.fillStyle = this.empoweredSlash ? '#fde047' : '#bae6fd';
        ctx.fillRect(3, -69 - bob, 9, 2.5);

        // 5. Pedang Besar (Greatsword) + Efek Smear Busur Tebasan Lebar!
        const hasFlame = getBlessingLevel('flame_blade') > 0;
        ctx.save();
        if (this.slamming) {
            ctx.translate(8, -28);
            ctx.rotate(Math.PI);
        } else if (this.attackTimer > 0) {
            const p = 1 - this.attackTimer / this.attackDuration;
            const isHeavy = this.comboStep === 3 || this.empoweredSlash;
            const swingAng = this.comboStep === 2 ? (1.3 - p * 2.7) : (-1.6 + p * 3.2);

            // Wide Luminous Sword Smear Arc!
            ctx.save();
            ctx.globalAlpha = Math.max(0, 0.88 - p * 0.72);
            const arcR = isHeavy ? 82 : 64;
            ctx.strokeStyle = hasFlame ? '#f97316' : (isHeavy ? '#fde047' : pal.glow);
            ctx.lineWidth = isHeavy ? 20 : 13;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(8, -42 - bob, arcR, -1.3, 1.12);
            ctx.stroke();

            ctx.strokeStyle = '#fffbeb';
            ctx.lineWidth = isHeavy ? 6 : 3.5;
            ctx.beginPath();
            ctx.arc(8, -42 - bob, arcR - 4, -1.15, 1.0);
            ctx.stroke();
            ctx.restore();

            ctx.translate(10, -44 - bob);
            ctx.rotate(swingAng);
        } else if (this.hornAnim > 0) {
            ctx.translate(12, -52 - bob);
            ctx.rotate(-0.2);
        } else {
            ctx.translate(12, -42 - bob);
            ctx.rotate(this.guarding ? -0.9 : (-0.38 + Math.sin(this.animTick * 0.08) * 0.05));
        }

        const bladeLen = tier === 3 ? 60 : (tier === 2 ? 54 : 48);
        // Gagang & Pommel Emas
        ctx.fillStyle = '#5c2d0e';
        ctx.fillRect(-3.5, -2, 7, 16);
        ctx.fillStyle = pal.trim;
        ctx.beginPath();
        ctx.arc(0, 15, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-13, -5, 26, 5.5);
        // Bilah Greatsword
        const bGrad = ctx.createLinearGradient(-5, -5, 5, -bladeLen);
        bGrad.addColorStop(0, hasFlame ? '#fde047' : '#ffffff');
        bGrad.addColorStop(1, hasFlame ? '#f97316' : pal.blade);
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.moveTo(-4.8, -5);
        ctx.lineTo(-4, -bladeLen);
        ctx.lineTo(0, -bladeLen - 12);
        ctx.lineTo(4, -bladeLen);
        ctx.lineTo(4.8, -5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = hasFlame ? '#fb923c' : pal.glow;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();

        // 6. Perisai Menara Crusader (Mengangkat lebar + Kubah Energi saat Hold-to-Guard!)
        const sx = this.guarding ? 20 : 10;
        const sy = this.guarding ? -46 - bob : -42 - bob;
        const sw = this.guarding ? 18 : 14;
        const sh = this.guarding ? 42 : 34;

        ctx.fillStyle = '#1e2430';
        ctx.beginPath();
        ctx.moveTo(sx - sw * 0.3, sy - sh * 0.45);
        ctx.lineTo(sx + sw * 0.7, sy - sh * 0.45);
        ctx.lineTo(sx + sw * 0.7, sy + sh * 0.15);
        ctx.lineTo(sx + sw * 0.2, sy + sh * 0.55);
        ctx.lineTo(sx - sw * 0.3, sy + sh * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = this.parryWindow > 0 ? '#fde047' : pal.trim;
        ctx.lineWidth = this.guarding ? 3 : 2.2;
        ctx.stroke();

        // Salib Emas Perisai
        ctx.fillStyle = this.parryWindow > 0 ? '#fffbeb' : pal.trim;
        ctx.fillRect(sx + sw * 0.14, sy - sh * 0.3, 3, sh * 0.62);
        ctx.fillRect(sx - sw * 0.14, sy - sh * 0.08, sw * 0.68, 3);

        // Kubah Cahaya Guard / Parry
        if (this.guarding || this.shieldFlash > 0) {
            const isParry = this.parryWindow > 0 || this.shieldFlash > 8;
            ctx.strokeStyle = isParry ? '#fde047' : '#38bdf8';
            ctx.lineWidth = isParry ? 5 : 3;
            ctx.beginPath();
            ctx.arc(16, -42 - bob, 44, -Math.PI * 0.46, Math.PI * 0.46);
            ctx.stroke();
            ctx.fillStyle = isParry ? 'rgba(253, 224, 71, 0.2)' : 'rgba(56, 189, 248, 0.14)';
            ctx.beginPath();
            ctx.arc(16, -42 - bob, 43, -Math.PI * 0.46, Math.PI * 0.46);
            ctx.fill();
        }

        ctx.restore();
    }
}

/* ==========================================================================
   2. ZOMBIE HORDE (7 ARCHETYPE BERDETAIL + KELUAR DARI KUBUR + 5 SIEGE BOSS)
   ========================================================================== */
class Zombie {
    constructor(type, x, nightNum = 1, bossOpts = null) {
        this.uid = nextUid++;
        this.type = type;
        this.isBoss = type === 'boss';
        this.bossOpts = bossOpts || {};
        this.facing = -1;
        this.vx = 0;
        this.vy = 0;
        this.dead = false;
        this.animTick = Math.floor(Math.random() * 60);
        this.hurtFlash = 0;
        this.stunTimer = 0;
        this.burnTimer = 0;
        this.attackCooldown = 40 + Math.floor(Math.random() * 40);
        this.telegraphTimer = 0;

        // Efek merangkak naik dari liang kubur!
        this.emergeTimer = (!this.isBoss && x < WORLD_WIDTH - 120) ? 32 : 0;
        this.graveX = x;

        const scaleHp = 1 + (nightNum - 1) * 0.22;
        const scaleDmg = 1 + (nightNum - 1) * 0.1;

        if (this.isBoss) {
            this.w = 92;
            this.h = 134;
            this.x = x;
            this.y = GROUND_Y - this.h;
            this.maxHp = this.bossOpts.hp || Math.round(900 * scaleHp);
            this.hp = this.maxHp;
            this.dmg = this.bossOpts.dmg || Math.round(24 * scaleDmg);
            this.gateDmg = this.bossOpts.gateDmg || 38;
            this.speed = this.bossOpts.speed || 2.2;
            this.goldDrop = 120 + nightNum * 18;
            this.maxPhases = this.bossOpts.phases || 2;
            this.phase = 1;
            this.bossState = 'march';
            this.stateTimer = 70;
        } else {
            const defs = {
                walker:      { w: 42, h: 70, hp: 72,  dmg: 12, gDmg: 10, spd: 1.25, gold: 10 },
                ghoul:       { w: 42, h: 56, hp: 58,  dmg: 14, gDmg: 11, spd: 2.95, gold: 13 },
                keg_carrier: { w: 50, h: 74, hp: 82,  dmg: 28, gDmg: 65, spd: 1.85, gold: 18 },
                crossbow:    { w: 42, h: 68, hp: 64,  dmg: 15, gDmg: 9,  spd: 1.15, gold: 15 },
                rot_knight:  { w: 52, h: 80, hp: 165, dmg: 20, gDmg: 18, spd: 1.2,  gold: 24 },
                necromancer: { w: 44, h: 78, hp: 105, dmg: 17, gDmg: 12, spd: 1.1,  gold: 26 }
            };
            const d = defs[type] || defs.walker;
            this.w = d.w;
            this.h = d.h;
            this.x = x;
            this.y = GROUND_Y - this.h;
            this.maxHp = Math.round(d.hp * scaleHp);
            this.hp = this.maxHp;
            this.dmg = Math.round(d.dmg * scaleDmg);
            this.gateDmg = Math.round(d.gDmg * scaleDmg);
            this.speed = d.spd * Math.min(1.28, 1 + (nightNum - 1) * 0.02);
            this.goldDrop = d.gold + Math.floor(nightNum * 1.4);
            this.handCooldown = 190;
        }
    }

    update() {
        if (this.dead) return;
        this.animTick++;
        if (this.hurtFlash > 0) this.hurtFlash--;
        if (this.attackCooldown > 0) this.attackCooldown--;

        // Animasi merangkak keluar dari tanah kuburan!
        if (this.emergeTimer > 0) {
            this.emergeTimer--;
            if (this.emergeTimer % 6 === 0) {
                spawnParticles(this.x + this.w / 2, GROUND_Y, '#57534e', 3);
            }
            return;
        }

        // Efek Api Suci (Holy Burn)
        if (this.burnTimer > 0) {
            this.burnTimer--;
            if (this.burnTimer % 26 === 0) {
                const bd = Math.max(5, Math.round(knight.atk * (0.24 + getBlessingLevel('flame_blade') * 0.08)));
                this.hp -= bd;
                spawnParticles(this.x + this.w / 2, this.y + this.h * 0.45, '#f97316', 4);
                addFloatingText(`${bd}`, this.x + this.w / 2, this.y - 6, '#fb923c');
                if (this.hp <= 0) {
                    this.die();
                    return;
                }
            }
        }

        if (this.stunTimer > 0) {
            this.stunTimer--;
            this.vx *= 0.8;
            this._stepPhysics();
            return;
        }

        if (this.isBoss) {
            this._updateBoss();
        } else {
            this._updateHordeUnit();
        }
    }

    _updateHordeUnit() {
        const distHero = (knight.x + knight.w / 2) - (this.x + this.w / 2);
        const absHero = Math.abs(distHero);
        const atGate = this.x <= GATE_X + 18;

        // Target utama: serang Sir Aldric jika dekat, atau serbu Gerbang Benteng!
        if (this.type === 'keg_carrier') {
            this.facing = -1;
            this.vx = -this.speed;
            if (atGate) {
                // Meledakkan tong wabah tepat di Gerbang Benteng!
                damageGate(this.gateDmg, this.x);
                spawnShockRing(this.x + this.w / 2, this.y + 30, 110, '#84cc16', 5);
                sfx.play('explosion');
                this.die(true);
                return;
            }
            if (rectOverlap(this, knight)) {
                knight.takeDamage(this.dmg, -8, this);
                this.die(false);
                return;
            }
        } else if (this.type === 'crossbow') {
            this.facing = absHero < 520 ? (distHero >= 0 ? 1 : -1) : -1;
            if (this.x > 640 && absHero > 380) {
                this.vx = -this.speed;
            } else {
                this.vx *= 0.8;
            }
            if (this.telegraphTimer > 0) {
                this.telegraphTimer--;
                if (this.telegraphTimer === 0) {
                    const tx = absHero < 520 ? knight.x + knight.w / 2 : GATE_X;
                    const ty = absHero < 520 ? knight.y + 36 : GROUND_Y - 75;
                    const sx = this.x + this.w / 2 + this.facing * 20;
                    const sy = this.y + 28;
                    const ang = Math.atan2(ty - sy, tx - sx);
                    enemyProjectiles.push({
                        kind: 'bolt',
                        x: sx, y: sy,
                        vx: Math.cos(ang) * 7.6,
                        vy: Math.sin(ang) * 7.6,
                        r: 8, dmg: this.dmg, color: '#a3e635', life: 130
                    });
                    sfx.play('arrow');
                    this.attackCooldown = 115;
                }
            } else if (this.attackCooldown <= 0 && this.x < WORLD_WIDTH - 60) {
                this.telegraphTimer = 18;
            }
        } else if (this.type === 'necromancer') {
            this.facing = distHero >= 0 ? 1 : -1;
            this.vx = this.x > 780 ? -this.speed : this.vx * 0.82;
            if (this.handCooldown > 0) this.handCooldown--;
            if (this.handCooldown <= 0) {
                // Panggil Cakar Kubur tepat di bawah kaki Sir Aldric!
                graveHands.push({
                    x: knight.x + knight.w / 2,
                    timer: 46, // 30 frame peringatan hijau -> 16 frame mencengkeram ke atas!
                    maxTimer: 46,
                    dmg: this.dmg,
                    hitDone: false
                });
                this.handCooldown = 210;
                addFloatingText('CAKAR KUBUR!', this.x + this.w / 2, this.y - 16, '#5eead4');
            } else if (this.attackCooldown <= 0) {
                const ang = Math.atan2((knight.y + 36) - (this.y + 30), (knight.x + knight.w / 2) - (this.x + this.w / 2));
                enemyProjectiles.push({
                    kind: 'soul',
                    x: this.x + this.w / 2 + this.facing * 20,
                    y: this.y + 28,
                    vx: Math.cos(ang) * 6.4,
                    vy: Math.sin(ang) * 6.4,
                    r: 10, dmg: this.dmg, color: '#2dd4bf', life: 140
                });
                this.attackCooldown = 125;
            }
        } else {
            // Walker, Ghoul, Rot-Iron Knight
            const engageHero = absHero < 260 && Math.abs(knight.y - this.y) < 110;
            if (engageHero) {
                this.facing = distHero >= 0 ? 1 : -1;
                this.vx = this.facing * this.speed;
                if (this.type === 'ghoul' && this.y + this.h >= GROUND_Y - 2 && this.attackCooldown <= 0 && absHero < 190 && absHero > 50) {
                    this.vy = -9.4;
                    this.vx = this.facing * (this.speed * 1.65);
                    this.attackCooldown = 78;
                }
            } else if (!atGate) {
                this.facing = -1;
                this.vx = -this.speed;
            } else {
                this.facing = -1;
                this.vx = 0;
                if (this.attackCooldown <= 0) {
                    damageGate(this.gateDmg, this.x);
                    this.attackCooldown = 68;
                }
            }

            // Serang sekutu pengawal jika berhadapan
            for (const al of allies) {
                if (!al.dead && rectOverlap(this, al) && this.attackCooldown <= 0) {
                    al.takeDamage(Math.round(this.dmg * 0.7));
                    this.attackCooldown = 52;
                }
            }
        }

        this._stepPhysics();

        if (rectOverlap(this, knight) && this.attackCooldown <= 10) {
            if (knight.takeDamage(this.dmg, Math.sign(distHero || -1) * 7, this)) {
                this.attackCooldown = 48;
            }
        }
    }

    _updateBoss() {
        const hpRatio = this.hp / this.maxHp;
        const nextPhase = (this.maxPhases >= 3 && hpRatio <= 0.34)
            ? 3
            : (this.maxPhases >= 2 && hpRatio <= 0.64 ? 2 : 1);

        if (nextPhase > this.phase) {
            this.phase = nextPhase;
            this.bossState = 'roar';
            this.stateTimer = 34;
            this.vx = 0;
            sfx.play('boss_roar');
            game.screenShake = 14;
            spawnShockRing(this.x + this.w / 2, this.y + this.h / 2, 180, this.bossOpts.accent, 7);
            addFloatingText(`FASE ${this.phase}! MURKA!`, this.x + this.w / 2, this.y - 34, '#fde047', true);
            // Munculkan 2 cakar kubur saat ganti fase!
            graveHands.push({ x: knight.x + knight.w / 2, timer: 44, maxTimer: 44, dmg: this.dmg, hitDone: false });
        }

        const dx = (knight.x + knight.w / 2) - (this.x + this.w / 2);
        const atGate = this.x <= GATE_X + 22;
        this.stateTimer--;
        const mult = 1 + (this.phase - 1) * 0.16;

        if (this.bossState === 'roar') {
            this.vx *= 0.8;
            if (this.stateTimer <= 0) { this.bossState = 'march'; this.stateTimer = 50; }
        } else if (this.bossState === 'march') {
            this.facing = Math.abs(dx) < 380 ? (dx >= 0 ? 1 : -1) : -1;
            this.vx = atGate && this.facing === -1 ? 0 : this.facing * this.speed * mult;
            if (atGate && this.attackCooldown <= 0) {
                damageGate(this.gateDmg, this.x);
                this.attackCooldown = 70;
            }
            if (this.stateTimer <= 0) {
                const r = Math.random();
                if (r < 0.36) {
                    this.bossState = 'charge_prep';
                    this.stateTimer = 26;
                    this.vx = 0;
                    addFloatingText('AWAS SERBUAN!', this.x + this.w / 2, this.y - 26, '#fca5a5', true);
                } else if (r < 0.68) {
                    this.bossState = 'leap_slam';
                    this.stateTimer = 54;
                    this.vy = -14.8;
                    this.vx = Math.max(-6.5, Math.min(6.5, dx * 0.02));
                } else {
                    this.bossState = 'barrage';
                    this.stateTimer = 40;
                    this.vx = 0;
                }
            }
        } else if (this.bossState === 'charge_prep') {
            this.facing = dx >= 0 ? 1 : -1;
            this.vx = 0;
            if (this.stateTimer <= 0) {
                this.bossState = 'charging';
                this.stateTimer = 30;
                this.vx = this.facing * (9.2 * mult);
                sfx.play('boss_roar');
            }
        } else if (this.bossState === 'charging') {
            this.vx = this.facing * (9.0 * mult);
            if (this.x <= GATE_X + 20) {
                damageGate(Math.round(this.gateDmg * 1.25), this.x);
                this.stateTimer = 0;
            }
            if (this.stateTimer <= 0) {
                this.bossState = 'march';
                this.stateTimer = 46;
            }
        } else if (this.bossState === 'leap_slam') {
            if (this.y + this.h >= GROUND_Y - 2 && this.vy >= 0 && this.stateTimer < 46) {
                game.screenShake = 13;
                sfx.play('slam');
                spawnShockRing(this.x + this.w / 2, GROUND_Y - 6, 130, this.bossOpts.accent, 6);
                for (const d of [-1, 1]) {
                    enemyProjectiles.push({
                        kind: 'shock',
                        x: this.x + this.w / 2 + d * 36,
                        y: GROUND_Y - 16,
                        vx: d * (7.2 + this.phase * 0.8),
                        vy: 0, r: 15, dmg: Math.round(this.dmg * 0.9),
                        color: this.bossOpts.accent, life: 80
                    });
                }
                this.bossState = 'march';
                this.stateTimer = 48;
            } else if (this.stateTimer <= 0) {
                this.bossState = 'march';
                this.stateTimer = 40;
            }
        } else if (this.bossState === 'barrage') {
            this.facing = dx >= 0 ? 1 : -1;
            if (this.stateTimer === 22 || (this.phase >= 2 && this.stateTimer === 8)) {
                const count = this.phase === 3 ? 5 : 3;
                const baseAng = Math.atan2((knight.y + 36) - (this.y + 52), (knight.x + knight.w / 2) - (this.x + this.w / 2));
                for (let i = 0; i < count; i++) {
                    const off = (i - (count - 1) / 2) * 0.22;
                    enemyProjectiles.push({
                        kind: 'soul',
                        x: this.x + this.w / 2 + this.facing * 26,
                        y: this.y + 52,
                        vx: Math.cos(baseAng + off) * (6.8 + this.phase * 0.5),
                        vy: Math.sin(baseAng + off) * (6.8 + this.phase * 0.5),
                        r: 11, dmg: Math.round(this.dmg * 0.88),
                        color: this.bossOpts.accent, life: 130
                    });
                }
                sfx.play('arrow');
            }
            if (this.stateTimer <= 0) {
                this.bossState = 'march';
                this.stateTimer = 48;
            }
        }

        this._stepPhysics();
        if (this.x < GATE_X + 16) this.x = GATE_X + 16;

        if (rectOverlap(this, knight) && this.attackCooldown <= 0) {
            if (knight.takeDamage(this.dmg, Math.sign(dx || -1) * 9, this)) {
                this.attackCooldown = 44;
            }
        }
    }

    _stepPhysics() {
        this.vy = Math.min(14, this.vy + 0.62);
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < GATE_X + 12) this.x = GATE_X + 12;
        if (this.x > WORLD_WIDTH - 20) this.x = WORLD_WIDTH - 20;
        if (this.y + this.h >= GROUND_Y) {
            this.y = GROUND_Y - this.h;
            this.vy = 0;
        }
    }

    takeDamage(amount, knockX = 0, opts = {}) {
        if (this.dead) return;

        let dmg = amount;
        // Kesatria Busuk menahan 45% serangan ringan depan jika tidak dipecahkan Slam / Parry / Palu!
        if (this.type === 'rot_knight' && this.stunTimer <= 0 && !opts.breakShield && !opts.isHeavy) {
            if (Math.sign(knockX) === -this.facing) {
                dmg = Math.max(4, Math.round(amount * 0.55));
                sfx.play('block');
            }
        }

        this.hp -= dmg;
        this.hurtFlash = 9;
        if (!this.isBoss) {
            this.vx = knockX * (this.type === 'rot_knight' ? 0.45 : 0.9);
            this.vy = Math.min(this.vy, -3.2);
        } else {
            this.vx += knockX * 0.12;
        }

        sfx.play(opts.isCrit ? 'crit' : 'hit');
        spawnParticles(this.x + this.w / 2, this.y + this.h * 0.42, opts.isCrit ? '#fde047' : '#84cc16', opts.isCrit ? 12 : 7);
        addFloatingText(
            opts.isCrit ? `${dmg}!` : `${dmg}`,
            this.x + this.w / 2 + (Math.random() - 0.5) * 20,
            this.y - 10,
            opts.isCrit ? '#fde047' : '#ffffff',
            !!opts.isCrit
        );

        if (this.hp <= 0) this.die(false);
    }

    die(silent = false) {
        if (this.dead) return;
        this.dead = true;
        game.totalKills++;
        game.waveKilled++;

        const cx = this.x + this.w / 2;
        const cy = this.y + this.h / 2;

        if (!silent) {
            sfx.play(this.isBoss ? 'boss_roar' : 'zombie_die');
            spawnParticles(cx, cy, this.isBoss ? '#f8d274' : '#84cc16', this.isBoss ? 40 : 18);
            spawnShockRing(cx, cy, this.isBoss ? 150 : 44, this.isBoss ? '#f8d274' : '#84cc16', this.isBoss ? 6 : 3);

            // Pembawa Tong Wabah meledak saat ditumpas — melukai zombie lain di sekitarnya!
            if (this.type === 'keg_carrier') {
                sfx.play('explosion');
                spawnShockRing(cx, cy, 130, '#a3e635', 6);
                spawnParticles(cx, cy, '#bef264', 24);
                addFloatingText('TONG WABAH MELEDAK!', cx, this.y - 18, '#bef264', true);
                for (const other of zombies) {
                    if (!other.dead && other !== this && Math.hypot((other.x + other.w / 2) - cx, (other.y + other.h / 2) - cy) < 135) {
                        other.takeDamage(Math.round(knight.atk * 1.4), Math.sign((other.x - cx) || 1) * 9, { isCrit: true, breakShield: true });
                    }
                }
            }

            // Berkah Pedang Api Suci: zombie yang mati saat terbakar meledak api!
            if (this.burnTimer > 0 && getBlessingLevel('flame_blade') > 0) {
                sfx.play('explosion');
                spawnShockRing(cx, cy, 105, '#f97316', 5);
                spawnParticles(cx, cy, '#fb923c', 18);
                for (const other of zombies) {
                    if (!other.dead && other !== this && Math.hypot((other.x + other.w / 2) - cx, (other.y + other.h / 2) - cy) < 110) {
                        other.takeDamage(Math.round(knight.atk * 0.9), Math.sign((other.x - cx) || 1) * 7, { breakShield: true });
                        other.burnTimer = 100;
                    }
                }
            }

            // Berkah Cawan Cahaya Suci: pulih HP Kesatria & Gerbang
            const vampLv = getBlessingLevel('vampiric_edge');
            if (vampLv > 0 && knight) {
                const h = Math.max(3, Math.round(knight.maxHp * 0.04 * vampLv));
                knight.hp = Math.min(knight.maxHp, knight.hp + h);
                game.gateHp = Math.min(game.gateMaxHp, game.gateHp + 12 * vampLv);
            }

            // Jatuhkan Koin Emas
            const cnt = this.isBoss ? 14 : 3;
            const val = Math.max(3, Math.round(this.goldDrop / cnt));
            for (let i = 0; i < cnt; i++) {
                coins.push({
                    x: cx + (Math.random() - 0.5) * 26,
                    y: cy - 10,
                    vx: (Math.random() - 0.5) * 7,
                    vy: -5 - Math.random() * 4,
                    value: val,
                    life: 520
                });
            }

            if (this.isBoss) {
                game.screenShake = 18;
                addFloatingText('PENGUASA PENGEPUNGAN TUMBANG!', cx, this.y - 30, '#fde047', true);
            }
        }
    }

    draw(ctx) {
        if (this.dead) return;
        const cx = this.x + this.w / 2;
        const by = this.y + this.h;

        // Gundukan tanah kubur saat zombie baru bangkit keluar!
        if (this.emergeTimer > 0) {
            const p = 1 - this.emergeTimer / 32;
            ctx.save();
            ctx.beginPath();
            ctx.rect(this.x - 40, GROUND_Y - 120, this.w + 80, 120);
            ctx.clip();
            ctx.translate(cx, GROUND_Y + (1 - p) * this.h);
            ctx.scale(this.facing, 1);
            this._drawDetailedBody(ctx, false, 0);
            ctx.restore();

            // Gundukan tanah segar
            ctx.fillStyle = '#3b2e26';
            ctx.beginPath();
            ctx.ellipse(cx, GROUND_Y + 2, 32, 11, 0, Math.PI, 0);
            ctx.fill();
            return;
        }

        ctx.save();
        ctx.translate(cx, by);

        // Bayangan tanah
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 2, this.w * 0.5, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.scale(this.facing, 1);
        const wobble = Math.sin(this.animTick * (this.type === 'ghoul' ? 0.42 : 0.16));
        if (this.isBoss) {
            this._drawBossBody(ctx, this.hurtFlash > 0, wobble);
        } else {
            this._drawDetailedBody(ctx, this.hurtFlash > 0, wobble);
        }
        ctx.restore();

        // Indikator Stun & Api
        if (this.stunTimer > 0) {
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.ellipse(0, -this.h - 10, 16, 5, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (this.burnTimer > 0) {
            ctx.fillStyle = 'rgba(249, 115, 22, 0.85)';
            ctx.beginPath();
            ctx.arc(Math.sin(this.animTick * 0.4) * 10, -this.h * 0.68, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(Math.sin(this.animTick * 0.4) * 10, -this.h * 0.68, 3.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Mini HP bar untuk musuh reguler yang terluka
        if (!this.isBoss && this.hp < this.maxHp) {
            const bw = Math.max(40, this.w);
            ctx.fillStyle = 'rgba(10, 11, 16, 0.88)';
            ctx.fillRect(-bw / 2, -this.h - 13, bw, 5);
            ctx.fillStyle = '#84cc16';
            ctx.fillRect(-bw / 2, -this.h - 13, bw * Math.max(0, this.hp / this.maxHp), 5);
        }

        ctx.restore();
    }

    _drawDetailedBody(ctx, flash, wobble) {
        const stride = wobble * 8;
        const bob = Math.abs(wobble) * 3;

        // Kaki robek
        ctx.fillStyle = '#262322';
        ctx.fillRect(-10 - stride * 0.55, -24, 8, 24);
        ctx.fillRect(2 + stride * 0.55, -24, 8, 24);

        if (this.type === 'rot_knight') {
            // Kesatria Busuk Berzirah & Perisai Besi Retak
            ctx.fillStyle = flash ? '#ffffff' : '#3f3d3b';
            ctx.beginPath();
            ctx.roundRect(-16, -58 - bob, 32, 36, 5);
            ctx.fill();
            ctx.strokeStyle = '#78716c';
            ctx.lineWidth = 2;
            ctx.stroke();
            // Helm Tengkorak Bertanduk
            ctx.fillStyle = flash ? '#ffffff' : '#d6d3d1';
            ctx.beginPath();
            ctx.roundRect(-12, -78 - bob, 24, 22, 6);
            ctx.fill();
            ctx.fillStyle = '#57534e';
            ctx.beginPath();
            ctx.moveTo(-10, -76 - bob); ctx.lineTo(-18, -90 - bob); ctx.lineTo(-4, -78 - bob);
            ctx.moveTo(10, -76 - bob); ctx.lineTo(18, -90 - bob); ctx.lineTo(4, -78 - bob);
            ctx.fill();
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(1, -70 - bob, 5, 4);
            ctx.fillRect(8, -70 - bob, 4, 4);
            // Kapak Karat & Perisai Berat
            ctx.fillStyle = '#9ca3af';
            ctx.fillRect(14, -68 - bob, 6, 36);
            ctx.fillStyle = '#292524';
            ctx.strokeStyle = '#a8a29e';
            ctx.lineWidth = 2.4;
            ctx.fillRect(13, -52 - bob, 11, 32);
            ctx.strokeRect(13, -52 - bob, 11, 32);
            return;
        }

        if (this.type === 'necromancer') {
            // Pendeta Nekromanser melayang + jubah hijau-gelap + tongkat lentera
            const hov = Math.sin(this.animTick * 0.12) * 5;
            ctx.fillStyle = flash ? '#ffffff' : '#113834';
            ctx.beginPath();
            ctx.moveTo(-18, -4 + hov);
            ctx.lineTo(-12, -58 + hov);
            ctx.lineTo(12, -58 + hov);
            ctx.lineTo(18, -4 + hov);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#2dd4bf';
            ctx.lineWidth = 1.6;
            ctx.stroke();
            // Tudung Tengkorak
            ctx.fillStyle = '#0c1218';
            ctx.beginPath();
            ctx.arc(0, -64 + hov, 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#2dd4bf';
            ctx.fillRect(2, -67 + hov, 4.5, 3.5);
            ctx.fillRect(8, -67 + hov, 4, 3.5);
            // Tongkat Sihir
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(15, -8 + hov);
            ctx.lineTo(19, -74 + hov);
            ctx.stroke();
            ctx.fillStyle = '#2dd4bf';
            ctx.beginPath();
            ctx.arc(19, -76 + hov, 7 + Math.sin(this.animTick * 0.25) * 2, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        if (this.type === 'crossbow') {
            // Pemanah Tengkorak berjubah + Crossbow Tulang
            ctx.fillStyle = flash ? '#ffffff' : '#27272a';
            ctx.beginPath();
            ctx.roundRect(-12, -52 - bob, 24, 30, 5);
            ctx.fill();
            ctx.fillStyle = flash ? '#ffffff' : '#e7e5e4';
            ctx.beginPath();
            ctx.roundRect(-10, -68 - bob, 20, 18, 6);
            ctx.fill();
            ctx.fillStyle = '#a3e635';
            ctx.fillRect(2, -62 - bob, 4, 3.5);
            ctx.fillRect(8, -62 - bob, 3.5, 3.5);
            // Crossbow & Glint peringatan saat membidik!
            ctx.fillStyle = '#78350f';
            ctx.fillRect(8, -46 - bob, 22, 5);
            ctx.strokeStyle = '#d6d3d1';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(24, -44 - bob, 10, -Math.PI * 0.5, Math.PI * 0.5);
            ctx.stroke();
            if (this.telegraphTimer > 0) {
                ctx.fillStyle = '#bef264';
                ctx.beginPath();
                ctx.arc(28, -44 - bob, 5 + (this.telegraphTimer % 4), 0, Math.PI * 2);
                ctx.fill();
            }
            return;
        }

        if (this.type === 'keg_carrier') {
            // Pembawa Tong Wabah Berkilau Hijau di atas kepala!
            ctx.fillStyle = flash ? '#ffffff' : '#4d7c0f';
            ctx.beginPath();
            ctx.ellipse(0, -38 - bob, 18, 22, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = flash ? '#ffffff' : '#65a30d';
            ctx.beginPath();
            ctx.arc(4, -56 - bob, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(6, -59 - bob, 5, 3.5);
            // Tong Wabah Raksasa di atas kepala
            ctx.fillStyle = '#3f2a1d';
            ctx.beginPath();
            ctx.roundRect(-16, -90 - bob, 32, 26, 6);
            ctx.fill();
            ctx.strokeStyle = '#a3e635';
            ctx.lineWidth = 2.6;
            ctx.stroke();
            ctx.fillStyle = `rgba(190, 242, 100, ${0.6 + Math.sin(this.animTick * 0.3) * 0.35})`;
            ctx.beginPath();
            ctx.arc(0, -77 - bob, 8, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        // Walker & Ghoul (Siluet membungkuk klasik dengan rahang & tulang rusuk!)
        const isGhoul = this.type === 'ghoul';
        const skin = flash ? '#ffffff' : (isGhoul ? '#86b843' : '#6b8e4e');
        const rag = isGhoul ? '#3b1d14' : '#3a3a42';
        ctx.save();
        ctx.rotate(isGhoul ? 0.32 : 0.14);
        ctx.fillStyle = rag;
        ctx.beginPath();
        ctx.roundRect(-13, -52 - bob, 26, 31, 5);
        ctx.fill();
        // Tulang rusuk terlihat
        ctx.fillStyle = 'rgba(231, 229, 228, 0.4)';
        ctx.fillRect(-6, -44 - bob, 10, 3);
        ctx.fillRect(-5, -38 - bob, 9, 3);
        // Lengan mencakar panjang
        ctx.fillStyle = skin;
        ctx.fillRect(8, -46 - bob, 22, 7);
        ctx.fillRect(10, -37 - bob, 18, 6);
        // Kepala & Rahang Zombie
        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.roundRect(-11, -69 - bob, 23, 21, 6);
        ctx.fill();
        ctx.fillStyle = isGhoul ? '#ef4444' : '#fef08a';
        ctx.fillRect(2, -63 - bob, 5, 4);
        ctx.fillRect(9, -63 - bob, 4, 4);
        ctx.fillStyle = '#141210';
        ctx.fillRect(2, -55 - bob, 10, 5);
        ctx.fillStyle = '#e7e5e4';
        ctx.fillRect(4, -55 - bob, 2.5, 3);
        ctx.fillRect(8, -55 - bob, 2.5, 3);
        ctx.restore();
    }

    _drawBossBody(ctx, flash, wobble) {
        const accent = this.bossOpts.accent || '#84cc16';
        const armor = this.bossOpts.armor || '#27272a';
        const bob = Math.abs(wobble) * 4;
        const stride = wobble * 10;

        // Aura Fase 2/3
        if (this.phase >= 2) {
            ctx.save();
            ctx.globalAlpha = 0.24 + Math.sin(this.animTick * 0.22) * 0.1;
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.ellipse(0, -68, 60, 74, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Jubah Sobek Raksasa
        ctx.fillStyle = '#1c1518';
        ctx.beginPath();
        ctx.moveTo(-28, -96 - bob);
        ctx.lineTo(-56 - Math.sin(this.animTick * 0.14) * 8, -6);
        ctx.lineTo(24, -6);
        ctx.lineTo(28, -96 - bob);
        ctx.closePath();
        ctx.fill();

        // Kaki Kolosal
        ctx.fillStyle = '#18181b';
        ctx.fillRect(-24 - stride * 0.4, -38, 17, 38);
        ctx.fillRect(7 + stride * 0.4, -38, 17, 38);

        // Zirah Dada & Tulang Rusuk
        ctx.fillStyle = flash ? '#ffffff' : armor;
        ctx.beginPath();
        ctx.roundRect(-34, -100 - bob, 68, 64, 10);
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = 'rgba(231, 229, 228, 0.28)';
        for (let r = 0; r < 3; r++) {
            ctx.fillRect(-24, -88 + r * 13 - bob, 14, 5);
            ctx.fillRect(10, -88 + r * 13 - bob, 14, 5);
        }
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(0, -68 - bob, 12 + Math.sin(this.animTick * 0.16) * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Bahu Berduri
        ctx.fillStyle = '#3f3f46';
        ctx.beginPath();
        ctx.arc(-34, -92 - bob, 16, 0, Math.PI * 2);
        ctx.arc(34, -92 - bob, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.moveTo(-44, -100 - bob); ctx.lineTo(-58, -118 - bob); ctx.lineTo(-32, -106 - bob); ctx.closePath();
        ctx.moveTo(44, -100 - bob); ctx.lineTo(58, -118 - bob); ctx.lineTo(32, -106 - bob); ctx.closePath();
        ctx.fill();

        // Kepala Tengkorak Bermahkota
        ctx.fillStyle = flash ? '#ffffff' : (this.bossOpts.isFinalBoss ? '#ece7de' : '#7ba637');
        ctx.beginPath();
        ctx.roundRect(-22, -132 - bob, 44, 34, 9);
        ctx.fill();
        ctx.fillStyle = '#111114';
        ctx.fillRect(-12, -107 - bob, 26, 7);
        ctx.fillStyle = '#f5f1e8';
        for (let t = -10; t <= 10; t += 6) ctx.fillRect(t, -107 - bob, 3.5, 5);
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.moveTo(-24, -130 - bob); ctx.lineTo(-30, -154 - bob); ctx.lineTo(-10, -136 - bob);
        ctx.lineTo(0, -160 - bob); ctx.lineTo(10, -136 - bob); ctx.lineTo(30, -154 - bob);
        ctx.lineTo(24, -130 - bob);
        ctx.closePath();
        ctx.fill();

        // Mata Boss
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, -122 - bob, 11, 8);
        ctx.fillRect(12, -122 - bob, 10, 8);
        ctx.fillStyle = this.bossState === 'charge_prep' ? '#ffffff' : accent;
        ctx.fillRect(2, -120 - bob, 7, 5);
        ctx.fillRect(13, -120 - bob, 6, 5);

        // Senjata Kolosal Boss
        ctx.save();
        ctx.translate(28, -74 - bob);
        ctx.rotate(this.bossState === 'charging' ? 0.9 : (this.bossState === 'charge_prep' ? -0.95 : Math.sin(this.animTick * 0.12) * 0.16));
        const wt = this.bossOpts.weapon || 'ram_cleaver';
        if (wt === 'lich_scepter') {
            ctx.fillStyle = '#44403c';
            ctx.fillRect(-4, -92, 8, 106);
            const g = ctx.createRadialGradient(0, -96, 4, 0, -96, 34);
            g.addColorStop(0, accent);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, -96, 34, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.arc(0, -96, 15, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = '#52525b';
            ctx.fillRect(-5, -4, 10, 22);
            ctx.fillStyle = '#d4d4d8';
            ctx.beginPath();
            ctx.moveTo(-9, -4);
            ctx.lineTo(-14, -90);
            ctx.lineTo(14, -76);
            ctx.lineTo(9, -4);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = accent;
            ctx.lineWidth = 2.4;
            ctx.stroke();
        }
        ctx.restore();
    }
}

/* ==========================================================================
   3. PRAJURIT PENGAWAL BENTENG (ALLIED FOOTMAN SQUIRES)
   ========================================================================== */
class AlliedFootman {
    constructor(idx) {
        this.idx = idx;
        this.x = GATE_X + 48 + idx * 54;
        this.y = GROUND_Y - 62;
        this.w = 36;
        this.h = 62;
        this.maxHp = 110;
        this.hp = 110;
        this.facing = 1;
        this.dead = false;
        this.swingTimer = 0;
        this.cd = 0;
        this.tick = idx * 17;
    }

    update() {
        if (this.dead) return;
        this.tick++;
        if (this.cd > 0) this.cd--;
        if (this.swingTimer > 0) this.swingTimer--;

        // Cari zombie terdekat dalam jarak 380px dari gerbang
        let target = null;
        let best = 440;
        for (const z of zombies) {
            if (z.dead || z.emergeTimer > 0) continue;
            const d = Math.abs(z.x - this.x);
            if (d < best && z.x < GATE_X + 520) {
                best = d;
                target = z;
            }
        }

        const homeX = GATE_X + 55 + this.idx * 48;
        if (target) {
            const dx = (target.x + target.w / 2) - (this.x + this.w / 2);
            this.facing = dx >= 0 ? 1 : -1;
            if (Math.abs(dx) > 48) {
                this.x += this.facing * 2.5;
            } else if (this.cd <= 0) {
                this.swingTimer = 10;
                this.cd = 42;
                target.takeDamage(Math.max(14, Math.round(knight.atk * 0.52)), this.facing * 5);
                sfx.play('slash');
            }
        } else {
            const dx = homeX - this.x;
            if (Math.abs(dx) > 6) {
                this.facing = dx >= 0 ? 1 : -1;
                this.x += this.facing * 2.0;
            } else {
                this.facing = 1;
            }
        }
        this.x = Math.max(GATE_X + 18, Math.min(GATE_X + 520, this.x));
    }

    takeDamage(amt) {
        if (this.dead) return;
        this.hp -= amt;
        spawnParticles(this.x + this.w / 2, this.y + 30, '#fca5a5', 5);
        if (this.hp <= 0) {
            this.dead = true;
            addFloatingText('PENGAWAL GUGUR!', this.x + this.w / 2, this.y - 12, '#fca5a5');
        }
    }

    draw(ctx) {
        if (this.dead) return;
        const cx = this.x + this.w / 2;
        const by = this.y + this.h;
        ctx.save();
        ctx.translate(cx, by);
        ctx.scale(this.facing, 1);

        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 1, 16, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tubuh prajurit kerajaan (biru-baja & helm perak)
        ctx.fillStyle = '#334155';
        ctx.fillRect(-8, -18, 6, 18);
        ctx.fillRect(2, -18, 6, 18);
        ctx.fillStyle = '#1d4ed8';
        ctx.beginPath();
        ctx.roundRect(-11, -44, 22, 27, 4);
        ctx.fill();
        ctx.fillStyle = '#f8d274';
        ctx.fillRect(-1.5, -40, 3, 16);
        ctx.fillRect(-5, -35, 10, 3);
        // Helm ketel abad pertengahan
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(0, -52, 9, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(-12, -52, 24, 3);
        ctx.fillStyle = '#f5d0b5';
        ctx.fillRect(-5, -49, 10, 6);
        // Pedang & Perisai kecil
        ctx.save();
        ctx.translate(8, -32);
        ctx.rotate(this.swingTimer > 0 ? 0.9 : -0.4);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(-2, -26, 4, 26);
        ctx.restore();
        ctx.fillStyle = '#1e3a8a';
        ctx.strokeStyle = '#f8d274';
        ctx.lineWidth = 1.6;
        ctx.fillRect(6, -36, 9, 18);
        ctx.strokeRect(6, -36, 9, 18);

        ctx.restore();
    }
}
