/* ==========================================================================
   KELAS KARAKTER UTAMA: SIR ALDRIC — KESATRIA CAHAYA (PALADIN KNIGHT)
   ========================================================================== */

class Knight {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 40;
        this.h = 62;
        this.vx = 0;
        this.vy = 0;
        this.facing = 1; // 1 = kanan, -1 = kiri

        // Fisika & lompatan responsif
        this.onGround = false;
        this.standingPlat = null;
        this.jumpsLeft = 2;
        this.coyoteTimer = 0;
        this.jumpBuffer = 0;
        this.scaleX = 1;
        this.scaleY = 1;

        // Statistik dasar & upgrade
        this.maxHp = 120;
        this.hp = 120;
        this.attackDamage = 28;
        this.moveSpeed = 5.4;

        // Kombo Pedang 3-Hit
        this.attackTimer = 0;
        this.attackCooldown = 0;
        this.comboStep = 0;
        this.comboResetTimer = 0;
        this.attackHitIds = new Set();

        // Serbuan Perisai & Tangkis Sempurna (Shield Charge / Parry)
        this.shieldTimer = 0;
        this.shieldCooldown = 0;
        this.shieldMaxCooldown = 52;
        this.parryWindow = 0;
        this.shieldHitIds = new Set();

        // Lempar Tombak Suci (Holy Javelin)
        this.javelinCooldown = 0;
        this.javelinMaxCooldown = 40;

        // Semangat Suci (Fury) & Penghakiman Fajar (ULTI)
        this.fury = 0;
        this.ultiTimer = 0;
        this.ultiPillarX = 0;

        // Status kebal & efek terkena serangan
        this.invulnTimer = 0;
        this.damageBlinkTimer = 0;
        this.hurtFlash = 0;
        this.animTick = 0;
        this.capeWave = 0;

        // Posisi pijakan aman terakhir (untuk jatuh jurang)
        this.lastSafeX = x;
        this.lastSafeY = y;

        this.applyUpgrades(false);
    }

    applyUpgrades(healDelta = false) {
        const prevMax = this.maxHp;
        const atkLv = game.upgrades.atkLevel || 1;
        const hpLv = game.upgrades.hpLevel || 1;
        const spdLv = game.upgrades.spdLevel || 1;

        this.attackDamage = 28 + (atkLv - 1) * 9;
        this.maxHp = 120 + (hpLv - 1) * 30;

        // Soft-cap kecepatan agar presisi di platform sempit tetap nyaman
        const rawSpeed = 5.4 + (spdLv - 1) * 0.42;
        this.moveSpeed = Math.min(8.8, rawSpeed > 7.4 ? 7.4 + (rawSpeed - 7.4) * 0.45 : rawSpeed);

        // Cooldown batas aman
        this.shieldMaxCooldown = Math.max(26, 52 - (spdLv - 1) * 3);
        this.javelinMaxCooldown = Math.max(20, 40 - (spdLv - 1) * 2);

        if (healDelta && this.maxHp > prevMax) {
            this.hp = Math.min(this.maxHp, this.hp + (this.maxHp - prevMax));
        } else {
            this.hp = Math.min(this.hp, this.maxHp);
        }
    }

    getJavelinCount() {
        const lv = game.upgrades.atkLevel || 1;
        if (lv >= 7) return 3;
        if (lv >= 4) return 2;
        return 1;
    }

    getArmorTier() {
        const lv = Math.max(game.upgrades.atkLevel || 1, game.upgrades.hpLevel || 1);
        if (lv >= 6) return 3; // Golden Dawn Paladin
        if (lv >= 3) return 2; // Silver Templar
        return 1;              // Iron Crusader
    }

    gainFury(amount) {
        this.fury = Math.min(100, this.fury + amount);
    }

    update(stage) {
        this.animTick++;
        this.capeWave += 0.14 + Math.abs(this.vx) * 0.03;

        if (this.invulnTimer > 0) this.invulnTimer--;
        if (this.damageBlinkTimer > 0) this.damageBlinkTimer--;
        if (this.hurtFlash > 0) this.hurtFlash--;
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.shieldCooldown > 0) this.shieldCooldown--;
        if (this.javelinCooldown > 0) this.javelinCooldown--;
        if (this.parryWindow > 0) this.parryWindow--;
        if (this.ultiTimer > 0) this.ultiTimer--;
        if (this.coyoteTimer > 0) this.coyoteTimer--;
        if (this.jumpBuffer > 0) this.jumpBuffer--;

        if (this.comboResetTimer > 0) {
            this.comboResetTimer--;
            if (this.comboResetTimer === 0) this.comboStep = 0;
        }

        // Relik IV: Mahkota Matahari — regenerasi Semangat pasif saat bertempur
        if (hasRelic('crown') && game.worldTick % 26 === 0 && this.fury < 100) {
            this.gainFury(1);
        }

        // Ikuti pergerakan platform bergerak tempat Kesatria berdiri
        if (this.onGround && this.standingPlat && this.standingPlat.type === 'moving' && this.standingPlat.dx) {
            this.x += this.standingPlat.dx;
        }

        // Input Lompat (buffer 7 frame)
        if (keys.jumpPressed) {
            keys.jumpPressed = false;
            this.jumpBuffer = 7;
        }

        // Input Penghakiman Fajar (ULTI)
        if (keys.ultiPressed) {
            keys.ultiPressed = false;
            if (this.fury >= 100) {
                this.performUltimate();
            }
        }

        // Input Serbuan Perisai & Tangkis (Shield Charge / Parry)
        if (keys.shieldPressed) {
            keys.shieldPressed = false;
            if (this.shieldCooldown <= 0 && this.shieldTimer <= 0) {
                this.performShieldCharge();
            }
        }

        // Input Lempar Tombak Suci (Holy Javelin)
        if (keys.javelinPressed) {
            keys.javelinPressed = false;
            if (this.javelinCooldown <= 0) {
                this.throwJavelin();
            }
        }

        // Input Tebas Pedang
        if (keys.attackPressed) {
            keys.attackPressed = false;
            if (this.attackCooldown <= 0) {
                this.performAttack();
            }
        }

        // Gerak Horizontal
        if (this.shieldTimer > 0) {
            this.shieldTimer--;
            this.vx = this.facing * 13.6;
            this.vy = Math.min(this.vy, 0.8);
            if (this.shieldTimer % 3 === 0) {
                afterimages.push({
                    x: this.x, y: this.y, w: this.w, h: this.h,
                    facing: this.facing, color: 'rgba(246, 204, 104, 0.45)', life: 10, maxLife: 10
                });
            }
            this._checkShieldBashHits();
        } else {
            let moveDir = 0;
            if (keys.left) moveDir -= 1;
            if (keys.right) moveDir += 1;
            if (moveDir !== 0) {
                this.facing = moveDir;
                // Zero-delay turnaround saat balik arah
                if (Math.sign(this.vx) !== 0 && Math.sign(this.vx) !== moveDir) {
                    this.vx = moveDir * this.moveSpeed * 0.72;
                } else {
                    this.vx += (moveDir * this.moveSpeed - this.vx) * 0.36;
                }
            } else {
                this.vx *= this.onGround ? 0.7 : 0.86;
                if (Math.abs(this.vx) < 0.15) this.vx = 0;
            }
        }

        // Eksekusi Lompat / Double Jump
        if (this.jumpBuffer > 0) {
            if (this.coyoteTimer > 0) {
                this.vy = -13.0;
                this.onGround = false;
                this.standingPlat = null;
                this.coyoteTimer = 0;
                this.jumpsLeft = 1;
                this.jumpBuffer = 0;
                this.scaleX = 0.84;
                this.scaleY = 1.2;
                sfx.play('jump');
                spawnParticles(this.x + this.w / 2, this.y + this.h, '#d6d3d1', 6);
            } else if (this.jumpsLeft > 0) {
                this.vy = -11.9;
                this.jumpsLeft--;
                this.jumpBuffer = 0;
                this.scaleX = 0.82;
                this.scaleY = 1.22;
                sfx.play('double_jump');
                spawnShockRing(this.x + this.w / 2, this.y + this.h - 4, 34, '#f6cc68', 3);
                spawnParticles(this.x + this.w / 2, this.y + this.h, '#f6cc68', 9);
            }
        }

        // Gravitasi
        if (this.shieldTimer <= 0) {
            this.vy = Math.min(15.5, this.vy + 0.62);
        }

        // Tebas Pedang aktif
        if (this.attackTimer > 0) {
            this.attackTimer--;
            this._checkSwordHits();
        }

        // Kolisi Horizontal
        this.x += this.vx;
        if (this.x < 0) { this.x = 0; this.vx = 0; }
        if (this.x + this.w > stage.worldWidth) {
            this.x = stage.worldWidth - this.w;
            this.vx = 0;
        }
        for (const plat of stage.platforms) {
            if (plat.type !== 'ground') continue;
            if (this.y + this.h > plat.y + 12 && this.y < plat.y + plat.h) {
                if (rectOverlap(this, plat)) {
                    if (this.vx > 0) {
                        this.x = plat.x - this.w;
                        this.vx = 0;
                    } else if (this.vx < 0) {
                        this.x = plat.x + plat.w;
                        this.vx = 0;
                    }
                }
            }
        }

        // Kolisi Vertikal & Platform
        const wasOnGround = this.onGround;
        const prevVy = this.vy;
        const prevBottom = this.y + this.h;
        this.y += this.vy;
        this.onGround = false;
        let landedPlat = null;

        for (const plat of stage.platforms) {
            if (this.x + this.w > plat.x + 4 && this.x < plat.x + plat.w - 4) {
                const snapTol = plat.type === 'moving' ? Math.max(15, Math.abs(plat.dy || 0) + 12) : 14;
                if (this.vy >= 0 && prevBottom <= plat.y + snapTol && this.y + this.h >= plat.y) {
                    this.y = plat.y - this.h;
                    this.vy = 0;
                    this.onGround = true;
                    this.coyoteTimer = 8;
                    this.jumpsLeft = 2;
                    landedPlat = plat;
                }
            }
        }
        this.standingPlat = landedPlat;

        // Batu Pegas Suci (Holy Springs)
        if (stage.springs) {
            for (const sp of stage.springs) {
                if (sp._bounce > 0) sp._bounce--;
                const crossedTop =
                    this.x + this.w > sp.x + 2 &&
                    this.x < sp.x + sp.w - 2 &&
                    prevBottom <= sp.y + 18 &&
                    this.y + this.h >= sp.y;
                if ((rectOverlap(this, sp) || crossedTop) && this.vy >= -4) {
                    this.y = sp.y - this.h;
                    this.vy = -17.4;
                    this.onGround = false;
                    this.standingPlat = null;
                    this.coyoteTimer = 0;
                    this.jumpsLeft = 2;
                    this.shieldTimer = 0;
                    this.scaleX = 0.78;
                    this.scaleY = 1.26;
                    sp._bounce = 14;
                    sfx.play('spring');
                    spawnShockRing(sp.x + sp.w / 2, sp.y, 42, '#f6cc68', 3);
                    spawnParticles(sp.x + sp.w / 2, sp.y, '#f6cc68', 12);
                    addFloatingText('PEGAS SUCI!', sp.x + sp.w / 2, sp.y - 16, '#fde68a');
                    break;
                }
            }
        }

        // Squash & stretch mendarat
        if (this.onGround && !wasOnGround && prevVy > 4.5) {
            this.scaleX = 1.18;
            this.scaleY = 0.84;
            spawnParticles(this.x + this.w / 2, this.y + this.h, '#a8a29e', 5);
        }
        this.scaleX += (1 - this.scaleX) * 0.24;
        this.scaleY += (1 - this.scaleY) * 0.24;

        // Simpan posisi aman terakhir (bebas duri, pegas, & platform bergerak)
        if (this.onGround && landedPlat && landedPlat.type !== 'moving' && landedPlat.w >= this.w + 24) {
            const onSpike = stage.spikes.some(sp => rectOverlap(this, sp));
            const onSpring = stage.springs && stage.springs.some(sp =>
                rectOverlap({ x: this.x - 6, y: this.y, w: this.w + 12, h: this.h + 4 }, sp)
            );
            if (!onSpike && !onSpring) {
                this.lastSafeX = Math.max(landedPlat.x + 12, Math.min(this.x, landedPlat.x + landedPlat.w - this.w - 12));
                this.lastSafeY = landedPlat.y - this.h;
            }
        }

        // Jebakan Duri Tulang
        for (const sp of stage.spikes) {
            if (rectOverlap(this, sp)) {
                this.takeDamage(14, this.x + this.w / 2 < sp.x + sp.w / 2 ? -5 : 5, { fromHazard: true });
                this.vy = -8.5;
                break;
            }
        }

        // Jatuh ke Jurang
        if (this.y > VIEW_HEIGHT + 80) {
            this.takeDamage(20, 0, { ignoreParry: true, fromHazard: true });
            if (this.hp > 0) {
                this.x = this.lastSafeX;
                this.y = this.lastSafeY - 8;
                this.vx = 0;
                this.vy = 0;
                this.invulnTimer = 45;
                spawnShockRing(this.x + this.w / 2, this.y + this.h / 2, 46, '#f6cc68', 3);
                addFloatingText('KEMBALI KE PIJAKAN!', this.x + this.w / 2, this.y - 16, '#fde68a');
            }
        }
    }

    performAttack() {
        this.comboStep = (this.comboStep % 3) + 1;
        this.comboResetTimer = 34;
        this.attackHitIds.clear();

        const isHeavy = this.comboStep === 3;
        this.attackTimer = isHeavy ? 15 : 11;
        this.attackCooldown = isHeavy ? 18 : 13;
        this.scaleX = isHeavy ? 1.16 : 1.08;
        this.scaleY = isHeavy ? 0.9 : 0.95;

        // Dorongan kecil ke depan saat ayunan pedang
        if (this.onGround) {
            this.vx += this.facing * (isHeavy ? 3.2 : 1.8);
        }
        sfx.play(isHeavy ? 'heavy_slash' : 'slash');

        if (isHeavy) {
            const fx = this.x + this.w / 2 + this.facing * 44;
            const fy = this.y + this.h * 0.55;
            spawnShockRing(fx, fy, 52, '#f6cc68', 4);
            spawnParticles(fx, fy, '#fde047', 10);
        }
    }

    _getSwordHitbox() {
        const tier = this.getArmorTier();
        const isHeavy = this.comboStep === 3;
        const reach = (isHeavy ? 82 : 66) + (tier - 1) * 7;
        const height = isHeavy ? 78 : 64;
        const x = this.facing === 1 ? this.x + this.w * 0.45 : this.x + this.w * 0.55 - reach;
        const y = this.y - (isHeavy ? 12 : 4);
        return { x, y, w: reach, h: height };
    }

    _checkSwordHits() {
        const box = this._getSwordHitbox();
        const isHeavy = this.comboStep === 3;
        const comboBonus = getComboDamageMultiplier();
        const baseMult = isHeavy ? 1.55 : (this.comboStep === 2 ? 1.18 : 1.0);
        const isAirFalling = !this.onGround && this.vy > -1.5;

        // 1. Tangkis / Tebas Proyektil Zombie
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            const pb = { x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 };
            if (rectOverlap(box, pb)) {
                spawnParticles(p.x, p.y, '#f6cc68', 9);
                spawnShockRing(p.x, p.y, 32, '#fde047', 3);
                sfx.play('parry');
                this.gainFury(7);
                addFloatingText('TEBAS!', p.x, p.y - 12, '#fde68a');
                triggerParryLightning(p.x, p.y);
                if (isAirFalling) {
                    this.vy = -8.8;
                    this.jumpsLeft = Math.max(this.jumpsLeft, 1);
                }
                projectiles.splice(i, 1);
            }
        }

        // 2. Tebas Peti Relik
        for (const ch of chests) {
            if (!ch.opened && rectOverlap(box, ch)) {
                openChest(ch);
            }
        }

        // 3. Tebas Zombie & Boss
        for (const en of enemies) {
            if (en.dead || this.attackHitIds.has(en.uid)) continue;
            if (rectOverlap(box, en)) {
                this.attackHitIds.add(en.uid);
                const isCrit = isHeavy || Math.random() < 0.22;
                let dmg = Math.round(this.attackDamage * baseMult * comboBonus * (isCrit ? 1.35 : 1.0));
                const kb = this.facing * (isHeavy ? 9.5 : 5.5);

                en.takeDamage(dmg, kb, { isCrit, isHeavy });
                registerComboHit();
                this.gainFury(isHeavy ? 10 : 6);
                game.hitStop = isHeavy ? 4 : 2;
                game.screenShake = Math.max(game.screenShake, isHeavy ? 6 : 3);

                // Aerial Smite Pogo Bounce!
                if (isAirFalling) {
                    this.vy = -8.8;
                    this.jumpsLeft = Math.max(this.jumpsLeft, 1);
                    this.scaleX = 0.85;
                    this.scaleY = 1.2;
                    spawnShockRing(this.x + this.w / 2, this.y + this.h, 30, '#38bdf8', 3);
                    addFloatingText('POGO SUCI!', this.x + this.w / 2, this.y - 14, '#7dd3fc');
                }
            }
        }
    }

    performShieldCharge() {
        this.shieldTimer = 14;
        this.parryWindow = 12; // 12 frame awal = Jendela Tangkis Sempurna!
        this.shieldCooldown = this.shieldMaxCooldown;
        this.invulnTimer = Math.max(this.invulnTimer, 16);
        this.shieldHitIds.clear();
        this.scaleX = 1.24;
        this.scaleY = 0.86;
        sfx.play('shield_bash');
        spawnShockRing(this.x + this.w / 2 + this.facing * 20, this.y + this.h / 2, 40, '#38bdf8', 3);
        spawnParticles(this.x + this.w / 2, this.y + this.h / 2, '#f6cc68', 10);
    }

    _checkShieldBashHits() {
        const bashBox = {
            x: this.x + (this.facing === 1 ? 6 : -18),
            y: this.y - 2,
            w: this.w + 18,
            h: this.h + 4
        };

        // Tangkis Sempurna Proyektil!
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            const pb = { x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 };
            if (rectOverlap(bashBox, pb)) {
                this.triggerPerfectParry(p.x, p.y);
                projectiles.splice(i, 1);
            }
        }

        // Hantam Zombie dengan Perisai (Damage + Stun + Pecah Pertahanan!)
        for (const en of enemies) {
            if (en.dead || this.shieldHitIds.has(en.uid)) continue;
            if (rectOverlap(bashBox, en)) {
                this.shieldHitIds.add(en.uid);
                const dmg = Math.max(14, Math.round(this.attackDamage * 0.72 * getComboDamageMultiplier()));
                en.takeDamage(dmg, this.facing * 10.5, { isShieldBash: true });
                en.stunTimer = Math.max(en.stunTimer || 0, en.isBoss ? 18 : 42);
                registerComboHit();
                this.gainFury(9);
                game.hitStop = 3;
                game.screenShake = Math.max(game.screenShake, 5);
                addFloatingText('HANTAM PERISAI!', en.x + en.w / 2, en.y - 22, '#7dd3fc');
            }
        }
    }

    triggerPerfectParry(px, py) {
        sfx.play('parry');
        const healAmt = Math.max(4, Math.round(this.maxHp * 0.05));
        this.hp = Math.min(this.maxHp, this.hp + healAmt);
        this.gainFury(22);
        this.shieldCooldown = Math.floor(this.shieldCooldown * 0.45);
        this.invulnTimer = Math.max(this.invulnTimer, 24);
        game.hitStop = 5;
        game.screenShake = Math.max(game.screenShake, 7);
        spawnShockRing(px, py, 68, '#f6cc68', 5);
        spawnParticles(px, py, '#fde047', 16);
        addFloatingText('TANGKIS SEMPURNA!', this.x + this.w / 2, this.y - 24, '#fde047', true);
        triggerParryLightning(px, py);
    }

    throwJavelin() {
        this.javelinCooldown = this.javelinMaxCooldown;
        const count = this.getJavelinCount();
        const baseDmg = Math.round(this.attackDamage * 0.78 * getComboDamageMultiplier());
        const angles = count === 1 ? [0] : (count === 2 ? [-0.07, 0.07] : [-0.14, 0, 0.14]);
        const speed = 14.5;
        const sx = this.x + this.w / 2 + this.facing * 20;
        const sy = this.y + 26;

        for (const a of angles) {
            playerProjectiles.push({
                kind: 'javelin',
                x: sx,
                y: sy,
                vx: Math.cos(a) * speed * this.facing,
                vy: Math.sin(a) * speed,
                w: 38,
                h: 10,
                facing: this.facing,
                dmg: baseDmg,
                pierce: count,
                burn: count >= 3,
                hitIds: new Set(),
                life: 54
            });
        }
        sfx.play('javelin');
        spawnParticles(sx, sy, '#fde047', 6);
    }

    performUltimate() {
        this.fury = 0;
        this.ultiTimer = 34;
        this.ultiPillarX = this.x + this.w / 2;
        this.invulnTimer = Math.max(this.invulnTimer, 38);
        game.screenShake = 14;
        game.hitStop = 5;
        sfx.play('ulti');

        const cx = this.x + this.w / 2;
        const cy = this.y + this.h / 2;
        spawnShockRing(cx, cy, 340, '#f6cc68', 7);
        spawnShockRing(cx, cy, 220, '#fffbeb', 4);
        spawnParticles(cx, cy, '#fde047', 34);
        addFloatingText('PENGHAKIMAN FAJAR!', cx, this.y - 34, '#fde047', true);

        // Hapus semua proyektil musuh di sekitar
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            if (Math.hypot(p.x - cx, p.y - cy) < 420) {
                spawnParticles(p.x, p.y, '#fde047', 5);
                projectiles.splice(i, 1);
            }
        }

        // Hantam semua zombie dalam jangkauan besar
        const ultiDmg = Math.round(this.attackDamage * 3.6 * getComboDamageMultiplier());
        for (const en of enemies) {
            if (en.dead) continue;
            const ex = en.x + en.w / 2;
            const ey = en.y + en.h / 2;
            if (Math.hypot(ex - cx, ey - cy) < 380) {
                en.takeDamage(ultiDmg, Math.sign(ex - cx || this.facing) * 12, { isCrit: true, isUlti: true });
                en.burnTimer = 120;
                registerComboHit();
            }
        }

        // Relik IV: Mahkota Matahari — Pulih +18% Max HP + 2 Gelombang Cahaya Matahari kiri & kanan
        if (hasRelic('crown')) {
            const healAmt = Math.round(this.maxHp * 0.18);
            this.hp = Math.min(this.maxHp, this.hp + healAmt);
            addFloatingText(`+${healAmt} HP SUCI`, cx, this.y - 58, '#6ee7b7');
            const waveDmg = Math.round(this.attackDamage * 2.1);
            for (const dir of [-1, 1]) {
                playerProjectiles.push({
                    kind: 'dawn_wave',
                    x: cx + dir * 24,
                    y: cy - 10,
                    vx: dir * 13.5,
                    vy: 0,
                    w: 44,
                    h: 96,
                    facing: dir,
                    dmg: waveDmg,
                    pierce: 99,
                    burn: true,
                    hitIds: new Set(),
                    life: 62
                });
            }
        }
    }

    takeDamage(amount, knockX = 0, opts = {}) {
        // Cek jendela Tangkis Sempurna terhadap serangan musuh
        if (!opts.ignoreParry && !opts.fromHazard && this.parryWindow > 0) {
            this.triggerPerfectParry(this.x + this.w / 2 + this.facing * 22, this.y + this.h / 2);
            return false;
        }
        if (this.invulnTimer > 0 || game.state !== 'playing') return false;

        this.hp = Math.max(0, this.hp - amount);
        this.invulnTimer = 38;
        this.damageBlinkTimer = 36;
        this.hurtFlash = 14;
        this.vx = knockX;
        if (!opts.fromHazard) this.vy = -5.4;

        game.damageTaken += amount;
        game.comboCount = 0;
        game.comboTimer = 0;
        game.screenShake = Math.max(game.screenShake, 7);

        sfx.play('hurt');
        spawnParticles(this.x + this.w / 2, this.y + this.h / 2, '#ef4444', 12);
        addFloatingText(`-${amount}`, this.x + this.w / 2, this.y - 12, '#fca5a5', true);

        if (this.hp <= 0) {
            triggerGameOver();
        }
        return true;
    }

    draw(ctx) {
        // Pilar Cahaya Penghakiman Fajar (ULTI VFX)
        if (this.ultiTimer > 0) {
            const alpha = this.ultiTimer / 34;
            ctx.save();
            const grad = ctx.createLinearGradient(this.ultiPillarX - 90, 0, this.ultiPillarX + 90, 0);
            grad.addColorStop(0, 'rgba(246, 204, 104, 0)');
            grad.addColorStop(0.28, `rgba(246, 204, 104, ${0.42 * alpha})`);
            grad.addColorStop(0.5, `rgba(255, 251, 235, ${0.88 * alpha})`);
            grad.addColorStop(0.72, `rgba(246, 204, 104, ${0.42 * alpha})`);
            grad.addColorStop(1, 'rgba(246, 204, 104, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(this.ultiPillarX - 90, 0, 180, VIEW_HEIGHT);
            ctx.restore();
        }

        // Berkedip hanya saat baru menerima damage (bukan saat Tangkis Sempurna atau Ulti)
        if (this.damageBlinkTimer > 0 && Math.floor(this.damageBlinkTimer / 3) % 2 === 0) {
            return;
        }

        const tier = this.getArmorTier();
        const palette = tier === 3
            ? { steel: '#f6cc68', dark: '#926018', trim: '#fffbeb', cape: '#b91c1c', visor: '#fef08a', blade: '#fef08a', bladeGlow: '#f59e0b' }
            : (tier === 2
                ? { steel: '#e2e8f0', dark: '#64748b', trim: '#f6cc68', cape: '#991b1b', visor: '#7dd3fc', blade: '#e0f2fe', bladeGlow: '#38bdf8' }
                : { steel: '#94a3b8', dark: '#475569', trim: '#d9a03b', cape: '#991b1b', visor: '#fde68a', blade: '#cbd5e1', bladeGlow: '#f6cc68' });

        const cx = this.x + this.w / 2;
        const bottomY = this.y + this.h;
        const moving = Math.abs(this.vx) > 0.6 && this.onGround;
        const stride = moving ? Math.sin(this.animTick * 0.34) * 7 : 0;
        const bob = moving ? Math.abs(Math.cos(this.animTick * 0.34)) * 2.5 : Math.sin(this.animTick * 0.08) * 1.2;

        ctx.save();
        ctx.translate(cx, bottomY);
        ctx.scale(this.facing * this.scaleX, this.scaleY);

        // Bayangan kaki di tanah
        if (this.onGround) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
            ctx.beginPath();
            ctx.ellipse(0, 1, 20, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Aura Paladin Lv.6+ atau Fury 100%
        if (this.fury >= 100 || tier === 3) {
            ctx.save();
            ctx.globalAlpha = this.fury >= 100 ? 0.28 + Math.sin(this.animTick * 0.2) * 0.12 : 0.14;
            ctx.fillStyle = '#f6cc68';
            ctx.beginPath();
            ctx.ellipse(0, -32, 26, 36, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 1. Jubah Merah Kesatria (Cape dinamis)
        const capeFlutter = Math.sin(this.capeWave) * 5 + (Math.abs(this.vx) * 1.4);
        ctx.fillStyle = palette.cape;
        ctx.beginPath();
        ctx.moveTo(-6, -45 - bob);
        ctx.quadraticCurveTo(-22 - capeFlutter * 0.7, -28 - bob, -26 - capeFlutter, -7 - bob);
        ctx.lineTo(-10 - capeFlutter * 0.4, -5 - bob);
        ctx.lineTo(-4, -25 - bob);
        ctx.closePath();
        ctx.fill();
        // Lis emas bawah jubah
        ctx.strokeStyle = palette.trim;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-25 - capeFlutter, -8 - bob);
        ctx.lineTo(-10 - capeFlutter * 0.4, -6 - bob);
        ctx.stroke();

        // 2. Kaki & Sepatu Baja (Greaves)
        ctx.fillStyle = palette.dark;
        ctx.fillRect(-10 - stride * 0.55, -20, 8, 20);
        ctx.fillStyle = palette.steel;
        ctx.fillRect(-10 - stride * 0.55, -14, 9, 14);

        ctx.fillStyle = palette.dark;
        ctx.fillRect(2 + stride * 0.55, -20, 8, 20);
        ctx.fillStyle = palette.steel;
        ctx.fillRect(2 + stride * 0.55, -14, 10, 14);

        // 3. Tubuh & Zirah Dada (Breastplate + Salib Emas)
        ctx.fillStyle = this.hurtFlash > 0 ? '#ffffff' : palette.steel;
        ctx.beginPath();
        ctx.roundRect(-13, -47 - bob, 26, 29, 5);
        ctx.fill();
        ctx.strokeStyle = palette.dark;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Tabard & Emblem Salib Kesatria di Dada
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(-6, -44 - bob, 12, 26);
        ctx.fillStyle = palette.trim;
        ctx.fillRect(-1.5, -42 - bob, 3, 18);
        ctx.fillRect(-6, -36 - bob, 12, 3);

        // Sabuk Baja
        ctx.fillStyle = '#3b2615';
        ctx.fillRect(-13, -24 - bob, 26, 5);
        ctx.fillStyle = palette.trim;
        ctx.fillRect(-3, -24.5 - bob, 6, 6);

        // Pelindung Bahu (Pauldron)
        ctx.fillStyle = palette.steel;
        ctx.beginPath();
        ctx.arc(-11, -43 - bob, 7.5, Math.PI * 0.8, Math.PI * 2.1);
        ctx.fill();
        ctx.strokeStyle = palette.trim;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 4. Helm Baja Greathelm + Jambul Merah/Emas (Plume)
        const plumeFlow = Math.sin(this.capeWave * 1.2) * 3 + Math.abs(this.vx) * 0.9;
        ctx.fillStyle = palette.cape;
        ctx.beginPath();
        ctx.moveTo(-2, -62 - bob);
        ctx.quadraticCurveTo(-15 - plumeFlow, -71 - bob, -23 - plumeFlow * 1.2, -59 - bob);
        ctx.quadraticCurveTo(-13 - plumeFlow * 0.6, -57 - bob, -4, -56 - bob);
        ctx.closePath();
        ctx.fill();

        // Badan Helm
        ctx.fillStyle = this.hurtFlash > 0 ? '#ffffff' : palette.steel;
        ctx.beginPath();
        ctx.roundRect(-11, -63 - bob, 22, 20, 6);
        ctx.fill();
        ctx.strokeStyle = palette.dark;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Lis Mahkota Helm
        ctx.fillStyle = palette.trim;
        ctx.fillRect(-11, -63 - bob, 22, 3.5);
        ctx.fillRect(0, -63 - bob, 2.5, 19);

        // Celah Visor Bercahaya
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-1, -55 - bob, 12, 4.5);
        ctx.fillStyle = palette.visor;
        ctx.fillRect(2, -54 - bob, 8, 2.4);

        // 5. Pedang Suci & Efek Tebasan Busur
        ctx.save();
        if (this.attackTimer > 0) {
            const isHeavy = this.comboStep === 3;
            const total = isHeavy ? 15 : 11;
            const p = 1 - this.attackTimer / total;
            const swingAngle = this.comboStep === 2
                ? (1.1 - p * 2.5)
                : (-1.45 + p * 2.95);

            // Efek busur tebasan bercahaya
            ctx.save();
            ctx.globalAlpha = Math.max(0, 0.85 - p * 0.72);
            ctx.strokeStyle = isHeavy ? '#fde047' : palette.bladeGlow;
            ctx.lineWidth = isHeavy ? 14 : 9;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(8, -34 - bob, isHeavy ? 62 : 48, -1.25, 1.05);
            ctx.stroke();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = isHeavy ? 5 : 3;
            ctx.beginPath();
            ctx.arc(8, -34 - bob, isHeavy ? 58 : 45, -1.1, 0.95);
            ctx.stroke();
            ctx.restore();

            ctx.translate(8, -35 - bob);
            ctx.rotate(swingAngle);
        } else {
            ctx.translate(10, -34 - bob);
            ctx.rotate(-0.45 + Math.sin(this.animTick * 0.08) * 0.05);
        }

        // Gagang & Pelindung Pedang (Crossguard Emas)
        const bladeLen = tier === 3 ? 46 : (tier === 2 ? 41 : 36);
        const bladeW = tier === 3 ? 7.5 : 6;
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-3, -2, 6, 12);
        ctx.fillStyle = palette.trim;
        ctx.fillRect(-9, -4, 18, 4.5);
        // Bilah Pedang
        ctx.fillStyle = palette.blade;
        ctx.beginPath();
        ctx.moveTo(-bladeW / 2, -4);
        ctx.lineTo(-bladeW / 2 + 1, -bladeLen);
        ctx.lineTo(0, -bladeLen - 9);
        ctx.lineTo(bladeW / 2 - 1, -bladeLen);
        ctx.lineTo(bladeW / 2, -4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = palette.bladeGlow;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();

        // 6. Perisai Menara Kesatria (Tower Shield + Kubah Aegis saat Serbuan Perisai)
        const shieldX = this.shieldTimer > 0 ? 15 : 8;
        const shieldY = -36 - bob;
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(shieldX - 4, shieldY - 12);
        ctx.lineTo(shieldX + 10, shieldY - 12);
        ctx.lineTo(shieldX + 10, shieldY + 4);
        ctx.lineTo(shieldX + 3, shieldY + 15);
        ctx.lineTo(shieldX - 4, shieldY + 4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = palette.trim;
        ctx.lineWidth = 2.2;
        ctx.stroke();
        // Salib Emas di Perisai
        ctx.fillStyle = palette.trim;
        ctx.fillRect(shieldX + 2, shieldY - 8, 2.4, 16);
        ctx.fillRect(shieldX - 2, shieldY - 3, 10, 2.4);

        if (this.shieldTimer > 0) {
            ctx.strokeStyle = this.parryWindow > 0 ? '#fde047' : '#38bdf8';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(12, -32 - bob, 36, -Math.PI * 0.45, Math.PI * 0.45);
            ctx.stroke();
            ctx.fillStyle = this.parryWindow > 0 ? 'rgba(250, 204, 21, 0.22)' : 'rgba(56, 189, 248, 0.18)';
            ctx.beginPath();
            ctx.arc(12, -32 - bob, 35, -Math.PI * 0.45, Math.PI * 0.45);
            ctx.fill();
        }

        ctx.restore();
    }
}
