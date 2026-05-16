import { TOPPING_MAP } from "./toppings.js";

const TAU = Math.PI * 2;

// --- 背景の木目テーブル ---
export function drawTable(ctx, w, h) {
  const grad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, Math.max(w, h));
  grad.addColorStop(0, "#5e3a1c");
  grad.addColorStop(0.6, "#3a2110");
  grad.addColorStop(1, "#1a0e06");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  // 木目ライン（決定的に擬似ランダム）
  ctx.strokeStyle = "rgba(255,220,180,0.04)";
  ctx.lineWidth = 1;
  let s = 12345;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < 40; i++) {
    const y = rnd() * h;
    const amp = 4 + rnd() * 14;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 30) {
      ctx.lineTo(x, y + Math.sin(x * 0.013 + rnd() * 5) * amp);
    }
    ctx.stroke();
  }
}

// --- 大皿 ---
export function drawMainPlate(ctx, cx, cy, plateR) {
  // 落ち影
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.ellipse(cx + 6, cy + plateR * 0.6, plateR * 1.04, plateR * 0.32, 0, 0, TAU);
  ctx.fill();
  // 皿（白磁）
  const grad = ctx.createRadialGradient(cx - plateR * 0.4, cy - plateR * 0.5, plateR * 0.2, cx, cy, plateR);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.7, "#f0e8dc");
  grad.addColorStop(1, "#c8b8a4");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, plateR, plateR * 0.92, 0, 0, TAU);
  ctx.fill();
  // 縁の段差
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, plateR * 0.94, plateR * 0.87, 0, 0, TAU);
  ctx.stroke();
  // 内側ハイライト
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, cy, plateR * 0.78, plateR * 0.72, 0, Math.PI * 0.9, Math.PI * 1.7);
  ctx.stroke();
}

// --- ホットケーキ ---
// glowLevel: 0 → 1 でプレミアム解放時の光オーラ
export function drawPancake(ctx, cx, cy, r, glowLevel = 0, time = 0) {
  // 光オーラ
  if (glowLevel > 0.01) {
    const auraR = r * (1.18 + Math.sin(time * 0.003) * 0.04);
    const auraGrad = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, auraR);
    auraGrad.addColorStop(0, "rgba(255,220,120,0)");
    auraGrad.addColorStop(0.4, `rgba(255,220,120,${0.5 * glowLevel})`);
    auraGrad.addColorStop(1, "rgba(255,220,120,0)");
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, auraR, auraR * 0.85, 0, 0, TAU);
    ctx.fill();
  }

  // 下段の影
  ctx.fillStyle = "rgba(80,40,10,0.5)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.18, r * 1.02, r * 0.32, 0, 0, TAU);
  ctx.fill();

  // 下のホットケーキ（チラッと見える）
  const undGrad = ctx.createLinearGradient(0, cy, 0, cy + r * 0.5);
  undGrad.addColorStop(0, "#c98438");
  undGrad.addColorStop(1, "#6a3a14");
  ctx.fillStyle = undGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.1, r * 0.96, r * 0.32, 0, 0, TAU);
  ctx.fill();

  // メインのホットケーキ（楕円ディスク）
  const mainGrad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.45, r * 0.2, cx, cy, r);
  mainGrad.addColorStop(0, "#ffd58a");
  mainGrad.addColorStop(0.45, "#e3a056");
  mainGrad.addColorStop(0.85, "#a86424");
  mainGrad.addColorStop(1, "#6b3a10");
  ctx.fillStyle = mainGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r * 0.9, 0, 0, TAU);
  ctx.fill();

  // 縁の濃い焼き目
  ctx.strokeStyle = "rgba(60,28,5,0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.99, r * 0.89, 0, 0, TAU);
  ctx.stroke();

  // 表面のクラム模様（小さな気泡跡）
  ctx.fillStyle = "rgba(120,70,20,0.25)";
  let s = 22001;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < 40; i++) {
    const a = rnd() * TAU;
    const rr = rnd() * r * 0.85;
    const px = cx + Math.cos(a) * rr;
    const py = cy + Math.sin(a) * rr * 0.9;
    const dotR = 0.5 + rnd() * 1.4;
    ctx.beginPath();
    ctx.arc(px, py, dotR, 0, TAU);
    ctx.fill();
  }

  // 上部のハイライト
  ctx.fillStyle = "rgba(255,240,200,0.35)";
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.25, cy - r * 0.45, r * 0.5, r * 0.18, -0.25, 0, TAU);
  ctx.fill();
}

// --- パレットの皿 ---
export function drawPalettePlate(ctx, cx, cy, plateR, topping, time = 0, isHover = false, locked = false) {
  // 影
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(cx + 3, cy + plateR * 0.55, plateR * 1.02, plateR * 0.32, 0, 0, TAU);
  ctx.fill();
  // 皿
  const grad = ctx.createRadialGradient(cx - plateR * 0.4, cy - plateR * 0.4, plateR * 0.15, cx, cy, plateR);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.7, "#ece4d6");
  grad.addColorStop(1, "#aa9a82");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, plateR, plateR * 0.85, 0, 0, TAU);
  ctx.fill();
  // 縁
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(cx, cy, plateR * 0.93, plateR * 0.79, 0, 0, TAU);
  ctx.stroke();
  if (isHover) {
    ctx.strokeStyle = "rgba(255,213,108,0.9)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, plateR * 1.03, plateR * 0.88, 0, 0, TAU);
    ctx.stroke();
  }
  // ラベル背景
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const labelW = Math.max(34, ctx.measureText(topping.name).width + 12);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(cx - labelW / 2, cy + plateR * 0.7, labelW, 16, 8);
  } else {
    ctx.rect(cx - labelW / 2, cy + plateR * 0.7, labelW, 16);
  }
  ctx.fill();
  ctx.fillStyle = "#fff8e8";
  ctx.fillText(topping.name, cx, cy + plateR * 0.7 + 8);

  // ホバー時はちょい浮かす
  const bob = isHover ? Math.sin(time * 0.012) * 1.5 : 0;
  // トッピング自体を描画
  topping.drawFn(ctx, cx, cy - 2 + bob, 0, 1.05);

  if (locked) {
    // ロック表示
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, plateR, plateR * 0.85, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🔒", cx, cy - 2);
    ctx.font = "bold 9px sans-serif";
    ctx.fillText("グレード100で解放", cx, cy + 14);
  }
}

// --- 配置済みトッピング ---
export function drawPlacedToppings(ctx, placed) {
  for (const p of placed) {
    const t = TOPPING_MAP[p.toppingId];
    if (!t) continue;
    t.drawFn(ctx, p.x, p.y, p.rotation, p.scale);
  }
}

// --- ドラッグ中のゴースト ---
export function drawGhost(ctx, topping, x, y, rot, scale, validDrop) {
  ctx.save();
  ctx.globalAlpha = validDrop ? 0.85 : 0.4;
  topping.drawFn(ctx, x, y, rot, scale);
  ctx.restore();
  if (!validDrop) {
    // 無効位置の赤いリング
    ctx.strokeStyle = "rgba(255,80,80,0.7)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(x, y, topping.baseSize * scale + 4, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// --- パーティクル ---
export function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    if (p.kind === "star") {
      ctx.beginPath();
      const rad = p.size;
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * TAU - Math.PI / 2;
        const r = (k % 2 === 0) ? rad : rad * 0.45;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

// --- カウンタ用テキスト（中央ヘルプなど） ---
export function drawCenteredHint(ctx, cx, cy, text, alpha = 0.55) {
  ctx.save();
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy);
  ctx.restore();
}
