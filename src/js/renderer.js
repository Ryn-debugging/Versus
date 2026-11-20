/* ==========================================================================
   RENDERER DUNIA 2D (15 BIOMA GOTHIC, CUACA, RADAR STAGE 2D, & CG ENDING)
   ========================================================================== */

function buildBgProps(stage) {
    const props = [];
    const count = Math.ceil(stage.worldWidth / 195) + 6;
    for (let i = 0; i < count; i++) {
        const seed = (i * 137 + stage.id * 53) % 100;
        props.push({
            x: i * 195 + (seed % 70) - 35,
            w: 44 + (seed % 56),
            h: 110 + ((seed * 3) % 175),
            variant: i % 3
        });
    }
    return props;
}

function drawSkyAndMoon(ctx, stage) {
    ctx.fillStyle = skyGradientCache[game.stageIndex] || stage.skyTop;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    // Bintang tipis di langit atas
    ctx.save();
    ctx.fillStyle = 'rgba(255, 251, 235, 0.35)';
    for (let i = 0; i < 28; i++) {
        const sx = ((i * 173 + stage.id * 41) % VIEW_WIDTH);
        const sy = 22 + ((i * 89) % 240);
        const r = (i % 3 === 0) ? 1.8 : 1.1;
        ctx.fillRect(sx, sy, r, r);
    }
    ctx.restore();

    if (stage.moonType === 'none') return;

    const mx = VIEW_WIDTH - 220;
    const my = 148;
    const isEclipse = stage.moonType === 'eclipse' || stage.moonType === 'eclipse_gold';
    const moonColor = stage.moonType === 'blood'
        ? '#dc2626'
        : (stage.moonType === 'sickly' ? '#a3e635' : (stage.moonType === 'ice' ? '#bae6fd' : stage.ambientColor));

    ctx.save();
    // Soft luminescent atmospheric halo
    const halo = ctx.createRadialGradient(mx, my, 36, mx, my, isEclipse ? 145 : 132);
    halo.addColorStop(0, moonColor);
    halo.addColorStop(0.42, 'rgba(246, 204, 104, 0.14)');
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.globalAlpha = isEclipse ? 0.52 : 0.34;
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(mx, my, isEclipse ? 145 : 132, 0, Math.PI * 2);
    ctx.fill();

    // Moon disc
    ctx.globalAlpha = isEclipse ? 0.92 : 0.72;
    ctx.fillStyle = moonColor;
    ctx.beginPath();
    ctx.arc(mx, my, 50, 0, Math.PI * 2);
    ctx.fill();

    if (isEclipse) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#06070b';
        ctx.beginPath();
        ctx.arc(mx, my, 43, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = stage.moonType === 'eclipse_gold' ? 'rgba(253, 224, 71, 0.92)' : 'rgba(248, 113, 113, 0.78)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(mx, my, 45, 0, Math.PI * 2);
        ctx.stroke();
    } else {
        // Subtle lunar craters
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(mx - 14, my - 10, 10, 0, Math.PI * 2);
        ctx.arc(mx + 15, my + 8, 13, 0, Math.PI * 2);
        ctx.arc(mx - 4, my + 18, 7, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawWeather(ctx, stage) {
    const wType = stage.weather || 'mist';
    ctx.save();
    const colorMap = {
        storm: 'rgba(125, 211, 252, 0.42)',
        snow: 'rgba(224, 242, 254, 0.58)',
        ember: 'rgba(251, 146, 60, 0.5)',
        spore: 'rgba(163, 230, 53, 0.42)',
        astral: 'rgba(246, 204, 104, 0.52)',
        mist: 'rgba(214, 211, 209, 0.28)',
        dust: 'rgba(203, 213, 225, 0.26)'
    };
    const col = colorMap[wType] || stage.ambientColor;
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;

    for (let i = 0; i < weatherParticles.length; i++) {
        const wp = weatherParticles[i];
        if (game.state === 'playing') {
            if (wType === 'storm') {
                wp.x -= 4.2;
                wp.y += 10.5;
            } else if (wType === 'ember') {
                wp.x += Math.sin(game.worldTick * 0.03 + wp.phase) * 0.65;
                wp.y -= wp.speedY * 1.3;
            } else if (wType === 'snow') {
                wp.x += Math.sin(game.worldTick * 0.025 + wp.phase) * 0.7 - 0.35;
                wp.y += wp.speedY * 1.05;
            } else {
                wp.x += Math.sin(game.worldTick * 0.02 + wp.phase) * 0.45 + wp.speedX;
                wp.y += Math.cos(game.worldTick * 0.02 + wp.phase) * 0.32;
            }
            if (wp.x < -12) wp.x = VIEW_WIDTH + 8;
            if (wp.x > VIEW_WIDTH + 12) wp.x = -8;
            if (wp.y < -12) wp.y = VIEW_HEIGHT + 8;
            if (wp.y > VIEW_HEIGHT + 12) wp.y = -8;
        }

        if (wType === 'storm') {
            ctx.beginPath();
            ctx.moveTo(wp.x, wp.y);
            ctx.lineTo(wp.x - 4.5, wp.y + 12);
            ctx.stroke();
        } else {
            ctx.globalAlpha = wType === 'snow' ? 0.62 : (0.24 + 0.22 * Math.sin(game.worldTick * 0.04 + wp.phase));
            ctx.beginPath();
            ctx.arc(wp.x, wp.y, wp.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

function drawParallaxProps(ctx, stage) {
    const theme = stage.bgStyle || 'graveyard';
    ctx.save();

    // Siluet pegunungan/benteng jauh (parallax 0.22)
    ctx.fillStyle = 'rgba(10, 12, 18, 0.42)';
    for (let i = 0; i < 8; i++) {
        const hx = ((i * 290 - game.cameraX * 0.22) % (VIEW_WIDTH + 320)) - 140;
        const hh = 140 + ((i * 47 + stage.id * 19) % 120);
        ctx.beginPath();
        ctx.moveTo(hx - 140, 620);
        ctx.lineTo(hx, 620 - hh);
        ctx.lineTo(hx + 160, 620);
        ctx.closePath();
        ctx.fill();
    }

    // Siluet arsitektur menengah sesuai bioma (parallax 0.48)
    for (let i = 0; i < bgProps.length; i++) {
        const prop = bgProps[i];
        const px = prop.x - game.cameraX * 0.48;
        if (px < -140 || px > VIEW_WIDTH + 140) continue;

        ctx.fillStyle = 'rgba(12, 14, 20, 0.62)';
        if (theme === 'graveyard' || theme === 'cursed_woods') {
            // Batu nisan salib & pohon mati gothic
            if (prop.variant === 0) {
                ctx.fillRect(px + 12, 610 - 66, 32, 66);
                ctx.beginPath();
                ctx.arc(px + 28, 610 - 66, 16, Math.PI, 0);
                ctx.fill();
                ctx.fillStyle = 'rgba(217, 169, 78, 0.2)';
                ctx.fillRect(px + 26, 610 - 54, 4, 24);
                ctx.fillRect(px + 19, 610 - 46, 18, 4);
            } else {
                ctx.fillRect(px + 16, 610 - prop.h, 16, prop.h);
                ctx.beginPath();
                ctx.moveTo(px + 24, 610 - prop.h + 26);
                ctx.lineTo(px - 18, 610 - prop.h - 14);
                ctx.lineTo(px - 12, 610 - prop.h - 20);
                ctx.lineTo(px + 24, 610 - prop.h + 12);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(px + 24, 610 - prop.h + 40);
                ctx.lineTo(px + 66, 610 - prop.h + 4);
                ctx.lineTo(px + 60, 610 - prop.h - 4);
                ctx.lineTo(px + 24, 610 - prop.h + 26);
                ctx.fill();
            }
        } else if (theme === 'village') {
            // Rumah desa kayu terbakar & cerobong asap
            const rh = 110 + (prop.h % 70);
            ctx.fillRect(px, 610 - rh, prop.w + 30, rh);
            ctx.beginPath();
            ctx.moveTo(px - 10, 610 - rh);
            ctx.lineTo(px + (prop.w + 30) / 2, 610 - rh - 44);
            ctx.lineTo(px + prop.w + 40, 610 - rh);
            ctx.closePath();
            ctx.fill();
            // Jendela menyala bara api
            ctx.fillStyle = 'rgba(251, 146, 60, 0.45)';
            ctx.fillRect(px + 14, 610 - rh + 24, 14, 18);
            ctx.fillRect(px + 38, 610 - rh + 24, 14, 18);
        } else if (theme === 'cathedral' || theme === 'eclipse_temple' || theme === 'lich_throne') {
            // Pilar katedral lengkung & menara runcing
            ctx.fillRect(px, 610 - prop.h, prop.w * 0.72, prop.h);
            ctx.beginPath();
            ctx.moveTo(px - 4, 610 - prop.h);
            ctx.lineTo(px + prop.w * 0.36, 610 - prop.h - 52);
            ctx.lineTo(px + prop.w * 0.72 + 4, 610 - prop.h);
            ctx.closePath();
            ctx.fill();
            // Jendela kaca patri emas/merah
            ctx.fillStyle = theme === 'lich_throne' ? 'rgba(246, 204, 104, 0.3)' : 'rgba(239, 68, 68, 0.25)';
            ctx.beginPath();
            ctx.arc(px + prop.w * 0.36, 610 - prop.h + 44, 10, Math.PI, 0);
            ctx.lineTo(px + prop.w * 0.36 + 10, 610 - prop.h + 78);
            ctx.lineTo(px + prop.w * 0.36 - 10, 610 - prop.h + 78);
            ctx.closePath();
            ctx.fill();
        } else if (theme === 'frozen_crypt') {
            // Pilar kristal es
            ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
            ctx.beginPath();
            ctx.moveTo(px, 610);
            ctx.lineTo(px + prop.w * 0.45, 610 - prop.h);
            ctx.lineTo(px + prop.w * 0.9, 610);
            ctx.closePath();
            ctx.fill();
        } else {
            // Pilar benteng, obelisk nekromansi, & reruntuhan
            ctx.fillRect(px, 610 - prop.h, prop.w * 0.62, prop.h);
            ctx.fillStyle = stage.ambientColor;
            ctx.globalAlpha = 0.22;
            ctx.fillRect(px + prop.w * 0.24, 610 - prop.h + 18, 6, prop.h * 0.45);
            ctx.globalAlpha = 1;
        }
    }
    ctx.restore();
}

function drawStageRadar(ctx, stage) {
    if (!player || game.state !== 'playing') return;
    const rw = 260;
    const rh = 12;
    const rx = (VIEW_WIDTH - rw) / 2;
    const ry = VIEW_HEIGHT - 26;
    const worldW = Math.max(1, stage.worldWidth);

    ctx.save();
    ctx.fillStyle = 'rgba(12, 14, 20, 0.78)';
    ctx.strokeStyle = 'rgba(217, 169, 78, 0.42)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(rx - 8, ry - 6, rw + 16, rh + 12, 9);
    ctx.fill();
    ctx.stroke();

    // Garis lintasan
    ctx.fillStyle = 'rgba(168, 162, 158, 0.25)';
    ctx.fillRect(rx, ry + rh / 2 - 1.5, rw, 3);

    // Checkpoint (biru-emas)
    for (const cp of checkpoints) {
        const x = rx + (cp.x / worldW) * rw;
        ctx.fillStyle = cp.activated ? '#38bdf8' : '#78716c';
        ctx.fillRect(x - 2, ry + 1, 4, rh - 2);
    }

    // Peti Relik belum dibuka (emas)
    for (const ch of chests) {
        if (ch.opened) continue;
        const x = rx + (ch.x / worldW) * rw;
        ctx.fillStyle = '#facc15';
        ctx.fillRect(x - 2.5, ry + 2, 5, 5);
    }

    // Zombie hidup (hijau wabah) & Boss (merah besar)
    for (const en of enemies) {
        if (en.dead) continue;
        const x = rx + ((en.x + en.w / 2) / worldW) * rw;
        ctx.fillStyle = en.isBoss ? '#ef4444' : '#84cc16';
        ctx.beginPath();
        ctx.arc(x, ry + rh / 2, en.isBoss ? 4.8 : 2.6, 0, Math.PI * 2);
        ctx.fill();
    }

    // Gerbang Suci / Portal
    const px = rx + (stage.portalX / worldW) * rw;
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(px, ry + rh / 2, 4.2, 0, Math.PI * 2);
    ctx.fill();

    // Posisi Kesatria (Panah Emas Putih)
    const kx = rx + ((player.x + player.w / 2) / worldW) * rw;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#d9a03b';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(kx, ry + rh / 2, 4.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
}

function drawGame() {
    const stage = STAGES[game.stageIndex];
    if (!stage) return;

    drawSkyAndMoon(ctx, stage);
    drawWeather(ctx, stage);

    ctx.save();
    if (game.screenShake > 0) {
        ctx.translate(
            (Math.random() - 0.5) * game.screenShake * 2,
            (Math.random() - 0.5) * game.screenShake * 2
        );
    }

    drawParallaxProps(ctx, stage);

    // Kamera Dunia
    ctx.save();
    ctx.translate(-Math.round(game.cameraX), 0);

    // 1. Platform & Tanah dengan Tekstur Batu Bata & Obor Gothic
    for (let pi = 0; pi < stage.platforms.length; pi++) {
        const plat = stage.platforms[pi];
        if (plat.x + plat.w < game.cameraX - 100 || plat.x > game.cameraX + VIEW_WIDTH + 100) continue;

        ctx.fillStyle = plat.type === 'ground' ? stage.groundColor : stage.platColor;
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

        // Tekstur batu bata dua baris dengan bayangan halus
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.lineWidth = 1;
        if (plat.h >= 36) {
            ctx.beginPath();
            ctx.moveTo(plat.x, plat.y + 30);
            ctx.lineTo(plat.x + plat.w, plat.y + 30);
            ctx.stroke();
        }
        for (let bx = plat.x + 28; bx < plat.x + plat.w; bx += 42) {
            ctx.beginPath();
            ctx.moveTo(bx, plat.y + 9);
            ctx.lineTo(bx, plat.y + Math.min(plat.h, 30));
            ctx.stroke();
        }

        // Lapisan atas (rumput/batu/es/emas) + sorotan tepi atas
        ctx.fillStyle = plat.type === 'moving' ? '#d9a03b' : (plat.type === 'ground' ? stage.groundTop : stage.platTop);
        ctx.fillRect(plat.x, plat.y, plat.w, plat.type === 'ground' ? 10 : 7);
        ctx.fillStyle = 'rgba(255, 251, 235, 0.14)';
        ctx.fillRect(plat.x, plat.y, plat.w, 2);

        if (plat.type === 'moving') {
            ctx.fillStyle = '#fef3c7';
            ctx.fillRect(plat.x + 8, plat.y + 10, 5, 5);
            ctx.fillRect(plat.x + plat.w - 13, plat.y + 10, 5, 5);
        }

        // Obor besi Gothic berkedip di segmen daratan lebar
        if (plat.type === 'ground' && plat.w >= 520) {
            const torchStep = 460;
            for (let tx = plat.x + 175; tx < plat.x + plat.w - 160; tx += torchStep) {
                if (tx < game.cameraX - 90 || tx > game.cameraX + VIEW_WIDTH + 90) continue;
                const flick = Math.sin(game.worldTick * 0.24 + tx * 0.05) * 3.5;
                // Cahaya obor hangat (radial glow)
                const tg = ctx.createRadialGradient(tx, plat.y - 44, 4, tx, plat.y - 44, 68 + flick);
                tg.addColorStop(0, 'rgba(251, 146, 60, 0.28)');
                tg.addColorStop(0.5, 'rgba(245, 158, 11, 0.08)');
                tg.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = tg;
                ctx.beginPath();
                ctx.arc(tx, plat.y - 44, 68 + flick, 0, Math.PI * 2);
                ctx.fill();
                // Tiang besi & mangkuk api
                ctx.fillStyle = '#292524';
                ctx.fillRect(tx - 2.5, plat.y - 40, 5, 40);
                ctx.fillStyle = '#57534e';
                ctx.fillRect(tx - 8, plat.y - 42, 16, 5);
                // Lidah api
                ctx.fillStyle = '#f97316';
                ctx.beginPath();
                ctx.moveTo(tx - 6, plat.y - 42);
                ctx.quadraticCurveTo(tx, plat.y - 60 - flick, tx + 6, plat.y - 42);
                ctx.fill();
                ctx.fillStyle = '#fef08a';
                ctx.beginPath();
                ctx.moveTo(tx - 3, plat.y - 42);
                ctx.quadraticCurveTo(tx, plat.y - 52 - flick * 0.6, tx + 3, plat.y - 42);
                ctx.fill();
            }
        }
    }

    // 2. Jebakan Duri Tulang (Bone Spikes)
    for (const sp of stage.spikes) {
        if (sp.x + sp.w < game.cameraX - 40 || sp.x > game.cameraX + VIEW_WIDTH + 40) continue;
        const count = Math.max(3, Math.floor(sp.w / 14));
        const sw = sp.w / count;
        ctx.fillStyle = '#d6d3d1';
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 1.2;
        for (let i = 0; i < count; i++) {
            const sx = sp.x + i * sw;
            ctx.beginPath();
            ctx.moveTo(sx + 1, sp.y + sp.h);
            ctx.lineTo(sx + sw / 2, sp.y);
            ctx.lineTo(sx + sw - 1, sp.y + sp.h);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    }

    // 3. Batu Pegas Suci (Holy Springs)
    if (stage.springs) {
        for (const sp of stage.springs) {
            if (sp.x + sp.w < game.cameraX - 40 || sp.x > game.cameraX + VIEW_WIDTH + 40) continue;
            const bounceOff = sp._bounce > 0 ? Math.sin(sp._bounce * 0.5) * 6 : 0;
            ctx.fillStyle = '#292524';
            ctx.fillRect(sp.x, sp.y + 6, sp.w, sp.h - 6);
            ctx.fillStyle = '#f6cc68';
            ctx.fillRect(sp.x - 2, sp.y - bounceOff, sp.w + 4, 8);
            ctx.fillStyle = '#fffbeb';
            ctx.fillRect(sp.x + 6, sp.y + 2 - bounceOff, sp.w - 12, 3);
        }
    }

    // 4. Api Unggun Checkpoint (Sacred Bonfires)
    for (const cp of checkpoints) {
        const fx = cp.x;
        const fy = cp.y;
        // Pedang tertancap di batu
        ctx.fillStyle = '#57534e';
        ctx.beginPath();
        ctx.ellipse(fx, fy - 4, 18, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = cp.activated ? '#fde047' : '#94a3b8';
        ctx.fillRect(fx - 2.5, fy - 44, 5, 40);
        ctx.fillRect(fx - 10, fy - 34, 20, 4);
        if (cp.activated) {
            const flick = Math.sin(game.worldTick * 0.3) * 4;
            ctx.fillStyle = 'rgba(251, 146, 60, 0.85)';
            ctx.beginPath();
            ctx.moveTo(fx - 12, fy - 6);
            ctx.quadraticCurveTo(fx, fy - 36 - flick, fx + 12, fy - 6);
            ctx.fill();
            ctx.fillStyle = 'rgba(254, 240, 138, 0.9)';
            ctx.beginPath();
            ctx.moveTo(fx - 6, fy - 6);
            ctx.quadraticCurveTo(fx, fy - 24 - flick * 0.6, fx + 6, fy - 6);
            ctx.fill();
        }
    }

    // 5. Peti Relik (Treasure Chests)
    for (const ch of chests) {
        ctx.fillStyle = ch.opened ? '#44403c' : '#78350f';
        ctx.fillRect(ch.x, ch.y, ch.w, ch.h);
        ctx.strokeStyle = ch.opened ? '#78716c' : '#f6cc68';
        ctx.lineWidth = 2.4;
        ctx.strokeRect(ch.x, ch.y, ch.w, ch.h);
        ctx.fillStyle = ch.opened ? '#a8a29e' : '#fde047';
        ctx.fillRect(ch.x + ch.w / 2 - 4, ch.y + 10, 8, 9);
        if (!ch.opened) {
            ctx.fillStyle = `rgba(253, 224, 71, ${0.18 + Math.sin(game.worldTick * 0.1) * 0.12})`;
            ctx.beginPath();
            ctx.arc(ch.x + ch.w / 2, ch.y + ch.h / 2, 28, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 6. Gerbang Suci / Portal Akhir Stage
    const bossAlive = enemies.some(e => e.isBoss && !e.dead);
    const px = stage.portalX;
    const py = stage.portalY;
    ctx.save();
    ctx.translate(px + 28, py + 52);
    // Lengkungan batu gerbang
    ctx.strokeStyle = bossAlive ? '#57534e' : '#f6cc68';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, 38, Math.PI, 0);
    ctx.lineTo(38, 52);
    ctx.moveTo(-38, 0);
    ctx.lineTo(-38, 52);
    ctx.stroke();

    // Pusaran cahaya suci di dalam gerbang
    const pPulse = 0.55 + Math.sin(game.worldTick * 0.12) * 0.25;
    ctx.fillStyle = bossAlive ? 'rgba(127, 29, 29, 0.35)' : `rgba(246, 204, 104, ${pPulse * 0.55})`;
    ctx.beginPath();
    ctx.ellipse(0, 12, 28, 42, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!bossAlive) {
        ctx.fillStyle = 'rgba(255, 251, 235, 0.8)';
        ctx.beginPath();
        ctx.ellipse(0, 12, 13, 26, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // 7. Koin Emas Suci
    for (const c of coins) {
        const spin = Math.abs(Math.cos(game.worldTick * 0.16 + c.x));
        ctx.fillStyle = '#f6cc68';
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, Math.max(3, 8 * spin), 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 1.4;
        ctx.stroke();
    }

    // 8. Jejak Bayangan Serbuan Perisai (Afterimages)
    for (const ai of afterimages) {
        ctx.save();
        ctx.globalAlpha = (ai.life / ai.maxLife) * 0.45;
        ctx.fillStyle = ai.color;
        ctx.beginPath();
        ctx.roundRect(ai.x, ai.y, ai.w, ai.h, 8);
        ctx.fill();
        ctx.restore();
    }

    // 9. Musuh Zombie & Boss
    for (const en of enemies) {
        if (!en.dead && en.x + en.w > game.cameraX - 120 && en.x < game.cameraX + VIEW_WIDTH + 120) {
            en.draw(ctx);
        }
    }

    // 10. Kesatria Cahaya (Sir Aldric)
    if (player) player.draw(ctx);

    // 11. Proyektil Kesatria (Tombak Suci & Gelombang Cahaya Matahari)
    for (const pp of playerProjectiles) {
        ctx.save();
        ctx.translate(pp.x, pp.y);
        if (pp.kind === 'dawn_wave') {
            ctx.scale(pp.facing, 1);
            ctx.strokeStyle = '#f6cc68';
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.arc(-10, 0, 48, -Math.PI * 0.42, Math.PI * 0.42);
            ctx.stroke();
            ctx.strokeStyle = '#fffbeb';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(-6, 0, 46, -Math.PI * 0.36, Math.PI * 0.36);
            ctx.stroke();
        } else {
            const ang = Math.atan2(pp.vy, pp.vx);
            ctx.rotate(ang);
            // Tombak Suci bercahaya emas-putih
            ctx.fillStyle = pp.burn ? '#fde047' : '#f6cc68';
            ctx.fillRect(-18, -2.2, 30, 4.4);
            ctx.fillStyle = '#fffbeb';
            ctx.beginPath();
            ctx.moveTo(12, -6);
            ctx.lineTo(24, 0);
            ctx.lineTo(12, 6);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    // 12. Proyektil Zombie & Boss
    for (const p of projectiles) {
        ctx.save();
        ctx.fillStyle = p.color || '#84cc16';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(p.x - p.r * 0.25, p.y - p.r * 0.25, p.r * 0.38, 0, Math.PI * 2);
        ctx.fill();
        if (p.kind === 'bomb') {
            ctx.globalAlpha = 0.55;
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r + 4 + Math.sin(game.worldTick * 0.5) * 3, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    // 13. Cincin Kejut (Shock Rings)
    for (const sr of shockRings) {
        const t = 1 - sr.life / sr.maxLife;
        const r = 10 + (sr.maxR - 10) * t;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - t);
        ctx.strokeStyle = sr.color;
        ctx.lineWidth = sr.lineW * (1 - t * 0.5);
        ctx.beginPath();
        ctx.arc(sr.x, sr.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // 14. Halilintar Suci Zig-Zag (Relik II: Segel Petir Suci)
    for (const lb of lightningBolts) {
        ctx.save();
        ctx.globalAlpha = lb.life / lb.maxLife;
        ctx.strokeStyle = lb.color;
        ctx.lineWidth = 5;
        ctx.beginPath();
        lb.pts.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }

    // 15. Partikel Pertempuran
    for (const pt of particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
        ctx.restore();
    }

    // 16. Teks Melayang (Damage / Crit / Perfect Parry)
    ctx.textAlign = 'center';
    for (const ft of floatingTexts) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
        ctx.font = ft.big ? '900 20px "Plus Jakarta Sans", sans-serif' : '800 14px "Plus Jakarta Sans", sans-serif';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.lineWidth = 3.5;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
    }

    ctx.restore(); // tutup kamera
    ctx.restore(); // tutup screenShake

    // 17. Radar Peta Progres Stage 2D di Bawah Layar
    drawStageRadar(ctx, stage);
}

/* ==========================================================================
   ANIMASI CG ENDING 2D: FAJAR KERAJAAN CAHAYA
   ========================================================================== */
function lerpRGB(c1, c2, t) {
    const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
    const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
    const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
    return `rgb(${r},${g},${b})`;
}

function drawEndingCG() {
    const t = Math.min(1, endingCG.frame / endingCG.totalFrames);
    const sunProgress = Math.min(1, Math.max(0, (t - 0.08) / 0.72));

    // Langit berubah dari malam wabah menjadi fajar keemasan
    const topCol = lerpRGB([10, 13, 24], [38, 78, 128], sunProgress);
    const midCol = lerpRGB([28, 22, 34], [218, 126, 56], sunProgress);
    const botCol = lerpRGB([40, 26, 24], [253, 224, 132], sunProgress);
    const grad = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    grad.addColorStop(0, topCol);
    grad.addColorStop(0.55, midCol);
    grad.addColorStop(1, botCol);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    // Matahari Fajar Terbit + Sinar Radiasi & Corona Lembut
    const sunX = VIEW_WIDTH * 0.63;
    const sunY = VIEW_HEIGHT * 0.78 - sunProgress * 265;
    ctx.save();
    const corona = ctx.createRadialGradient(sunX, sunY, 30, sunX, sunY, 260);
    corona.addColorStop(0, 'rgba(255, 251, 235, 0.92)');
    corona.addColorStop(0.32, 'rgba(253, 224, 71, 0.42)');
    corona.addColorStop(1, 'rgba(251, 146, 60, 0)');
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 260, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.24 + sunProgress * 0.36;
    for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2 + endingCG.frame * 0.004;
        ctx.fillStyle = 'rgba(254, 240, 138, 0.22)';
        ctx.beginPath();
        ctx.moveTo(sunX, sunY);
        ctx.lineTo(sunX + Math.cos(ang) * 950, sunY + Math.sin(ang) * 950);
        ctx.lineTo(sunX + Math.cos(ang + 0.12) * 950, sunY + Math.sin(ang + 0.12) * 950);
        ctx.closePath();
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fffbeb';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 52 + sunProgress * 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Siluet Pegunungan Jauh + Kastil Kerajaan Cahaya di Puncak Timur
    ctx.fillStyle = lerpRGB([18, 20, 28], [58, 44, 48], sunProgress);
    ctx.beginPath();
    ctx.moveTo(0, VIEW_HEIGHT);
    ctx.lineTo(0, 485);
    ctx.lineTo(250, 405);
    ctx.lineTo(480, 470);
    ctx.lineTo(750, 392);
    ctx.lineTo(1040, 445);
    ctx.lineTo(VIEW_WIDTH, 412);
    ctx.lineTo(VIEW_WIDTH, VIEW_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Siluet Menara Kastil Kerajaan yang Disucikan (sekitar x = 920..1080)
    ctx.fillStyle = lerpRGB([14, 15, 22], [38, 30, 36], sunProgress);
    ctx.fillRect(940, 372, 110, 85);
    ctx.fillRect(928, 344, 24, 110);
    ctx.fillRect(1038, 348, 24, 108);
    ctx.fillRect(980, 314, 30, 135);
    // Atap Menara Runcing
    const spires = [[940, 344, 16, 36], [995, 314, 20, 48], [1050, 348, 16, 34]];
    for (const [sx, sy, sw, sh] of spires) {
        ctx.beginPath();
        ctx.moveTo(sx - sw, sy);
        ctx.lineTo(sx, sy - sh);
        ctx.lineTo(sx + sw, sy);
        ctx.closePath();
        ctx.fill();
    }

    // Tebing Depan tempat Sir Aldric berdiri menatap Fajar
    ctx.fillStyle = '#121318';
    ctx.beginPath();
    ctx.moveTo(0, VIEW_HEIGHT);
    ctx.lineTo(0, 504);
    ctx.lineTo(395, 492);
    ctx.lineTo(525, 562);
    ctx.lineTo(665, VIEW_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Sir Aldric berdiri gagah dengan Zirah Penuh, Jubah Berkibar, & Excalibur Bercahaya
    ctx.save();
    ctx.translate(295, 494);
    const wave = Math.sin(endingCG.frame * 0.1) * 14;
    // Jubah Merah berlapis
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.moveTo(-8, -76);
    ctx.quadraticCurveTo(-82, -64 + wave * 0.5, -138, -26 + wave);
    ctx.lineTo(-108, -6 + wave * 0.7);
    ctx.quadraticCurveTo(-48, -26, -6, -34);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f6cc68';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-136, -26 + wave);
    ctx.lineTo(-108, -7 + wave * 0.7);
    ctx.stroke();

    // Kaki Greaves Baja
    ctx.fillStyle = '#475569';
    ctx.fillRect(-13, -32, 10, 32);
    ctx.fillRect(3, -32, 10, 32);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-12, -26, 8, 22);
    ctx.fillRect(4, -26, 8, 22);

    // Zirah Dada, Tabard Merah, & Salib Emas
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.roundRect(-15, -78, 30, 48, 5);
    ctx.fill();
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(-6, -74, 12, 42);
    ctx.fillStyle = '#f6cc68';
    ctx.fillRect(-1.5, -70, 3, 24);
    ctx.fillRect(-6, -62, 12, 3);
    // Bahu Pauldron
    ctx.fillStyle = '#f6cc68';
    ctx.beginPath();
    ctx.arc(-14, -72, 9, Math.PI * 0.8, Math.PI * 2.1);
    ctx.arc(14, -72, 9, Math.PI * 0.9, Math.PI * 2.2);
    ctx.fill();

    // Greathelm Emas + Visor + Jambul Merah Berkibar
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(-4, -102);
    ctx.quadraticCurveTo(-38, -114 + wave * 0.3, -58, -90 + wave * 0.4);
    ctx.lineTo(-12, -88);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f6cc68';
    ctx.beginPath();
    ctx.roundRect(-12, -104, 24, 25, 6);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, -94, 12, 5);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(3, -93, 8, 2.5);

    // Excalibur Fajar tertancap di batu dengan aura emas menyala
    const swGlow = ctx.createRadialGradient(34, -36, 4, 34, -36, 42);
    swGlow.addColorStop(0, 'rgba(254, 240, 138, 0.52)');
    swGlow.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = swGlow;
    ctx.beginPath();
    ctx.arc(34, -36, 42, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fffbeb';
    ctx.fillRect(31, -56, 6, 56);
    ctx.fillStyle = '#d9a03b';
    ctx.fillRect(19, -60, 30, 6);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(31.5, -74, 5, 14);
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(34, -76, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Kawanan Merpati Putih terbang melintasi langit fajar
    ctx.strokeStyle = '#fffbeb';
    ctx.lineWidth = 2.4;
    for (const b of endingCG.birds) {
        const flap = Math.sin(endingCG.frame * 0.22 + b.phase) * 7;
        ctx.beginPath();
        ctx.moveTo(b.x - 10, b.y + flap);
        ctx.quadraticCurveTo(b.x - 4, b.y - 5, b.x, b.y);
        ctx.quadraticCurveTo(b.x + 4, b.y - 5, b.x + 10, b.y + flap);
        ctx.stroke();
    }

    // Serbuk Cahaya Emas naik ke angkasa
    for (const em of endingCG.embers) {
        ctx.fillStyle = `rgba(254, 240, 138, ${em.alpha})`;
        ctx.beginPath();
        ctx.arc(em.x, em.y, em.size, 0, Math.PI * 2);
        ctx.fill();
    }
}
