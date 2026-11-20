/* ==========================================================================
   SISTEM MUSUH: 7 TIPE ZOMBIE / MAYAT HIDUP & 9 BOSS MULTI-FASE
   ========================================================================== */

let nextEnemyUid = 1;

class Zombie {
    constructor(type, x, y, stageNum = 1, bossOpts = null) {
        this.uid = nextEnemyUid++;
        this.type = type;
        this.isBoss = type === 'boss';
        this.bossOpts = bossOpts || {};
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.facing = -1;
        this.onGround = false;
        this.dead = false;
        this.animTick = Math.floor(Math.random() * 60);
        this.hurtFlash = 0;
        this.stunTimer = 0;
        this.burnTimer = 0;
        this.attackCooldown = 45 + Math.floor(Math.random() * 35);
        this.telegraphTimer = 0;
        this.pendingAction = null;
        this.actionTimer = 0;
        this.homeX = x;
        this.homeY = y;

        // Scaling seimbang lintas 30 stage (diminishing curve untuk stage 9-30)
        const s = Math.max(1, stageNum);
        const hpScale = s <= 8
            ? 1 + (s - 1) * 0.22
            : 2.54 + Math.pow(s - 8, 0.85) * 0.28;
        const dmgScale = s <= 8
            ? 1 + (s - 1) * 0.1
            : 1.7 + Math.pow(s - 8, 0.72) * 0.08;
        const spdScale = Math.min(1.38, 1 + (s - 1) * 0.014);

        if (this.isBoss) {
            this.w = 74;
            this.h = 112;
            this.maxHp = this.bossOpts.hp || Math.round(520 * hpScale);
            this.hp = this.maxHp;
            this.damage = this.bossOpts.dmg || Math.round(22 * dmgScale);
            this.speed = this.bossOpts.speed || 3.1;
            this.goldDrop = 85 + stageNum * 6;
            this.maxPhases = this.bossOpts.phases || 2;
            this.phase = 1;
            this.arenaMinX = this.bossOpts.arenaMinX || Math.max(40, x - 700);
            this.arenaMaxX = this.bossOpts.arenaMaxX || (x + 280);
            this.bossState = 'stalk';
            this.stateTimer = 50;
            this.activated = false;
        } else {
            const defs = {
                shambler:    { w: 36, h: 56, hp: 58,  dmg: 12, spd: 1.45, gold: 10 },
                runner:      { w: 34, h: 52, hp: 46,  dmg: 13, spd: 3.35, gold: 12 },
                spitter:     { w: 36, h: 54, hp: 52,  dmg: 13, spd: 1.3,  gold: 14 },
                armored:     { w: 42, h: 64, hp: 108, dmg: 17, spd: 1.55, gold: 20 },
                bloater:     { w: 48, h: 66, hp: 96,  dmg: 18, spd: 1.15, gold: 22 },
                necromancer: { w: 38, h: 60, hp: 78,  dmg: 16, spd: 1.65, gold: 24 },
                wraith:      { w: 40, h: 48, hp: 62,  dmg: 14, spd: 2.5,  gold: 16 }
            };
            const d = defs[type] || defs.shambler;
            this.w = d.w;
            this.h = d.h;
            this.maxHp = Math.round(d.hp * hpScale);
            this.hp = this.maxHp;
            this.damage = Math.round(d.dmg * dmgScale);
            this.speed = d.spd * spdScale;
            this.goldDrop = d.gold + Math.floor(stageNum * 0.9);
            this.summonCooldown = 260;
        }
    }

    update(stage) {
        if (this.dead) return;
        this.animTick++;
        if (this.hurtFlash > 0) this.hurtFlash--;
        if (this.attackCooldown > 0) this.attackCooldown--;

        // Efek Terbakar Cahaya Suci (Holy Burn dari Trident Lv.7+ / Ulti)
        if (this.burnTimer > 0) {
            this.burnTimer--;
            if (this.burnTimer % 28 === 0) {
                const burnDmg = Math.max(4, Math.round((player ? player.attackDamage : 28) * 0.22));
                this.hp -= burnDmg;
                spawnParticles(this.x + this.w / 2, this.y + this.h * 0.4, '#fde047', 4);
                addFloatingText(`${burnDmg}`, this.x + this.w / 2, this.y - 6, '#fde047');
                if (this.hp <= 0) {
                    this.die();
                    return;
                }
            }
        }

        // Efek Stun akibat Hantaman Perisai
        if (this.stunTimer > 0) {
            this.stunTimer--;
            this.vx *= 0.82;
            this._applyPhysics(stage);
            return;
        }

        if (this.isBoss) {
            this._updateBoss(stage);
        } else if (this.type === 'wraith') {
            this._updateWraith();
        } else {
            this._updateRegularZombie(stage);
        }
    }

    _updateWraith() {
        const dx = (player.x + player.w / 2) - (this.x + this.w / 2);
        const dy = (player.y + player.h / 2) - (this.y + this.h / 2);
        const dist = Math.hypot(dx, dy);
        this.facing = dx >= 0 ? 1 : -1;

        if (dist < 460) {
            if (this.actionTimer > 0) {
                this.actionTimer--;
                this.x += this.vx;
                this.y += this.vy;
            } else if (this.attackCooldown <= 0 && dist < 340) {
                // Swoop cepat ke arah Kesatria
                const len = Math.max(1, dist);
                this.vx = (dx / len) * (this.speed * 2.15);
                this.vy = (dy / len) * (this.speed * 1.9);
                this.actionTimer = 28;
                this.attackCooldown = 95;
            } else {
                // Melayang mengintai di atas Kesatria
                const targetX = player.x + (dx > 0 ? -120 : 120);
                const targetY = Math.max(140, player.y - 90 + Math.sin(this.animTick * 0.08) * 28);
                this.vx += (Math.sign(targetX - this.x) * this.speed - this.vx) * 0.08;
                this.vy += (Math.sign(targetY - this.y) * 2.0 - this.vy) * 0.08;
                this.x += this.vx;
                this.y += this.vy;
            }
        } else {
            this.x = this.homeX + Math.sin(this.animTick * 0.03) * 55;
            this.y = this.homeY + Math.cos(this.animTick * 0.05) * 20;
        }

        if (rectOverlap(this, player)) {
            player.takeDamage(this.damage, Math.sign(dx || 1) * 6);
        }
    }

    _updateRegularZombie(stage) {
        const dx = (player.x + player.w / 2) - (this.x + this.w / 2);
        const dy = (player.y + player.h / 2) - (this.y + this.h / 2);
        const dist = Math.hypot(dx, dy);
        const aggroDist = (this.type === 'spitter' || this.type === 'necromancer') ? 540 : 450;

        if (dist < aggroDist) {
            this.facing = dx >= 0 ? 1 : -1;

            if (this.type === 'spitter') {
                if (Math.abs(dx) < 160) {
                    this.vx = -this.facing * this.speed;
                } else if (Math.abs(dx) > 340) {
                    this.vx = this.facing * this.speed;
                } else {
                    this.vx *= 0.8;
                }
                if (this.attackCooldown <= 0 && Math.abs(dy) < 220) {
                    this._fireProjectile('acid', 6.8, -3.2, 10, '#84cc16', true);
                    sfx.play('acid');
                    this.attackCooldown = 105;
                }
            } else if (this.type === 'bloater') {
                this.vx = Math.abs(dx) > 220 ? this.facing * this.speed : this.vx * 0.85;
                if (this.attackCooldown <= 0 && dist < 440) {
                    this._fireProjectile('bomb', 5.6, -7.2, 13, '#a3e635', true);
                    sfx.play('acid');
                    this.attackCooldown = 135;
                }
            } else if (this.type === 'necromancer') {
                if (Math.abs(dx) < 190) {
                    this.vx = -this.facing * this.speed;
                } else if (Math.abs(dx) > 360) {
                    this.vx = this.facing * this.speed;
                } else {
                    this.vx *= 0.8;
                }
                if (this.summonCooldown > 0) this.summonCooldown--;
                if (this.summonCooldown <= 0 && enemies.filter(e => !e.dead && !e.isBoss).length < 18) {
                    const sx = this.x + this.facing * 48;
                    const minion = new Zombie('shambler', sx, this.y, game.stageIndex + 1);
                    minion.maxHp = Math.round(minion.maxHp * 0.65);
                    minion.hp = minion.maxHp;
                    minion.goldDrop = 4;
                    enemies.push(minion);
                    spawnShockRing(sx + 18, this.y + 30, 38, '#2dd4bf', 3);
                    addFloatingText('BANGKIT!', sx + 18, this.y - 12, '#5eead4');
                    this.summonCooldown = 340;
                } else if (this.attackCooldown <= 0) {
                    this._fireProjectile('soul', 6.4, 0, 10, '#2dd4bf', false);
                    sfx.play('acid');
                    this.attackCooldown = 115;
                }
            } else if (this.type === 'runner') {
                this.vx = this.facing * this.speed;
                if (this.onGround && this.attackCooldown <= 0 && Math.abs(dx) < 180 && Math.abs(dx) > 45) {
                    this.vy = -8.6;
                    this.vx = this.facing * (this.speed * 1.35);
                    this.attackCooldown = 80;
                }
            } else if (this.type === 'armored') {
                if (this.telegraphTimer > 0) {
                    this.telegraphTimer--;
                    this.vx *= 0.7;
                    if (this.telegraphTimer === 0) {
                        this.vx = this.facing * 7.2;
                        this.actionTimer = 14;
                        this.attackCooldown = 85;
                    }
                } else if (this.actionTimer > 0) {
                    this.actionTimer--;
                } else {
                    this.vx = this.facing * this.speed;
                    if (Math.abs(dx) < 105 && Math.abs(dy) < 70 && this.attackCooldown <= 0) {
                        this.telegraphTimer = 18;
                    }
                }
            } else {
                // Shambler
                this.vx = this.facing * this.speed;
            }
        } else {
            // Patroli lambat
            const patrolSpan = 85;
            if (this.x < this.homeX - patrolSpan) this.facing = 1;
            else if (this.x > this.homeX + patrolSpan) this.facing = -1;
            this.vx = this.facing * this.speed * 0.48;
        }

        // Hindari jatuh ke jurang saat patroli / mengejar (kecuali runner yang melompat)
        if (this.onGround && !this._hasGroundAhead(stage)) {
            this.vx = 0;
        }

        this._applyPhysics(stage);

        // Serangan sentuhan
        if (rectOverlap(this, player)) {
            player.takeDamage(this.damage, Math.sign(dx || this.facing) * 6.5);
        }
    }

    _updateBoss(stage) {
        const dx = (player.x + player.w / 2) - (this.x + this.w / 2);
        const dist = Math.abs(dx);

        if (!this.activated) {
            if (dist < 640) {
                this.activated = true;
                sfx.play('boss_roar');
                game.screenShake = 8;
                addFloatingText(this.bossOpts.name || 'BOSS!', this.x + this.w / 2, this.y - 30, '#fca5a5', true);
            } else {
                this._applyPhysics(stage);
                return;
            }
        }

        // Transisi Fase Boss (Fase 2 di <=60% HP, Fase 3 di <=30% HP)
        const hpRatio = this.hp / this.maxHp;
        const targetPhase = (this.maxPhases >= 3 && hpRatio <= 0.32)
            ? 3
            : (this.maxPhases >= 2 && hpRatio <= 0.62 ? 2 : 1);

        if (targetPhase > this.phase) {
            this.phase = targetPhase;
            this.bossState = 'roar';
            this.stateTimer = 32;
            this.vx = 0;
            sfx.play('boss_roar');
            game.screenShake = 12;
            spawnShockRing(this.x + this.w / 2, this.y + this.h / 2, 160, this.bossOpts.accent || '#ef4444', 6);
            addFloatingText(`FASE ${this.phase}! AMUKAN!`, this.x + this.w / 2, this.y - 36, '#fde047', true);

            // Panggil pengawal zombie arena (terbatas maks 2 hidup)
            const aliveMinions = enemies.filter(e => !e.dead && !e.isBoss && e.x >= this.arenaMinX - 40).length;
            if (aliveMinions < 2) {
                const count = this.phase === 3 ? 2 : 1;
                for (let k = 0; k < count; k++) {
                    const sx = Math.max(this.arenaMinX + 40, Math.min(this.arenaMaxX - 60, this.x + (k === 0 ? -90 : 90)));
                    const stype = this.bossOpts.summonType || 'shambler';
                    const m = new Zombie(stype, sx, this.y + 20, game.stageIndex + 1);
                    m.maxHp = Math.round(m.maxHp * 0.7);
                    m.hp = m.maxHp;
                    m.goldDrop = 8;
                    enemies.push(m);
                    spawnShockRing(sx + 20, this.y + 60, 44, this.bossOpts.accent || '#84cc16', 3);
                }
            }
        }

        this.stateTimer--;
        const speedMult = 1 + (this.phase - 1) * 0.16;

        if (this.bossState === 'roar') {
            this.vx *= 0.8;
            if (this.stateTimer <= 0) {
                this.bossState = 'stalk';
                this.stateTimer = 36;
            }
        } else if (this.bossState === 'stalk') {
            this.facing = dx >= 0 ? 1 : -1;
            this.vx = this.facing * this.speed * speedMult;
            if (this.stateTimer <= 0) {
                const roll = Math.random();
                if (roll < 0.34) {
                    this.bossState = 'charge_prep';
                    this.stateTimer = 24;
                    this.vx = 0;
                    addFloatingText('!', this.x + this.w / 2, this.y - 26, '#ef4444', true);
                } else if (roll < 0.66) {
                    this.bossState = 'leap_slam';
                    this.stateTimer = 55;
                    this.vy = -14.2;
                    this.vx = Math.max(-7.5, Math.min(7.5, dx * 0.025));
                } else {
                    this.bossState = 'barrage';
                    this.stateTimer = 38;
                    this.vx = 0;
                }
            }
        } else if (this.bossState === 'charge_prep') {
            this.facing = dx >= 0 ? 1 : -1;
            this.vx = 0;
            if (this.stateTimer <= 0) {
                this.bossState = 'charging';
                this.stateTimer = 28;
                this.vx = this.facing * (9.6 * speedMult);
                sfx.play('boss_roar');
            }
        } else if (this.bossState === 'charging') {
            this.vx = this.facing * (9.4 * speedMult);
            if (this.animTick % 4 === 0) {
                spawnParticles(this.x + this.w / 2, this.y + this.h, this.bossOpts.accent || '#ef4444', 4);
            }
            if (this.stateTimer <= 0) {
                this.bossState = 'stalk';
                this.stateTimer = Math.max(26, 48 - this.phase * 7);
            }
        } else if (this.bossState === 'leap_slam') {
            if (this.onGround && this.vy === 0 && this.stateTimer < 46) {
                // Hantaman tanah mengirim 2 gelombang kejut kiri & kanan!
                game.screenShake = 11;
                sfx.play('bomb');
                spawnShockRing(this.x + this.w / 2, this.y + this.h, 115, this.bossOpts.accent || '#f59e0b', 5);
                for (const dir of [-1, 1]) {
                    projectiles.push({
                        kind: 'shockwave',
                        x: this.x + this.w / 2 + dir * 32,
                        y: this.y + this.h - 14,
                        vx: dir * (7.2 + this.phase * 0.9),
                        vy: 0,
                        r: 14,
                        dmg: Math.round(this.damage * 0.9),
                        color: this.bossOpts.accent || '#f59e0b',
                        gravity: false,
                        life: 72
                    });
                }
                this.bossState = 'stalk';
                this.stateTimer = Math.max(28, 52 - this.phase * 8);
            } else if (this.stateTimer <= 0) {
                this.bossState = 'stalk';
                this.stateTimer = 35;
            }
        } else if (this.bossState === 'barrage') {
            this.facing = dx >= 0 ? 1 : -1;
            this.vx *= 0.8;
            if (this.stateTimer === 22 || (this.phase >= 2 && this.stateTimer === 10)) {
                const count = this.phase === 3 ? 5 : 3;
                const spread = this.phase === 3 ? 0.24 : 0.2;
                const baseAngle = Math.atan2(
                    (player.y + player.h / 2) - (this.y + this.h * 0.42),
                    (player.x + player.w / 2) - (this.x + this.w / 2)
                );
                for (let i = 0; i < count; i++) {
                    const offset = (i - (count - 1) / 2) * spread;
                    const spd = 6.6 + this.phase * 0.6;
                    projectiles.push({
                        kind: this.phase === 3 && i % 2 === 1 ? 'bomb' : 'soul',
                        x: this.x + this.w / 2 + this.facing * 24,
                        y: this.y + this.h * 0.42,
                        vx: Math.cos(baseAngle + offset) * spd,
                        vy: Math.sin(baseAngle + offset) * spd - (this.phase === 3 && i % 2 === 1 ? 2.5 : 0),
                        r: 11,
                        dmg: Math.round(this.damage * 0.85),
                        color: this.bossOpts.accent || '#84cc16',
                        gravity: this.phase === 3 && i % 2 === 1,
                        life: 105
                    });
                }
                sfx.play('acid');
            }
            if (this.stateTimer <= 0) {
                this.bossState = 'stalk';
                this.stateTimer = Math.max(28, 50 - this.phase * 8);
            }
        }

        this._applyPhysics(stage);

        // Kunci Boss agar selalu berada dalam batas Arena Boss
        if (this.x < this.arenaMinX) {
            this.x = this.arenaMinX;
            this.vx = Math.abs(this.vx) * 0.5;
        }
        if (this.x + this.w > this.arenaMaxX) {
            this.x = this.arenaMaxX - this.w;
            this.vx = -Math.abs(this.vx) * 0.5;
        }

        if (rectOverlap(this, player)) {
            player.takeDamage(this.damage, Math.sign(dx || this.facing) * 9);
        }
    }

    _fireProjectile(kind, spd, vyBias, radius, color, useGravity) {
        const sx = this.x + this.w / 2 + this.facing * 18;
        const sy = this.y + this.h * 0.36;
        const tx = player.x + player.w / 2;
        const ty = player.y + player.h * 0.45;
        const ang = Math.atan2(ty - sy, tx - sx);
        projectiles.push({
            kind,
            x: sx,
            y: sy,
            vx: useGravity ? this.facing * spd : Math.cos(ang) * spd,
            vy: useGravity ? vyBias : Math.sin(ang) * spd,
            r: radius,
            dmg: Math.round(this.damage * 0.88),
            color,
            gravity: useGravity,
            life: 115
        });
    }

    _hasGroundAhead(stage) {
        const probeX = this.facing === 1 ? this.x + this.w + 8 : this.x - 8;
        const probeY = this.y + this.h + 8;
        for (const p of stage.platforms) {
            if (probeX >= p.x && probeX <= p.x + p.w && Math.abs(probeY - p.y) <= 22) {
                return true;
            }
        }
        return false;
    }

    _applyPhysics(stage) {
        this.vy = Math.min(14, this.vy + 0.62);
        this.x += this.vx;
        if (this.x < 8) { this.x = 8; this.vx = 0; }
        if (this.x + this.w > stage.worldWidth - 8) {
            this.x = stage.worldWidth - this.w - 8;
            this.vx = 0;
        }

        const prevBottom = this.y + this.h;
        this.y += this.vy;
        this.onGround = false;

        for (const plat of stage.platforms) {
            if (this.x + this.w > plat.x + 2 && this.x < plat.x + plat.w - 2) {
                if (this.vy >= 0 && prevBottom <= plat.y + 16 && this.y + this.h >= plat.y) {
                    this.y = plat.y - this.h;
                    this.vy = 0;
                    this.onGround = true;
                }
            }
        }

        if (this.y > VIEW_HEIGHT + 90) {
            if (this.isBoss) {
                this.x = (this.arenaMinX + this.arenaMaxX) / 2;
                this.y = 460;
                this.vy = 0;
            } else {
                this.die(true);
            }
        }
    }

    takeDamage(amount, knockX = 0, opts = {}) {
        if (this.dead) return;

        let finalDmg = amount;
        // Kesatria Tengkorak punya Perisai Tulang (tahan 30% serangan depan biasa kecuali Shield Bash / Heavy / Ulti / Javelin)
        if (this.type === 'armored' && this.stunTimer <= 0 && !opts.isShieldBash && !opts.isHeavy && !opts.isUlti && !opts.fromJavelin) {
            const fromFront = Math.sign(knockX) === -this.facing;
            if (fromFront) {
                finalDmg = Math.max(5, Math.round(amount * 0.7));
            }
        }

        this.hp -= finalDmg;
        this.hurtFlash = 9;
        if (!this.isBoss) {
            this.vx = knockX * (this.type === 'armored' ? 0.55 : 1);
            if (this.type !== 'wraith') this.vy = Math.min(this.vy, -3.2);
        } else {
            this.vx += knockX * 0.14;
        }

        sfx.play(opts.isCrit ? 'crit' : 'hit');
        spawnParticles(this.x + this.w / 2, this.y + this.h * 0.45, opts.isCrit ? '#fde047' : '#84cc16', opts.isCrit ? 11 : 7);
        addFloatingText(
            opts.isCrit ? `${finalDmg}!` : `${finalDmg}`,
            this.x + this.w / 2 + (Math.random() - 0.5) * 18,
            this.y - 8,
            opts.isCrit ? '#fde047' : '#ffffff',
            !!opts.isCrit
        );

        if (this.hp <= 0) {
            this.die(false);
        }
    }

    die(silent = false) {
        if (this.dead) return;
        this.dead = true;
        game.totalKills++;

        const cx = this.x + this.w / 2;
        const cy = this.y + this.h / 2;

        if (!silent) {
            sfx.play(this.isBoss ? 'boss_roar' : 'zombie_die');
            spawnParticles(cx, cy, this.isBoss ? '#f6cc68' : '#84cc16', this.isBoss ? 34 : 16);
            spawnShockRing(cx, cy, this.isBoss ? 140 : 42, this.isBoss ? '#f6cc68' : '#84cc16', this.isBoss ? 6 : 3);

            // Bloater meledak menyemburkan awan wabah saat tumbang!
            if (this.type === 'bloater') {
                sfx.play('bomb');
                spawnShockRing(cx, cy, 92, '#a3e635', 5);
                addFloatingText('LEDAKAN WABAH!', cx, this.y - 16, '#bef264');
                if (player && Math.hypot((player.x + player.w / 2) - cx, (player.y + player.h / 2) - cy) < 88) {
                    player.takeDamage(Math.round(this.damage * 0.85), Math.sign((player.x + player.w / 2) - cx || 1) * 8);
                }
            }

            // Relik III: Cawan Darah Suci — Pulih +4% Max HP setiap menumbangkan zombie
            if (player && hasRelic('chalice')) {
                const heal = Math.max(3, Math.round(player.maxHp * 0.04));
                player.hp = Math.min(player.maxHp, player.hp + heal);
                addFloatingText(`+${heal} HP`, player.x + player.w / 2, player.y - 24, '#34d399');
            }

            // Jatuhkan koin emas suci
            const coinCount = this.isBoss ? 14 : (this.goldDrop >= 20 ? 4 : 2);
            const perCoin = Math.max(2, Math.round(this.goldDrop / coinCount));
            for (let i = 0; i < coinCount; i++) {
                coins.push({
                    x: cx + (Math.random() - 0.5) * 20,
                    y: cy - 8,
                    vx: (Math.random() - 0.5) * 7,
                    vy: -4.5 - Math.random() * 4.5,
                    value: perCoin,
                    life: 620
                });
            }

            if (this.isBoss) {
                game.screenShake = 16;
                addFloatingText('PENGUASA MAYAT TUMBANG!', cx, this.y - 24, '#fde047', true);
            }
        }
    }

    draw(ctx) {
        if (this.dead) return;
        const cx = this.x + this.w / 2;
        const bottomY = this.y + this.h;

        ctx.save();
        ctx.translate(cx, bottomY);

        // Bayangan tanah
        if (this.type !== 'wraith') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
            ctx.beginPath();
            ctx.ellipse(0, 1, this.w * 0.48, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.save();
        ctx.scale(this.facing, 1);

        const flash = this.hurtFlash > 0;
        const wobble = Math.sin(this.animTick * (this.type === 'runner' ? 0.42 : 0.18));

        if (this.isBoss) {
            this._drawBossSprite(ctx, flash, wobble);
        } else {
            this._drawZombieSprite(ctx, flash, wobble);
        }

        ctx.restore();

        // Indikator Stun bintang berputar di atas kepala
        if (this.stunTimer > 0) {
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, -this.h - 10, 14, 5, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Indikator Terbakar Api Suci
        if (this.burnTimer > 0) {
            ctx.fillStyle = 'rgba(253, 224, 71, 0.72)';
            ctx.beginPath();
            ctx.arc(Math.sin(this.animTick * 0.4) * 8, -this.h * 0.65, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Health bar mini untuk zombie reguler yang terluka
        if (!this.isBoss && this.hp < this.maxHp) {
            const bw = Math.max(34, this.w);
            const bx = -bw / 2;
            const by = -this.h - 12;
            ctx.fillStyle = 'rgba(10, 12, 16, 0.85)';
            ctx.fillRect(bx, by, bw, 5);
            ctx.fillStyle = '#84cc16';
            ctx.fillRect(bx, by, bw * Math.max(0, this.hp / this.maxHp), 5);
        }

        ctx.restore();
    }

    _drawZombieSprite(ctx, flash, wobble) {
        const stride = wobble * 6;
        const bob = Math.abs(wobble) * 2.5;

        if (this.type === 'wraith') {
            // Hantu Kuburan melayang dengan sayap robek & mata bersinar
            const hover = Math.sin(this.animTick * 0.14) * 5;
            ctx.fillStyle = flash ? '#ffffff' : 'rgba(30, 41, 59, 0.9)';
            ctx.beginPath();
            ctx.moveTo(0, -48 + hover);
            ctx.quadraticCurveTo(20, -34 + hover, 16, -6 + hover);
            ctx.lineTo(6, -12 + hover);
            ctx.lineTo(0, -3 + hover);
            ctx.lineTo(-8, -13 + hover);
            ctx.lineTo(-18, -5 + hover);
            ctx.quadraticCurveTo(-20, -34 + hover, 0, -48 + hover);
            ctx.fill();
            // Sayap bayangan
            const wing = Math.sin(this.animTick * 0.28) * 10;
            ctx.fillStyle = 'rgba(45, 212, 191, 0.35)';
            ctx.beginPath();
            ctx.moveTo(-10, -30 + hover);
            ctx.lineTo(-32, -40 + wing + hover);
            ctx.lineTo(-20, -18 + hover);
            ctx.closePath();
            ctx.fill();
            // Mata hantu menyala
            ctx.fillStyle = '#5eead4';
            ctx.fillRect(3, -36 + hover, 5, 4);
            ctx.fillRect(10, -36 + hover, 4, 4);
            return;
        }

        // Kaki zombie
        ctx.fillStyle = '#292524';
        ctx.fillRect(-9 - stride * 0.5, -18, 7, 18);
        ctx.fillRect(2 + stride * 0.5, -18, 7, 18);

        if (this.type === 'bloater') {
            // Zombie Peledak besar dengan kantung racun menyala
            ctx.fillStyle = flash ? '#ffffff' : '#3f6212';
            ctx.beginPath();
            ctx.ellipse(0, -34 - bob, 23, 24, 0, 0, Math.PI * 2);
            ctx.fill();
            // Bisul racun berkedip
            const pulse = 0.65 + Math.sin(this.animTick * 0.25) * 0.35;
            ctx.fillStyle = `rgba(190, 242, 100, ${pulse})`;
            ctx.beginPath();
            ctx.arc(8, -36 - bob, 7, 0, Math.PI * 2);
            ctx.arc(-8, -28 - bob, 6, 0, Math.PI * 2);
            ctx.arc(2, -46 - bob, 5, 0, Math.PI * 2);
            ctx.fill();
            // Kepala
            ctx.fillStyle = flash ? '#ffffff' : '#65a30d';
            ctx.beginPath();
            ctx.arc(4, -56 - bob, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(7, -59 - bob, 5, 3.5);
            return;
        }

        if (this.type === 'armored') {
            // Kesatria Tengkorak berzirah besi karatan & perisai retak
            ctx.fillStyle = flash ? '#ffffff' : '#44403c';
            ctx.beginPath();
            ctx.roundRect(-13, -46 - bob, 26, 30, 4);
            ctx.fill();
            ctx.strokeStyle = '#78716c';
            ctx.lineWidth = 1.6;
            ctx.stroke();
            // Helm Tengkorak bertanduk patah
            ctx.fillStyle = flash ? '#ffffff' : '#d6d3d1';
            ctx.beginPath();
            ctx.roundRect(-10, -63 - bob, 20, 18, 5);
            ctx.fill();
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(1, -56 - bob, 5, 3.5);
            ctx.fillRect(8, -56 - bob, 4, 3.5);
            // Pedang berkarat
            ctx.fillStyle = this.telegraphTimer > 0 ? '#fca5a5' : '#9ca3af';
            ctx.fillRect(12, -52 - bob, 5, 28);
            // Perisai Tulang di depan
            ctx.fillStyle = '#292524';
            ctx.strokeStyle = '#a8a29e';
            ctx.lineWidth = 2;
            ctx.fillRect(10, -40 - bob, 9, 24);
            ctx.strokeRect(10, -40 - bob, 9, 24);
            return;
        }

        if (this.type === 'necromancer') {
            // Dukun Nekromanser berjubah gelap + tongkat tengkorak bercahaya
            ctx.fillStyle = flash ? '#ffffff' : '#134e4a';
            ctx.beginPath();
            ctx.moveTo(-14, -4);
            ctx.lineTo(-10, -46 - bob);
            ctx.lineTo(10, -46 - bob);
            ctx.lineTo(15, -4);
            ctx.closePath();
            ctx.fill();
            // Tudung & mata menyala
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(0, -51 - bob, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#2dd4bf';
            ctx.fillRect(2, -53 - bob, 4, 3);
            ctx.fillRect(8, -53 - bob, 3, 3);
            // Tongkat sihir
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(13, -6);
            ctx.lineTo(16, -56 - bob);
            ctx.stroke();
            ctx.fillStyle = '#2dd4bf';
            ctx.beginPath();
            ctx.arc(16, -58 - bob, 6 + Math.sin(this.animTick * 0.2) * 1.5, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        // Shambler, Runner, & Spitter (Zombie Klasik, Pelari, & Peludah Asam)
        const skin = flash
            ? '#ffffff'
            : (this.type === 'runner' ? '#a3e635' : (this.type === 'spitter' ? '#65a30d' : '#719b48'));
        const cloth = this.type === 'runner' ? '#451a03' : (this.type === 'spitter' ? '#14532d' : '#3f3f46');
        const lean = this.type === 'runner' ? 0.26 : 0.1;

        ctx.save();
        ctx.rotate(lean);
        // Tubuh compang-camping
        ctx.fillStyle = cloth;
        ctx.beginPath();
        ctx.roundRect(-11, -42 - bob, 22, 26, 4);
        ctx.fill();

        // Kantung asam menyala di punggung Spitter
        if (this.type === 'spitter') {
            ctx.fillStyle = '#bef264';
            ctx.beginPath();
            ctx.arc(-11, -34 - bob, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Lengan zombie terulur mencakar ke depan
        ctx.fillStyle = skin;
        ctx.fillRect(6, -38 - bob, 18, 6);
        ctx.fillRect(8, -31 - bob, 15, 5);

        // Kepala Zombie
        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.roundRect(-9, -56 - bob, 19, 17, 5);
        ctx.fill();
        // Rahang & Mata menyala
        ctx.fillStyle = this.type === 'runner' ? '#ef4444' : '#fef08a';
        ctx.fillRect(2, -51 - bob, 4, 3.5);
        ctx.fillRect(8, -51 - bob, 3, 3.5);
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(2, -44 - bob, 8, 3);
        ctx.restore();
    }

    _drawBossSprite(ctx, flash, wobble) {
        const accent = this.bossOpts.accent || '#84cc16';
        const cloak = this.bossOpts.cloak || '#3f1d1d';
        const bob = Math.abs(wobble) * 3.5;
        const stride = wobble * 9;

        // Aura Fase 2 / Fase 3
        if (this.phase >= 2) {
            ctx.save();
            ctx.globalAlpha = 0.22 + Math.sin(this.animTick * 0.2) * 0.1;
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.ellipse(0, -56, 48, 60, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Jubah Penguasa Mayat
        ctx.fillStyle = cloak;
        ctx.beginPath();
        ctx.moveTo(-22, -82 - bob);
        ctx.lineTo(-42 - Math.sin(this.animTick * 0.14) * 6, -6);
        ctx.lineTo(18, -6);
        ctx.lineTo(24, -82 - bob);
        ctx.closePath();
        ctx.fill();

        // Kaki raksasa berzirah
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(-20 - stride * 0.4, -32, 14, 32);
        ctx.fillRect(6 + stride * 0.4, -32, 14, 32);

        // Dada Zirah Kegelapan
        ctx.fillStyle = flash ? '#ffffff' : '#27272a';
        ctx.beginPath();
        ctx.roundRect(-27, -84 - bob, 54, 54, 8);
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2.6;
        ctx.stroke();

        // Tulang Rusuk & Inti Jiwa di Dada
        ctx.fillStyle = 'rgba(231, 229, 228, 0.28)';
        for (let r = 0; r < 3; r++) {
            ctx.fillRect(-20, -74 + r * 11 - bob, 12, 4);
            ctx.fillRect(8, -74 + r * 11 - bob, 12, 4);
        }
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(0, -58 - bob, 10 + Math.sin(this.animTick * 0.16) * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(-2, -60 - bob, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Bahu Berduri
        ctx.fillStyle = '#3f3f46';
        ctx.beginPath();
        ctx.arc(-27, -78 - bob, 13, 0, Math.PI * 2);
        ctx.arc(27, -78 - bob, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.moveTo(-36, -84 - bob); ctx.lineTo(-46, -98 - bob); ctx.lineTo(-26, -90 - bob); ctx.closePath();
        ctx.moveTo(36, -84 - bob); ctx.lineTo(46, -98 - bob); ctx.lineTo(26, -90 - bob); ctx.closePath();
        ctx.fill();

        // Kepala Tengkorak / Lich Bermahkota
        ctx.fillStyle = flash ? '#ffffff' : (this.bossOpts.isFinalBoss ? '#e7e5e4' : '#7ea838');
        ctx.beginPath();
        ctx.roundRect(-18, -110 - bob, 36, 29, 8);
        ctx.fill();
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Rongga Rahang & Gigi Tengkorak
        ctx.fillStyle = '#18181b';
        ctx.fillRect(-10, -89 - bob, 22, 6);
        ctx.fillStyle = '#e7e5e4';
        for (let t = -8; t <= 8; t += 5) {
            ctx.fillRect(t, -89 - bob, 3, 4);
        }

        // Mahkota Tanduk
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.moveTo(-19, -108 - bob);
        ctx.lineTo(-25, -128 - bob);
        ctx.lineTo(-9, -113 - bob);
        ctx.lineTo(0, -133 - bob);
        ctx.lineTo(9, -113 - bob);
        ctx.lineTo(25, -128 - bob);
        ctx.lineTo(19, -108 - bob);
        ctx.closePath();
        ctx.fill();

        // Rongga Mata & Sinar Mata Boss Tajam
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, -102 - bob, 9, 7);
        ctx.fillRect(10, -102 - bob, 8, 7);
        ctx.fillStyle = this.bossState === 'charge_prep' ? '#ffffff' : accent;
        ctx.fillRect(2, -100 - bob, 6, 4);
        ctx.fillRect(11, -100 - bob, 5, 4);

        // Senjata Raksasa Boss
        ctx.save();
        ctx.translate(22, -62 - bob);
        const swing = this.bossState === 'charging' ? 0.9 : (this.bossState === 'charge_prep' ? -0.9 : Math.sin(this.animTick * 0.12) * 0.18);
        ctx.rotate(swing);
        const wType = this.bossOpts.weapon || 'cleaver';
        if (wType === 'hammer') {
            ctx.fillStyle = '#78350f';
            ctx.fillRect(-4, -56, 8, 66);
            ctx.fillStyle = '#52525b';
            ctx.fillRect(-20, -68, 40, 22);
            ctx.strokeStyle = accent;
            ctx.lineWidth = 2;
            ctx.strokeRect(-20, -68, 40, 22);
        } else if (wType === 'staff' || wType === 'lich_scepter') {
            ctx.fillStyle = '#44403c';
            ctx.fillRect(-3.5, -74, 7, 88);
            const sg = ctx.createRadialGradient(0, -78, 4, 0, -78, 28);
            sg.addColorStop(0, accent);
            sg.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = sg;
            ctx.beginPath();
            ctx.arc(0, -78, 28, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.arc(0, -78, 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, -78, 5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = '#52525b';
            ctx.fillRect(-4, -4, 8, 18);
            ctx.fillStyle = '#d4d4d8';
            ctx.beginPath();
            ctx.moveTo(-7, -4);
            ctx.lineTo(-10, -72);
            ctx.lineTo(10, -62);
            ctx.lineTo(7, -4);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = accent;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.restore();
    }
}
