/* ==========================================================================
   RENDERER 2.5D MEDAN PERANG BENTENG: LANGIT DINAMIS, KASTIL, KAVALERI, & CG
   ========================================================================== */

const CLOUDS = Array.from({ length: 9 }, (_, i) => ({
    x: i * 240,
    y: 55 + (i % 4) * 44,
    w: 170 + (i % 3) * 65,
    h: 34 + (i % 2) * 16,
    spd: 0.18 + (i % 3) * 0.1
}));

const WEATHER_PTS = Array.from({ length: 42 }, (_, i) => ({
    x: (i * 89) % VIEW_WIDTH,
    y: (i * 61) % VIEW_HEIGHT,
    sz: 1.6 + (i % 3) * 1.1,
    ph: i * 0.8
}));

function drawSkyLayer(ctx, cfg) {
    const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0, cfg.skyTop);
    g.addColorStop(0.56, cfg.skyMid);
    g.addColorStop(1, cfg.skyBot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    // Kilatan petir badai sesekali
    if (game.lightningFlash > 0) {
        ctx.fillStyle = `rgba(224, 242, 254, ${game.lightningFlash * 0.045})`;
        ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    }

    // Bintang langit atas
    ctx.fillStyle = 'rgba(255, 251, 235, 0.42)';
    for (let i = 0; i < 32; i++) {
        const sx = (i * 197 + cfg.night * 53) % VIEW_WIDTH;
        const sy = 18 + ((i * 73) % 210);
        const tw = (i % 4 === 0) ? 2 : 1.2;
        ctx.fillRect(sx, sy, tw, tw);
    }

    // Bulan Purnama / Bulan Darah / Gerhana Emas dengan Corona Radial Halus
    const mx = VIEW_WIDTH - 230;
    const my = 142;
    const isEclipse = cfg.moonType === 'eclipse' || cfg.moonType === 'eclipse_gold';
    const halo = ctx.createRadialGradient(mx, my, 36, mx, my, 165);
    halo.addColorStop(0, cfg.moonColor);
    halo.addColorStop(0.4, 'rgba(248, 210, 116, 0.14)');
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.save();
    ctx.globalAlpha = isEclipse ? 0.58 : 0.36;
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(mx, my, 165, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = isEclipse ? 0.96 : 0.78;
    ctx.fillStyle = cfg.moonColor;
    ctx.beginPath();
    ctx.arc(mx, my, 54, 0, Math.PI * 2);
    ctx.fill();

    if (isEclipse) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#07080d';
        ctx.beginPath();
        ctx.arc(mx, my, 46, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = cfg.moonType === 'eclipse_gold' ? '#fde047' : '#f87171';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.arc(mx, my, 48, 0, Math.PI * 2);
        ctx.stroke();
    } else {
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(mx - 15, my - 11, 11, 0, Math.PI * 2);
        ctx.arc(mx + 16, my + 8, 14, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // Awan Volumetrik Berlapis Bergerak Perlahan
    ctx.save();
    ctx.fillStyle = 'rgba(12, 14, 22, 0.34)';
    for (const c of CLOUDS) {
        if (game.state === 'playing' || game.state === 'start') {
            c.x -= c.spd;
            if (c.x + c.w < -60) c.x = VIEW_WIDTH + 90;
        }
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.w * 0.5, c.h * 0.65, 0, 0, Math.PI * 2);
        ctx.ellipse(c.x - c.w * 0.28, c.y + 8, c.w * 0.32, c.h * 0.5, 0, 0, Math.PI * 2);
        ctx.ellipse(c.x + c.w * 0.28, c.y + 7, c.w * 0.34, c.h * 0.52, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawHorizonAndCathedralBg(ctx) {
    ctx.save();
    // Pegunungan Jauh (Parallax 0.2)
    ctx.fillStyle = 'rgba(14, 15, 22, 0.66)';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    for (let x = 0; x <= VIEW_WIDTH + 160; x += 160) {
        const wx = x + game.cameraX * 0.2;
        const h = 110 + Math.sin(wx * 0.0055) * 65 + Math.cos(wx * 0.013) * 32;
        ctx.lineTo(x, GROUND_Y - h);
    }
    ctx.lineTo(VIEW_WIDTH, GROUND_Y);
    ctx.closePath();
    ctx.fill();

    // Siluet Pemakaman & Pohon Mati Menengah (Parallax 0.48)
    for (let i = 0; i < 12; i++) {
        const px = 260 + i * 190 - game.cameraX * 0.48;
        if (px < -120 || px > VIEW_WIDTH + 120) continue;
        ctx.fillStyle = 'rgba(12, 13, 19, 0.78)';
        if (i % 3 === 0) {
            // Pohon Willow Mati Bercabang
            ctx.fillRect(px, GROUND_Y - 175, 16, 175);
            ctx.beginPath();
            ctx.moveTo(px + 8, GROUND_Y - 145);
            ctx.lineTo(px - 42, GROUND_Y - 195);
            ctx.lineTo(px - 34, GROUND_Y - 203);
            ctx.lineTo(px + 8, GROUND_Y - 160);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(px + 8, GROUND_Y - 130);
            ctx.lineTo(px + 60, GROUND_Y - 175);
            ctx.lineTo(px + 52, GROUND_Y - 183);
            ctx.lineTo(px + 8, GROUND_Y - 144);
            ctx.fill();
        } else if (i % 3 === 1) {
            // Reruntuhan Menara Biara Jauh
            ctx.fillRect(px, GROUND_Y - 155, 58, 155);
            ctx.beginPath();
            ctx.moveTo(px - 6, GROUND_Y - 155);
            ctx.lineTo(px + 29, GROUND_Y - 210);
            ctx.lineTo(px + 64, GROUND_Y - 155);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(248, 210, 116, 0.16)';
            ctx.beginPath();
            ctx.arc(px + 29, GROUND_Y - 102, 11, Math.PI, 0);
            ctx.lineTo(px + 40, GROUND_Y - 72);
            ctx.lineTo(px + 18, GROUND_Y - 72);
            ctx.closePath();
            ctx.fill();
        } else {
            // Batu Nisan Salib Pemakaman
            ctx.fillRect(px + 14, GROUND_Y - 72, 34, 72);
            ctx.beginPath();
            ctx.arc(px + 31, GROUND_Y - 72, 17, Math.PI, 0);
            ctx.fill();
            ctx.fillStyle = 'rgba(214, 156, 53, 0.22)';
            ctx.fillRect(px + 29, GROUND_Y - 60, 4, 24);
            ctx.fillRect(px + 22, GROUND_Y - 52, 18, 4);
        }
    }

    // Kabut Bawah Cakrawala Lembut
    const mist = ctx.createLinearGradient(0, GROUND_Y - 110, 0, GROUND_Y);
    mist.addColorStop(0, 'rgba(0, 0, 0, 0)');
    mist.addColorStop(1, 'rgba(22, 26, 30, 0.45)');
    ctx.fillStyle = mist;
    ctx.fillRect(0, GROUND_Y - 110, VIEW_WIDTH, 110);
    ctx.restore();
}

function drawCitadelFortress(ctx) {
    // Benteng Kerajaan Cahaya di Sisi Kiri Medan Perang (x = -40 .. GATE_X)
    const gateRatio = Math.max(0, game.gateHp / Math.max(1, game.gateMaxHp));

    ctx.save();
    // Menara Katedral Belakang Benteng dengan Kaca Patri Mawar Menyala
    ctx.fillStyle = '#1b1d26';
    ctx.fillRect(-20, 110, 170, GROUND_Y - 110);
    ctx.beginPath();
    ctx.moveTo(-28, 110);
    ctx.lineTo(65, 20);
    ctx.lineTo(158, 110);
    ctx.closePath();
    ctx.fill();
    // Kaca Patri Mawar Emas
    const roseGrad = ctx.createRadialGradient(65, 195, 4, 65, 195, 36);
    roseGrad.addColorStop(0, '#fef08a');
    roseGrad.addColorStop(0.55, '#d97706');
    roseGrad.addColorStop(1, '#451a03');
    ctx.fillStyle = roseGrad;
    ctx.beginPath();
    ctx.arc(65, 195, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1b1d26';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(65, 165); ctx.lineTo(65, 225);
    ctx.moveTo(35, 195); ctx.lineTo(95, 195);
    ctx.stroke();

    // Ketapel Api Benteng (Jika Berkah Trebuchet Aktif!)
    if (getBlessingLevel('trebuchet') > 0) {
        ctx.save();
        ctx.translate(105, 345);
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-26, 0); ctx.lineTo(0, -48); ctx.lineTo(26, 0);
        ctx.stroke();
        const armAng = game.trebuchetAnim > 0 ? -0.95 : 0.45;
        ctx.rotate(armAng);
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-26, -24); ctx.lineTo(44, -44);
        ctx.stroke();
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(44, -44, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Dinding Benteng Utama & Parapet Crenellation
    const wallGrad = ctx.createLinearGradient(0, 340, GATE_X, 340);
    wallGrad.addColorStop(0, '#262934');
    wallGrad.addColorStop(1, '#3a3e4d');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(-20, 345, GATE_X + 20, GROUND_Y - 345);

    // Tekstur batu blok dinding benteng
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.lineWidth = 1.4;
    for (let y = 375; y < GROUND_Y; y += 34) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(GATE_X, y);
        ctx.stroke();
    }
    // Gigi Tembok Benteng (Merlons)
    ctx.fillStyle = '#474c5e';
    for (let bx = 0; bx < GATE_X; bx += 36) {
        ctx.fillRect(bx, 324, 22, 24);
    }

    // Panji Merah-Emas Kerajaan Berkibar di Dinding Benteng
    const bWave = Math.sin(game.worldTick * 0.1) * 5;
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.moveTo(155, 365);
    ctx.lineTo(188, 365);
    ctx.lineTo(188 + bWave, 442);
    ctx.lineTo(172 + bWave, 428);
    ctx.lineTo(155 + bWave * 0.6, 442);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f8d274';
    ctx.fillRect(169, 378, 4, 32);
    ctx.fillRect(161, 388, 20, 4);

    // GERBANG BENTENG EK & BESI (Sasaran Zombie!)
    const gShake = game.gateHitFlash > 0 ? (Math.random() - 0.5) * 5 : 0;
    ctx.save();
    ctx.translate(gShake, 0);
    ctx.fillStyle = game.gateHitFlash > 0 ? '#7f1d1d' : '#4a2c18';
    ctx.beginPath();
    ctx.roundRect(GATE_X - 42, GROUND_Y - 134, 44, 134, [20, 4, 0, 0]);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4;
    ctx.stroke();
    // Pita Besi & Paku Keling Gerbang
    ctx.fillStyle = '#334155';
    ctx.fillRect(GATE_X - 40, GROUND_Y - 102, 42, 8);
    ctx.fillRect(GATE_X - 40, GROUND_Y - 56, 42, 8);
    // Retakan gerbang jika HP < 65%
    if (gateRatio < 0.65) {
        ctx.strokeStyle = '#090a0d';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(GATE_X - 10, GROUND_Y - 110);
        ctx.lineTo(GATE_X - 24, GROUND_Y - 78);
        ctx.lineTo(GATE_X - 14, GROUND_Y - 40);
        ctx.stroke();
    }
    ctx.restore();

    // Pemanah Kerajaan (Allied Archers) berjaga di atas Parapet!
    const archerCount = game.allies.archers;
    for (let i = 0; i < archerCount; i++) {
        const ax = Math.max(24, GATE_X - 28 - i * 36);
        const ay = 345;
        // Tubuh pemanah
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(ax - 7, ay - 26, 14, 24);
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(ax, ay - 32, 7, 0, Math.PI * 2);
        ctx.fill();
        // Busur Emas
        ctx.strokeStyle = '#f8d274';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(ax + 8, ay - 20, 11, -Math.PI * 0.45, Math.PI * 0.45);
        ctx.stroke();
    }

    ctx.restore();
}

function drawCourtyardAndProps(ctx) {
    // 1. Pagar Besi Kuburan Latar Belakang di Sepanjang Jalan
    ctx.save();
    ctx.strokeStyle = 'rgba(20, 22, 28, 0.86)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(GATE_X, GROUND_Y - 34);
    ctx.lineTo(WORLD_WIDTH, GROUND_Y - 34);
    ctx.stroke();
    for (let fx = GATE_X + 24; fx < WORLD_WIDTH; fx += 28) {
        if (fx < game.cameraX - 40 || fx > game.cameraX + VIEW_WIDTH + 40) continue;
        ctx.beginPath();
        ctx.moveTo(fx, GROUND_Y);
        ctx.lineTo(fx, GROUND_Y - 46);
        ctx.stroke();
    }
    ctx.restore();

    // 2. Platform Menara Kayu & Jembatan Batu (dengan Tiang Penopang Realistis!)
    for (const p of ARENA_PLATFORMS) {
        if (p.x + p.w < game.cameraX - 60 || p.x > game.cameraX + VIEW_WIDTH + 60) continue;
        if (p.style === 'wood') {
            // Tiang penyangga kayu silang
            ctx.strokeStyle = '#3b2415';
            ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.moveTo(p.x + 18, p.y + p.h); ctx.lineTo(p.x + 18, GROUND_Y);
            ctx.moveTo(p.x + p.w - 18, p.y + p.h); ctx.lineTo(p.x + p.w - 18, GROUND_Y);
            ctx.lineWidth = 4;
            ctx.moveTo(p.x + 18, p.y + p.h + 10); ctx.lineTo(p.x + p.w - 18, GROUND_Y - 10);
            ctx.moveTo(p.x + p.w - 18, p.y + p.h + 10); ctx.lineTo(p.x + 18, GROUND_Y - 10);
            ctx.stroke();
            // Papan kayu atas
            ctx.fillStyle = '#5c3822';
            ctx.fillRect(p.x, p.y, p.w, p.h);
            ctx.fillStyle = '#855331';
            ctx.fillRect(p.x, p.y, p.w, 6);
        } else {
            // Pilar batu lengkung gotik
            ctx.fillStyle = '#252832';
            ctx.fillRect(p.x + 16, p.y + p.h, 28, GROUND_Y - (p.y + p.h));
            ctx.fillRect(p.x + p.w - 44, p.y + p.h, 28, GROUND_Y - (p.y + p.h));
            ctx.fillStyle = '#363b47';
            ctx.fillRect(p.x, p.y, p.w, p.h);
            ctx.fillStyle = '#64748b';
            ctx.fillRect(p.x, p.y, p.w, 6);
        }
    }

    // 3. Obor Besi & Cahaya Api Additive ('lighter') di Sepanjang Halaman!
    for (let tx = GATE_X + 120; tx < WORLD_WIDTH - 100; tx += 340) {
        if (tx < game.cameraX - 110 || tx > game.cameraX + VIEW_WIDTH + 110) continue;
        const fl = Math.sin(game.worldTick * 0.25 + tx * 0.04) * 4;
        ctx.fillStyle = '#262322';
        ctx.fillRect(tx - 3.5, GROUND_Y - 58, 7, 58);
        ctx.fillStyle = '#44403c';
        ctx.fillRect(tx - 12, GROUND_Y - 62, 24, 7);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const glow = ctx.createRadialGradient(tx, GROUND_Y - 66, 4, tx, GROUND_Y - 66, 98 + fl);
        glow.addColorStop(0, 'rgba(251, 146, 60, 0.34)');
        glow.addColorStop(0.5, 'rgba(234, 88, 12, 0.1)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(tx, GROUND_Y - 66, 98 + fl, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(tx - 9, GROUND_Y - 62);
        ctx.quadraticCurveTo(tx, GROUND_Y - 88 - fl, tx + 9, GROUND_Y - 62);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(tx - 4.5, GROUND_Y - 62);
        ctx.quadraticCurveTo(tx, GROUND_Y - 76 - fl * 0.6, tx + 4.5, GROUND_Y - 62);
        ctx.fill();
    }

    // 4. Jalan Batu Cobblestone 2.5D
    const roadGrad = ctx.createLinearGradient(0, GROUND_Y, 0, VIEW_HEIGHT);
    roadGrad.addColorStop(0, '#36363d');
    roadGrad.addColorStop(0.14, '#24242a');
    roadGrad.addColorStop(1, '#101116');
    ctx.fillStyle = roadGrad;
    ctx.fillRect(0, GROUND_Y, WORLD_WIDTH, VIEW_HEIGHT - GROUND_Y);

    // Batu Ubin Perspektif & Sorotan Tepi Jalan
    ctx.fillStyle = '#52525b';
    ctx.fillRect(0, GROUND_Y, WORLD_WIDTH, 5);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.lineWidth = 1.4;
    for (let sx = 0; sx < WORLD_WIDTH; sx += 56) {
        if (sx < game.cameraX - 60 || sx > game.cameraX + VIEW_WIDTH + 60) continue;
        ctx.strokeRect(sx, GROUND_Y + 5, 56, 22);
        ctx.strokeRect(sx + 24, GROUND_Y + 27, 56, 26);
    }

    // 5. Tong Minyak Peledak (Explosive Oil Barrels)
    for (const b of barrels) {
        if (b.exploded) continue;
        ctx.fillStyle = '#7c2d12';
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, 7);
        ctx.fill();
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2.4;
        ctx.stroke();
        // Pita besi hitam & ikon api kuning
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(b.x, b.y + 10, b.w, 6);
        ctx.fillRect(b.x, b.y + b.h - 16, b.w, 6);
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(b.x + b.w / 2, b.y + 18);
        ctx.lineTo(b.x + b.w / 2 + 7, b.y + 31);
        ctx.lineTo(b.x + b.w / 2 - 7, b.y + 31);
        ctx.closePath();
        ctx.fill();
    }

    // 6. Cakar Kubur Nekromanser (Grave-Hands)
    for (const gh of graveHands) {
        if (gh.timer > 16) {
            // Lingkaran peringatan hijau menyala di tanah
            const pulse = 0.4 + Math.sin(gh.timer * 0.5) * 0.35;
            ctx.strokeStyle = `rgba(45, 212, 191, ${pulse})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(gh.x, GROUND_Y - 2, 30, 9, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            // Cakar tengkorak mencuat ke atas!
            const h = Math.sin((16 - gh.timer) / 16 * Math.PI) * 76;
            ctx.fillStyle = '#2dd4bf';
            ctx.fillRect(gh.x - 10, GROUND_Y - h, 7, h);
            ctx.fillRect(gh.x + 2, GROUND_Y - h * 0.9, 7, h * 0.9);
            ctx.fillStyle = '#e7e5e4';
            ctx.beginPath();
            ctx.moveTo(gh.x - 14, GROUND_Y - h);
            ctx.lineTo(gh.x - 6, GROUND_Y - h - 18);
            ctx.lineTo(gh.x + 12, GROUND_Y - h - 14);
            ctx.lineTo(gh.x + 14, GROUND_Y - h);
            ctx.closePath();
            ctx.fill();
        }
    }
}

function drawCavalryRiders(ctx) {
    for (const r of cavalryRiders) {
        const gallop = Math.sin(game.worldTick * 0.45 + r.phase) * 7;
        ctx.save();
        ctx.translate(r.x + r.w / 2, r.y + r.h);

        // Aura Cahaya Spektral Emas (Additive!)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const aura = ctx.createRadialGradient(0, -40, 8, 0, -40, 74);
        aura.addColorStop(0, 'rgba(254, 240, 138, 0.52)');
        aura.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, -40, 74, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Kuda Perang Berzirah Emas
        ctx.fillStyle = 'rgba(254, 240, 138, 0.92)';
        ctx.beginPath();
        ctx.roundRect(-36, -50 + gallop * 0.3, 66, 26, 10);
        ctx.fill();
        // Leher & Kepala Kuda
        ctx.beginPath();
        ctx.moveTo(18, -46 + gallop * 0.3);
        ctx.lineTo(40, -70 + gallop * 0.2);
        ctx.lineTo(52, -56 + gallop * 0.2);
        ctx.lineTo(30, -34 + gallop * 0.3);
        ctx.closePath();
        ctx.fill();
        // Kaki Kuda Berderap
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-26, -26); ctx.lineTo(-34 - gallop, 0);
        ctx.moveTo(20, -26); ctx.lineTo(32 + gallop, 0);
        ctx.stroke();

        // Kesatria Kavaleri + Tombak Panjang Berapi
        ctx.fillStyle = '#fffbeb';
        ctx.fillRect(-10, -78 + gallop * 0.3, 20, 32);
        ctx.beginPath();
        ctx.arc(0, -86 + gallop * 0.3, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(-8, -74); ctx.lineTo(-48, -62 + gallop); ctx.lineTo(-36, -48 + gallop); ctx.closePath();
        ctx.fill();
        // Tombak Kavaleri
        ctx.fillStyle = '#fde047';
        ctx.fillRect(0, -68 + gallop * 0.3, 76, 5);

        ctx.restore();
    }
}

function drawWeatherAndForeground(ctx, cfg) {
    // Partikel Cuaca
    ctx.save();
    const w = cfg.weather || 'mist';
    const col = w === 'storm'
        ? 'rgba(147, 197, 253, 0.44)'
        : (w === 'snow' ? 'rgba(224, 242, 254, 0.65)' : (w === 'ember' ? 'rgba(251, 146, 60, 0.55)' : (w === 'spore' ? 'rgba(163, 230, 53, 0.44)' : 'rgba(248, 210, 116, 0.4)')));
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;

    for (const pt of WEATHER_PTS) {
        if (w === 'storm') { pt.x -= 4.6; pt.y += 12; }
        else if (w === 'ember') { pt.x += Math.sin(game.worldTick * 0.03 + pt.ph) * 0.8; pt.y -= 1.6; }
        else if (w === 'snow') { pt.x += Math.sin(game.worldTick * 0.03 + pt.ph) * 0.8 - 0.5; pt.y += 1.5; }
        else { pt.x -= 0.45; pt.y += Math.sin(game.worldTick * 0.02 + pt.ph) * 0.3; }

        if (pt.x < -10) pt.x = VIEW_WIDTH + 8;
        if (pt.x > VIEW_WIDTH + 10) pt.x = -8;
        if (pt.y < -10) pt.y = VIEW_HEIGHT + 8;
        if (pt.y > VIEW_HEIGHT + 10) pt.y = -8;

        if (w === 'storm') {
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y);
            ctx.lineTo(pt.x - 5, pt.y + 14);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.sz, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();

    // Siluet Depan Rumput & Pagar Bawah (Parallax 1.25 — Efek Kedalaman 2.5D!)
    ctx.save();
    ctx.fillStyle = 'rgba(7, 8, 12, 0.72)';
    for (let i = 0; i < 16; i++) {
        const fx = ((i * 145 - game.cameraX * 1.25) % (VIEW_WIDTH + 180) + (VIEW_WIDTH + 180)) % (VIEW_WIDTH + 180) - 60;
        ctx.beginPath();
        ctx.moveTo(fx, VIEW_HEIGHT);
        ctx.lineTo(fx + 10, VIEW_HEIGHT - 30 - (i % 3) * 10);
        ctx.lineTo(fx + 22, VIEW_HEIGHT);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();

    // Vignette Merah Halus saat Sir Aldric / Gerbang Terkena Serangan
    if (game.hurtVignette > 0) {
        const a = (game.hurtVignette / 18) * 0.34;
        const vg = ctx.createRadialGradient(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, 260, VIEW_WIDTH / 2, VIEW_HEIGHT / 2, 720);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, `rgba(185, 28, 28, ${a})`);
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    }
}

function drawGame() {
    const cfg = getNightConfig(game.night);
    drawSkyLayer(ctx, cfg);
    drawHorizonAndCathedralBg(ctx);

    ctx.save();
    if (game.screenShake > 0) {
        ctx.translate(
            (Math.random() - 0.5) * game.screenShake * 2,
            (Math.random() - 0.5) * game.screenShake * 2
        );
    }

    ctx.save();
    ctx.translate(-Math.round(game.cameraX), 0);

    drawCitadelFortress(ctx);
    drawCourtyardAndProps(ctx);

    // Koin Emas
    for (const c of coins) {
        const sp = Math.abs(Math.cos(game.worldTick * 0.16 + c.x));
        ctx.fillStyle = '#f8d274';
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, Math.max(3, 8 * sp), 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 1.4;
        ctx.stroke();
    }

    // Sekutu Pengawal Benteng
    for (const al of allies) al.draw(ctx);

    // Gerombolan Zombie & Boss
    for (const z of zombies) {
        if (!z.dead && z.x + z.w > game.cameraX - 150 && z.x < game.cameraX + VIEW_WIDTH + 150) {
            z.draw(ctx);
        }
    }

    // Sir Aldric — Kesatria Benteng
    if (knight) knight.draw(ctx);

    // Barisan Kavaleri Fajar!
    drawCavalryRiders(ctx);

    // Proyektil Pahlawan (Palu Boomerang Berputar, Panah Api Pemanah, Batu Ketapel, Gelombang Api, Panah Pantul!)
    for (const hp of heroProjectiles) {
        ctx.save();
        ctx.translate(hp.x, hp.y);
        if (hp.kind === 'boomerang_hammer') {
            ctx.rotate(hp.spin);
            // Aura putaran emas
            ctx.strokeStyle = 'rgba(253, 224, 71, 0.45)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, 22, 0, Math.PI * 2);
            ctx.stroke();
            // Gagang & Kepala Palu Perang Suci
            ctx.fillStyle = '#78350f';
            ctx.fillRect(-3.5, -18, 7, 36);
            ctx.fillStyle = '#f8d274';
            ctx.fillRect(-14, -20, 28, 13);
            ctx.strokeStyle = '#fffbeb';
            ctx.lineWidth = 1.6;
            ctx.strokeRect(-14, -20, 28, 13);
        } else if (hp.kind === 'arrow') {
            ctx.rotate(Math.atan2(hp.vy, hp.vx));
            ctx.fillStyle = '#f97316';
            ctx.fillRect(-16, -2, 26, 4);
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.moveTo(10, -5); ctx.lineTo(20, 0); ctx.lineTo(10, 5); ctx.closePath();
            ctx.fill();
        } else if (hp.kind === 'boulder') {
            ctx.fillStyle = '#44403c';
            ctx.beginPath();
            ctx.arc(0, 0, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 4;
            ctx.stroke();
        } else if (hp.kind === 'flame_wave') {
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.moveTo(-20, 24);
            ctx.quadraticCurveTo(0, -34, 20, 24);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.moveTo(-10, 24);
            ctx.quadraticCurveTo(0, -14, 10, 24);
            ctx.closePath();
            ctx.fill();
        } else {
            // Panah pantulan Parry Emas!
            ctx.rotate(Math.atan2(hp.vy, hp.vx));
            ctx.fillStyle = '#fde047';
            ctx.fillRect(-18, -3, 30, 6);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(12, -7); ctx.lineTo(24, 0); ctx.lineTo(12, 7); ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    // Proyektil Musuh (Panah Crossbow & Bola Mantra)
    for (const ep of enemyProjectiles) {
        ctx.save();
        ctx.fillStyle = ep.color || '#a3e635';
        ctx.beginPath();
        ctx.arc(ep.x, ep.y, ep.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(ep.x - 2, ep.y - 2, ep.r * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Shock Rings, Petir Langit, Partikel, & Teks Combat
    for (const sr of shockRings) {
        const t = 1 - sr.life / sr.maxLife;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - t);
        ctx.strokeStyle = sr.color;
        ctx.lineWidth = sr.lineW * (1 - t * 0.5);
        ctx.beginPath();
        ctx.arc(sr.x, sr.y, 12 + (sr.maxR - 12) * t, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    for (const lb of lightningBolts) {
        ctx.save();
        ctx.globalAlpha = lb.life / lb.maxLife;
        ctx.strokeStyle = lb.color;
        ctx.lineWidth = 6;
        ctx.beginPath();
        lb.pts.forEach((p, idx) => idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.4;
        ctx.stroke();
        ctx.restore();
    }
    for (const pt of particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
        ctx.restore();
    }
    ctx.textAlign = 'center';
    for (const ft of floatingTexts) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
        ctx.font = ft.big ? '900 20px "Plus Jakarta Sans", sans-serif' : '800 14px "Plus Jakarta Sans", sans-serif';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.88)';
        ctx.lineWidth = 3.5;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
    }

    ctx.restore(); // tutup kamera
    ctx.restore(); // tutup shake

    drawWeatherAndForeground(ctx, cfg);
}

/* ==========================================================================
   ANIMASI CG ENDING: FAJAR DI ATAS BENTENG CAHAYA
   ========================================================================== */
function lerpRGB(c1, c2, t) {
    return `rgb(${Math.round(c1[0] + (c2[0] - c1[0]) * t)},${Math.round(c1[1] + (c2[1] - c1[1]) * t)},${Math.round(c1[2] + (c2[2] - c1[2]) * t)})`;
}

function drawEndingCG() {
    const t = Math.min(1, endingCG.frame / endingCG.totalFrames);
    const sun = Math.min(1, Math.max(0, (t - 0.06) / 0.72));

    const grad = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    grad.addColorStop(0, lerpRGB([14, 18, 32], [44, 90, 148], sun));
    grad.addColorStop(0.54, lerpRGB([36, 26, 36], [226, 134, 62], sun));
    grad.addColorStop(1, lerpRGB([46, 30, 26], [254, 232, 148], sun));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    const sx = VIEW_WIDTH * 0.7;
    const sy = VIEW_HEIGHT * 0.76 - sun * 260;
    const corona = ctx.createRadialGradient(sx, sy, 28, sx, sy, 270);
    corona.addColorStop(0, 'rgba(255, 251, 235, 0.95)');
    corona.addColorStop(0.35, 'rgba(253, 224, 71, 0.45)');
    corona.addColorStop(1, 'rgba(251, 146, 60, 0)');
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(sx, sy, 270, 0, Math.PI * 2);
    ctx.fill();

    // Sinar Fajar Radiasi
    ctx.save();
    ctx.globalAlpha = 0.22 + sun * 0.34;
    for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2 + endingCG.frame * 0.004;
        ctx.fillStyle = 'rgba(254, 240, 138, 0.22)';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(ang) * 950, sy + Math.sin(ang) * 950);
        ctx.lineTo(sx + Math.cos(ang + 0.12) * 950, sy + Math.sin(ang + 0.12) * 950);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();

    ctx.fillStyle = '#fffbeb';
    ctx.beginPath();
    ctx.arc(sx, sy, 54 + sun * 16, 0, Math.PI * 2);
    ctx.fill();

    // Siluet Perbukitan Fajar
    ctx.fillStyle = lerpRGB([18, 19, 26], [46, 38, 44], sun);
    ctx.beginPath();
    ctx.moveTo(0, VIEW_HEIGHT);
    ctx.lineTo(0, 495);
    ctx.lineTo(420, 472);
    ctx.lineTo(840, 520);
    ctx.lineTo(VIEW_WIDTH, 472);
    ctx.lineTo(VIEW_WIDTH, VIEW_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Benteng Kerajaan Cahaya Berdetail (Crenellations, Rose Window, Panji Berkibar, Gerbang)
    const wave = Math.sin(endingCG.frame * 0.1) * 12;
    ctx.fillStyle = '#181a24';
    ctx.fillRect(72, 290, 210, 250);
    ctx.fillRect(132, 170, 90, 130);
    ctx.beginPath();
    ctx.moveTo(116, 170); ctx.lineTo(177, 94); ctx.lineTo(238, 170); ctx.closePath();
    ctx.fill();
    // Gigi Tembok Benteng
    for (let bx = 72; bx <= 258; bx += 30) ctx.fillRect(bx, 272, 18, 22);
    // Kaca Patri Mawar Emas
    const cgRose = ctx.createRadialGradient(177, 226, 4, 177, 226, 26);
    cgRose.addColorStop(0, '#fef08a');
    cgRose.addColorStop(1, '#b45309');
    ctx.fillStyle = cgRose;
    ctx.beginPath();
    ctx.arc(177, 226, 22, 0, Math.PI * 2);
    ctx.fill();
    // Panji Kerajaan Berkibar
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.moveTo(106, 314); ctx.lineTo(134, 314); ctx.lineTo(134 + wave * 0.4, 384); ctx.lineTo(120 + wave * 0.4, 370); ctx.lineTo(106 + wave * 0.3, 384); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f8d274';
    ctx.fillRect(118, 326, 4, 28); ctx.fillRect(111, 335, 18, 4);
    // Gerbang Benteng Utuh
    ctx.fillStyle = '#4a2c18';
    ctx.beginPath();
    ctx.roundRect(150, 444, 54, 96, [24, 24, 0, 0]);
    ctx.fill();

    // Sir Aldric berdiri gagah dengan Zirah Penuh, Tabard Salib, Greathelm, & Greatsword Bercahaya
    ctx.save();
    ctx.translate(455, 520);
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.moveTo(-8, -76);
    ctx.quadraticCurveTo(-82, -62 + wave * 0.5, -138, -24 + wave);
    ctx.lineTo(-106, -6 + wave * 0.7);
    ctx.quadraticCurveTo(-48, -26, -6, -34);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f8d274';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-136, -24 + wave); ctx.lineTo(-106, -7 + wave * 0.7); ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.fillRect(-13, -32, 10, 32);
    ctx.fillRect(3, -32, 10, 32);
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath(); ctx.roundRect(-15, -78, 30, 48, 5); ctx.fill();
    ctx.fillStyle = '#7f1d1d'; ctx.fillRect(-6, -74, 12, 42);
    ctx.fillStyle = '#f8d274'; ctx.fillRect(-1.5, -70, 3, 24); ctx.fillRect(-6, -62, 12, 3);
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(-4, -102); ctx.quadraticCurveTo(-36, -114 + wave * 0.3, -58, -90 + wave * 0.4); ctx.lineTo(-12, -88); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f8d274';
    ctx.beginPath(); ctx.roundRect(-12, -104, 24, 25, 6); ctx.fill();
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, -94, 12, 5);
    ctx.fillStyle = '#fef08a'; ctx.fillRect(3, -93, 8, 2.5);
    // Greatsword tertancap bercahaya
    const sg = ctx.createRadialGradient(34, -34, 4, 34, -34, 42);
    sg.addColorStop(0, 'rgba(254, 240, 138, 0.52)');
    sg.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(34, -34, 42, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fffbeb'; ctx.fillRect(31, -56, 6, 56);
    ctx.fillStyle = '#d69c35'; ctx.fillRect(18, -60, 32, 6);
    ctx.fillStyle = '#78350f'; ctx.fillRect(31.5, -74, 5, 14);
    ctx.restore();

    // Kawanan merpati putih & serbuk fajar
    ctx.strokeStyle = '#fffbeb';
    ctx.lineWidth = 2.4;
    for (const b of endingCG.birds) {
        const fl = Math.sin(endingCG.frame * 0.22 + b.phase) * 7;
        ctx.beginPath();
        ctx.moveTo(b.x - 10, b.y + fl);
        ctx.quadraticCurveTo(b.x - 4, b.y - 5, b.x, b.y);
        ctx.quadraticCurveTo(b.x + 4, b.y - 5, b.x + 10, b.y + fl);
        ctx.stroke();
    }
}
