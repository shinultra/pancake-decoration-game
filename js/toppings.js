// トッピングカタログ。各 drawFn は ctx を保存済みで呼ばれる前提とせず、
// 引数 (ctx, x, y, rot, scale) を受け取って描画する純粋関数。

const TAU = Math.PI * 2;

function withTransform(ctx, x, y, rot, scale, fn) {
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (scale !== 1) ctx.scale(scale, scale);
  fn();
  ctx.restore();
}

// ---------------- TIER 1 (通常) ----------------

function drawButter(ctx, x, y, rot, scale) {
  withTransform(ctx, x, y, rot, scale, () => {
    const r = 14;
    ctx.fillStyle = "#3a2a14";
    ctx.globalAlpha = 0.3;
    ctx.fillRect(-r + 2, -r + 3, r * 2, r * 2);
    ctx.globalAlpha = 1;
    const grad = ctx.createLinearGradient(-r, -r, r, r);
    grad.addColorStop(0, "#fff2a0");
    grad.addColorStop(0.55, "#ffd766");
    grad.addColorStop(1, "#c79a2f");
    ctx.fillStyle = grad;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillRect(-r + 2, -r + 2, r * 2 - 6, 3);
    ctx.strokeStyle = "rgba(120,80,20,0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
  });
}

function drawStrawberry(ctx, x, y, rot, scale) {
  withTransform(ctx, x, y, rot, scale, () => {
    ctx.fillStyle = "rgba(40,10,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(1, 14, 10, 4, 0, 0, TAU);
    ctx.fill();
    // 本体
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.bezierCurveTo(13, -12, 14, 8, 0, 16);
    ctx.bezierCurveTo(-14, 8, -13, -12, 0, -14);
    ctx.closePath();
    const grad = ctx.createRadialGradient(-3, -4, 2, 0, 0, 16);
    grad.addColorStop(0, "#ff8585");
    grad.addColorStop(0.5, "#e8243a");
    grad.addColorStop(1, "#9a0a18");
    ctx.fillStyle = grad;
    ctx.fill();
    // 種
    ctx.fillStyle = "#fff5b8";
    const seeds = [
      [-5, -6], [5, -5], [0, -2], [-7, 2], [7, 1],
      [-3, 6], [3, 7], [-6, 10], [6, 10], [0, 12]
    ];
    for (const [sx, sy] of seeds) {
      ctx.beginPath();
      ctx.ellipse(sx, sy, 1.2, 1.8, 0.3, 0, TAU);
      ctx.fill();
    }
    // ヘタ
    ctx.fillStyle = "#3aa84a";
    ctx.beginPath();
    ctx.moveTo(0, -16);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i / 5) * TAU * 0.5 - Math.PI / 2;
      const r = 7;
      ctx.lineTo(Math.cos(a) * r, -12 + Math.sin(a) * r * 0.5);
    }
    ctx.closePath();
    ctx.fillStyle = "#3aa04a";
    ctx.beginPath();
    ctx.ellipse(-4, -12, 4, 2.5, -0.4, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(4, -12, 4, 2.5, 0.4, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -14, 3, 2.5, 0, 0, TAU);
    ctx.fill();
    // ハイライト
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.ellipse(-4, -3, 2.2, 4, -0.3, 0, TAU);
    ctx.fill();
  });
}

function drawBlueberry(ctx, x, y, rot, scale) {
  withTransform(ctx, x, y, rot, scale, () => {
    ctx.fillStyle = "rgba(20,0,30,0.3)";
    ctx.beginPath();
    ctx.ellipse(1, 8, 7, 3, 0, 0, TAU);
    ctx.fill();
    const grad = ctx.createRadialGradient(-2, -3, 1, 0, 0, 9);
    grad.addColorStop(0, "#7c6acb");
    grad.addColorStop(0.4, "#4a3a96");
    grad.addColorStop(1, "#1d1340");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, TAU);
    ctx.fill();
    // 王冠
    ctx.strokeStyle = "#2a1a55";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, -1, 3.2, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = "#3a2e6a";
    ctx.beginPath();
    ctx.arc(0, -1, 1, 0, TAU);
    ctx.fill();
    // ハイライト
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.ellipse(-3, -3, 1.5, 2.5, -0.4, 0, TAU);
    ctx.fill();
  });
}

function drawBananaSlice(ctx, x, y, rot, scale) {
  withTransform(ctx, x, y, rot, scale, () => {
    ctx.fillStyle = "rgba(60,30,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(1, 9, 9, 3, 0, 0, TAU);
    ctx.fill();
    const grad = ctx.createRadialGradient(-2, -2, 2, 0, 0, 10);
    grad.addColorStop(0, "#fff5c8");
    grad.addColorStop(0.6, "#f6dc6c");
    grad.addColorStop(1, "#caa330");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#b08a28";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // 種パターン Y字
    ctx.fillStyle = "#7a5a14";
    for (let i = 0; i < 3; i++) {
      const a = i * (TAU / 3) - Math.PI / 2;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 2.6, Math.sin(a) * 2.6, 1.4, 0.9, a, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.ellipse(-4, -4, 2, 3, -0.4, 0, TAU);
    ctx.fill();
  });
}

function drawWhippedCream(ctx, x, y, rot, scale) {
  withTransform(ctx, x, y, rot, scale, () => {
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(2, 12, 14, 4, 0, 0, TAU);
    ctx.fill();
    // 下段
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(0, 8, 14, 6, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    ctx.beginPath();
    ctx.ellipse(0, 11, 13, 3, 0, 0, TAU);
    ctx.fill();
    // 渦巻きの段
    const rings = [
      { x: -1, y: 2,  rx: 11, ry: 5 },
      { x:  0, y: -3, rx: 8.5, ry: 4 },
      { x:  1, y: -8, rx: 6,  ry: 3 },
      { x:  0, y: -12,rx: 3.5,ry: 2 },
    ];
    for (const r of rings) {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.rx, r.ry, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(180,160,140,0.25)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.rx, r.ry, 0, 0, TAU);
      ctx.stroke();
    }
    // 頂点
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(0, -15, 1.8, 0, TAU);
    ctx.fill();
  });
}

function drawMapleSyrup(ctx, x, y, rot, scale) {
  withTransform(ctx, x, y, rot, scale, () => {
    ctx.fillStyle = "rgba(50,20,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(2, 4, 16, 6, 0, 0, TAU);
    ctx.fill();
    const grad = ctx.createRadialGradient(-3, -2, 1, 0, 0, 16);
    grad.addColorStop(0, "#c66818");
    grad.addColorStop(0.5, "#9c4d10");
    grad.addColorStop(1, "#5a2a08");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.bezierCurveTo(-15, -8, -4, -10, 2, -6);
    ctx.bezierCurveTo(10, -8, 16, -2, 14, 4);
    ctx.bezierCurveTo(16, 9, 4, 10, -2, 7);
    ctx.bezierCurveTo(-10, 9, -16, 6, -14, 0);
    ctx.closePath();
    ctx.fill();
    // 反射
    ctx.fillStyle = "rgba(255,220,160,0.7)";
    ctx.beginPath();
    ctx.ellipse(-4, -4, 5, 1.6, -0.3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255,200,120,0.4)";
    ctx.beginPath();
    ctx.ellipse(5, 1, 4, 1, 0.1, 0, TAU);
    ctx.fill();
  });
}

function drawChocolateSauce(ctx, x, y, rot, scale) {
  withTransform(ctx, x, y, rot, scale, () => {
    ctx.fillStyle = "rgba(20,5,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(2, 4, 14, 5, 0, 0, TAU);
    ctx.fill();
    const grad = ctx.createRadialGradient(-3, -3, 1, 0, 0, 14);
    grad.addColorStop(0, "#7a4d28");
    grad.addColorStop(0.5, "#4a2810");
    grad.addColorStop(1, "#1f0e04");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-13, -1);
    ctx.bezierCurveTo(-14, -7, -3, -10, 4, -7);
    ctx.bezierCurveTo(11, -9, 14, -1, 13, 3);
    ctx.bezierCurveTo(15, 8, 2, 10, -3, 6);
    ctx.bezierCurveTo(-11, 8, -15, 4, -13, -1);
    ctx.closePath();
    ctx.fill();
    // てらり
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.ellipse(-3, -4, 5, 1.4, -0.3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255,220,180,0.12)";
    ctx.beginPath();
    ctx.ellipse(5, 0, 3, 1, 0.1, 0, TAU);
    ctx.fill();
  });
}

function drawHoney(ctx, x, y, rot, scale) {
  withTransform(ctx, x, y, rot, scale, () => {
    ctx.fillStyle = "rgba(100,60,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(2, 4, 13, 4, 0, 0, TAU);
    ctx.fill();
    const grad = ctx.createRadialGradient(-3, -3, 1, 0, 0, 13);
    grad.addColorStop(0, "#ffe28a");
    grad.addColorStop(0.5, "#f0a528");
    grad.addColorStop(1, "#a86810");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.bezierCurveTo(-13, -6, -2, -9, 3, -6);
    ctx.bezierCurveTo(9, -8, 13, -1, 12, 3);
    ctx.bezierCurveTo(14, 8, 3, 9, -2, 6);
    ctx.bezierCurveTo(-10, 8, -14, 4, -12, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,210,0.7)";
    ctx.beginPath();
    ctx.ellipse(-3, -4, 5, 1.5, -0.3, 0, TAU);
    ctx.fill();
  });
}

function drawCherry(ctx, x, y, rot, scale) {
  withTransform(ctx, x, y, rot, scale, () => {
    // 茎
    ctx.strokeStyle = "#5a3a18";
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(2, -12);
    ctx.quadraticCurveTo(-2, -16, -4, -22);
    ctx.stroke();
    // 影
    ctx.fillStyle = "rgba(40,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(2, 10, 9, 3, 0, 0, TAU);
    ctx.fill();
    // 実
    const grad = ctx.createRadialGradient(-2, -3, 1, 0, 0, 11);
    grad.addColorStop(0, "#ff7a8a");
    grad.addColorStop(0.5, "#d51030");
    grad.addColorStop(1, "#7a0014");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, TAU);
    ctx.fill();
    // ハイライト
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.ellipse(-3, -3, 2, 3, -0.4, 0, TAU);
    ctx.fill();
  });
}

function drawMintLeaf(ctx, x, y, rot, scale) {
  withTransform(ctx, x, y, rot, scale, () => {
    ctx.fillStyle = "rgba(20,40,10,0.2)";
    ctx.beginPath();
    ctx.ellipse(1, 6, 10, 3, 0, 0, TAU);
    ctx.fill();
    const grad = ctx.createLinearGradient(-10, -8, 10, 8);
    grad.addColorStop(0, "#7ed05a");
    grad.addColorStop(0.6, "#3da030");
    grad.addColorStop(1, "#1a5a18");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.quadraticCurveTo(-8, -10, 0, -8);
    ctx.quadraticCurveTo(10, -6, 12, 0);
    ctx.quadraticCurveTo(10, 6, 0, 8);
    ctx.quadraticCurveTo(-8, 10, -12, 0);
    ctx.closePath();
    ctx.fill();
    // 葉脈
    ctx.strokeStyle = "rgba(0,40,10,0.5)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-11, 0);
    ctx.lineTo(11, 0);
    ctx.stroke();
    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue;
      ctx.beginPath();
      ctx.moveTo(i * 3, 0);
      ctx.quadraticCurveTo(i * 3 + 1.5, i > 0 ? -3 : 3, i * 3 + 3, i > 0 ? -5 : 5);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.ellipse(-4, -3, 4, 1.4, -0.4, 0, TAU);
    ctx.fill();
  });
}

function drawPowderedSugar(ctx, x, y, rot, scale) {
  withTransform(ctx, x, y, rot, scale, () => {
    // ランダムだが決定的なドット群（rotで位置をシフト）
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    const seed = (rot * 1000) | 0;
    let s = seed;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    for (let i = 0; i < 22; i++) {
      const px = (rnd() - 0.5) * 24;
      const py = (rnd() - 0.5) * 24;
      const pr = 0.6 + rnd() * 1.6;
      ctx.globalAlpha = 0.4 + rnd() * 0.6;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
}

// ---------------- TIER 2 (プレミアム) ----------------

function drawGoldLeaf(ctx, x, y, rot, scale) {
  withTransform(ctx, x, y, rot, scale, () => {
    const seed = ((rot * 999) | 0) || 1;
    let s = seed;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    ctx.fillStyle = "rgba(80,40,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(1, 8, 12, 3, 0, 0, TAU);
    ctx.fill();
    // 複数の不規則金箔
    for (let i = 0; i < 5; i++) {
      const px = (rnd() - 0.5) * 16;
      const py = (rnd() - 0.5) * 14;
      const ang = rnd() * TAU;
      const sx = 4 + rnd() * 6;
      const sy = 3 + rnd() * 5;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang);
      const grad = ctx.createLinearGradient(-sx, -sy, sx, sy);
      grad.addColorStop(0, "#fff5b0");
      grad.addColorStop(0.5, "#ffd44a");
      grad.addColorStop(1, "#b07a0a");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-sx, -sy * 0.6);
      ctx.lineTo(sx * 0.4, -sy);
      ctx.lineTo(sx, sy * 0.4);
      ctx.lineTo(-sx * 0.3, sy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,200,0.6)";
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.restore();
    }
  });
}

function drawEdibleFlower(ctx, x, y, rot, scale) {
  withTransform(ctx, x, y, rot, scale, () => {
    ctx.fillStyle = "rgba(60,20,40,0.22)";
    ctx.beginPath();
    ctx.ellipse(1, 6, 12, 3, 0, 0, TAU);
    ctx.fill();
    const petalGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, 12);
    petalGrad.addColorStop(0, "#fff");
    petalGrad.addColorStop(0.5, "#ffb0d4");
    petalGrad.addColorStop(1, "#c455a0");
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU - Math.PI / 2;
      ctx.save();
      ctx.rotate(a);
      ctx.fillStyle = petalGrad;
      ctx.beginPath();
      ctx.ellipse(0, -8, 5, 8, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(180,60,120,0.4)";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.lineTo(0, -14);
      ctx.stroke();
      ctx.restore();
    }
    // 中心
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, 4);
    cg.addColorStop(0, "#fff5a0");
    cg.addColorStop(1, "#e08820");
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, TAU);
    ctx.fill();
    // 雄しべ
    ctx.fillStyle = "#a05010";
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 2.5, Math.sin(a) * 2.5, 0.6, 0, TAU);
      ctx.fill();
    }
  });
}

function drawMacaron(ctx, x, y, rot, scale) {
  withTransform(ctx, x, y, rot, scale, () => {
    ctx.fillStyle = "rgba(60,30,10,0.3)";
    ctx.beginPath();
    ctx.ellipse(1, 9, 13, 3, 0, 0, TAU);
    ctx.fill();
    // フィリング
    ctx.fillStyle = "#f7c8a4";
    ctx.fillRect(-12, -1, 24, 4);
    ctx.fillStyle = "rgba(200,140,80,0.6)";
    ctx.fillRect(-12, 2, 24, 1);
    // 上のドーム
    const upG = ctx.createLinearGradient(0, -10, 0, -1);
    upG.addColorStop(0, "#ffe4f0");
    upG.addColorStop(1, "#f48cb0");
    ctx.fillStyle = upG;
    ctx.beginPath();
    ctx.moveTo(-12, -1);
    ctx.bezierCurveTo(-12, -10, 12, -10, 12, -1);
    ctx.closePath();
    ctx.fill();
    // 下のドーム
    const dnG = ctx.createLinearGradient(0, 3, 0, 12);
    dnG.addColorStop(0, "#f48cb0");
    dnG.addColorStop(1, "#c44878");
    ctx.fillStyle = dnG;
    ctx.beginPath();
    ctx.moveTo(-12, 3);
    ctx.bezierCurveTo(-12, 12, 12, 12, 12, 3);
    ctx.closePath();
    ctx.fill();
    // ピエ（ザラ）
    ctx.fillStyle = "rgba(255,180,210,0.7)";
    for (let i = -5; i <= 5; i++) {
      ctx.beginPath();
      ctx.arc(i * 2, 1.5, 0.7, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.ellipse(-5, -6, 4, 1.4, -0.3, 0, TAU);
    ctx.fill();
  });
}

function drawIceCreamScoop(ctx, x, y, rot, scale) {
  withTransform(ctx, x, y, rot, scale, () => {
    ctx.fillStyle = "rgba(40,30,10,0.3)";
    ctx.beginPath();
    ctx.ellipse(2, 14, 16, 5, 0, 0, TAU);
    ctx.fill();
    const grad = ctx.createRadialGradient(-4, -4, 2, 0, 0, 16);
    grad.addColorStop(0, "#fffaee");
    grad.addColorStop(0.5, "#f9e4b8");
    grad.addColorStop(1, "#b48a4a");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, TAU);
    ctx.fill();
    // 表面のテクスチャ
    ctx.strokeStyle = "rgba(180,140,80,0.25)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      const a = i / 6 * TAU;
      ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
      ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.ellipse(-5, -6, 4, 6, -0.4, 0, TAU);
    ctx.fill();
  });
}

function drawChocolateCurl(ctx, x, y, rot, scale) {
  withTransform(ctx, x, y, rot, scale, () => {
    ctx.fillStyle = "rgba(20,10,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(2, 9, 12, 3, 0, 0, TAU);
    ctx.fill();
    // 螺旋（複数の半円リング）
    const grad = ctx.createLinearGradient(-10, -8, 10, 8);
    grad.addColorStop(0, "#7a4528");
    grad.addColorStop(0.5, "#4a2510");
    grad.addColorStop(1, "#1a0a02");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-11, -2);
    ctx.bezierCurveTo(-12, -10, 8, -12, 11, -4);
    ctx.bezierCurveTo(13, 2, 2, 8, -6, 4);
    ctx.bezierCurveTo(-10, 2, -11, -1, -11, -2);
    ctx.closePath();
    ctx.fill();
    // 巻きライン
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8, -2);
    ctx.bezierCurveTo(-6, -8, 6, -9, 9, -3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.bezierCurveTo(-2, -5, 5, -6, 7, -1);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,200,160,0.25)";
    ctx.beginPath();
    ctx.ellipse(-3, -6, 4, 1.2, -0.4, 0, TAU);
    ctx.fill();
  });
}

function drawStarSprinkle(ctx, x, y, rot, scale) {
  withTransform(ctx, x, y, rot, scale, () => {
    const seed = ((rot * 777) | 0) || 7;
    let s = seed;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const colors = ["#ffd84a", "#ff7aa8", "#5acbff", "#8aff7a", "#ffaa3a"];
    for (let i = 0; i < 8; i++) {
      const px = (rnd() - 0.5) * 22;
      const py = (rnd() - 0.5) * 22;
      const rad = 2.2 + rnd() * 1.6;
      const ang = rnd() * TAU;
      const color = colors[(rnd() * colors.length) | 0];
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang);
      // 星形
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * TAU - Math.PI / 2;
        const r = (k % 2 === 0) ? rad : rad * 0.45;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      // ハイライト
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(-rad * 0.3, -rad * 0.3, rad * 0.25, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  });
}

// ---------------- カタログ ----------------

export const TOPPINGS = [
  // tier 1
  { id: "butter",         name: "バター",     drawFn: drawButter,         baseSize: 14, colorTag: "yellow",  tier: 1 },
  { id: "strawberry",     name: "いちご",     drawFn: drawStrawberry,     baseSize: 16, colorTag: "red",     tier: 1 },
  { id: "blueberry",      name: "ブルーベリー", drawFn: drawBlueberry,    baseSize: 8,  colorTag: "purple",  tier: 1 },
  { id: "banana_slice",   name: "バナナ",     drawFn: drawBananaSlice,    baseSize: 10, colorTag: "yellow",  tier: 1 },
  { id: "whipped_cream",  name: "ホイップ",   drawFn: drawWhippedCream,   baseSize: 14, colorTag: "white",   tier: 1 },
  { id: "maple_syrup",    name: "メイプル",   drawFn: drawMapleSyrup,     baseSize: 14, colorTag: "amber",   tier: 1 },
  { id: "chocolate_sauce",name: "チョコソース", drawFn: drawChocolateSauce, baseSize: 13, colorTag: "brown",  tier: 1 },
  { id: "honey",          name: "はちみつ",   drawFn: drawHoney,          baseSize: 12, colorTag: "amber",   tier: 1 },
  { id: "cherry",         name: "チェリー",   drawFn: drawCherry,         baseSize: 10, colorTag: "red",     tier: 1 },
  { id: "mint_leaf",      name: "ミント",     drawFn: drawMintLeaf,       baseSize: 11, colorTag: "green",   tier: 1 },
  { id: "powdered_sugar", name: "粉砂糖",     drawFn: drawPowderedSugar,  baseSize: 12, colorTag: "white",   tier: 1 },

  // tier 2 (プレミアム)
  { id: "gold_leaf",      name: "金箔",       drawFn: drawGoldLeaf,       baseSize: 12, colorTag: "gold",    tier: 2 },
  { id: "edible_flower",  name: "エディブルフラワー", drawFn: drawEdibleFlower, baseSize: 12, colorTag: "pink", tier: 2 },
  { id: "macaron",        name: "マカロン",   drawFn: drawMacaron,        baseSize: 13, colorTag: "pink",    tier: 2 },
  { id: "ice_cream_scoop",name: "アイス",     drawFn: drawIceCreamScoop,  baseSize: 14, colorTag: "white",   tier: 2 },
  { id: "chocolate_curl", name: "チョコ細工", drawFn: drawChocolateCurl,  baseSize: 12, colorTag: "brown",   tier: 2 },
  { id: "star_sprinkle",  name: "スターアラザン", drawFn: drawStarSprinkle, baseSize: 12, colorTag: "rainbow", tier: 2 },
];

export const TOPPING_MAP = Object.fromEntries(TOPPINGS.map(t => [t.id, t]));

// 占有面積（採点用近似、円相当）
export function toppingArea(topping, scale = 1) {
  return Math.PI * (topping.baseSize * scale) ** 2;
}
