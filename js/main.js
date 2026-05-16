import { TOPPINGS, TOPPING_MAP } from "./toppings.js";
import {
  drawTable, drawMainPlate, drawPancake,
  drawPalettePlate, drawPlacedToppings, drawGhost, drawParticles,
  drawCenteredHint,
} from "./draw.js";
import { computeGrade, gradeRank } from "./score.js";
import { attachInput } from "./input.js";
import {
  startAudio, toggleMute, isMuted,
  playPickup, playPlace, playSwitch, playDelete, playWrong, playUnlock, playFinish,
} from "./audio.js";

const REPO_README_URL = "https://github.com/shinultra/pancake-decoration-game#readme";

const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");

const ui = {
  gradeValue:  document.getElementById("grade-value"),
  gradeBar:    document.getElementById("grade-bar"),
  bdCov: document.getElementById("bd-cov"),
  bdBal: document.getElementById("bd-bal"),
  bdSp:  document.getElementById("bd-sp"),
  bdOf:  document.getElementById("bd-of"),
  bdBo:  document.getElementById("bd-bo"),
  btnSound:  document.getElementById("btn-sound"),
  btnHelp:   document.getElementById("btn-help"),
  btnFinish: document.getElementById("btn-finish"),
  btnReset:  document.getElementById("btn-reset"),
  btnAgain:  document.getElementById("btn-again"),
  resultOverlay: document.getElementById("result-overlay"),
  resultGrade:   document.getElementById("result-grade"),
  resultRank:    document.getElementById("result-rank"),
  resultStars:   document.getElementById("result-stars"),
  resultTitle:   document.getElementById("result-title"),
  premiumToast:  document.getElementById("premium-toast"),
};

// --- レイアウト ---
const layout = {
  W: 0, H: 0, dpr: 1,
  cx: 0, cy: 0,
  pancakeR: 0,
  mainPlateR: 0,
  innerRingR: 0,
  outerRingR: 0,
  paletteR: 0,
  tier1Slots: [], // { x, y, r, topping }
  tier2Slots: [],
};

function recomputeLayout() {
  layout.dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  canvas.width  = Math.round(cssW * layout.dpr);
  canvas.height = Math.round(cssH * layout.dpr);
  ctx.setTransform(layout.dpr, 0, 0, layout.dpr, 0, 0);
  layout.W = cssW;
  layout.H = cssH;

  // 上部HUD領域・下部マージンを確保した「利用可能領域」を中心にレイアウト
  const topClearance = 110;
  const bottomClearance = 28;
  const usableTop = topClearance;
  const usableBottom = cssH - bottomClearance;
  layout.cx = cssW / 2;
  layout.cy = (usableTop + usableBottom) / 2;
  const usableH = usableBottom - usableTop;

  const minDim = Math.min(cssW, usableH);
  // ホットケーキ・皿
  layout.pancakeR = Math.max(70, Math.min(180, minDim * 0.18));
  layout.mainPlateR = layout.pancakeR * 1.22;
  layout.paletteR = Math.max(26, Math.min(44, minDim * 0.05));

  // パレット配置
  layout.innerRingR = layout.pancakeR + layout.paletteR * 2.6;
  layout.outerRingR = layout.innerRingR + layout.paletteR * 2.4;

  // 画面外にはみ出ないように調整。最も厳しい制約は HUD 下端と画面下端 + 横幅の半分
  const maxRingTop    = layout.cy - usableTop - layout.paletteR - 8;
  const maxRingBottom = usableBottom - layout.cy - layout.paletteR - 8;
  const maxRingSide   = cssW / 2 - layout.paletteR - 8;
  const maxRing = Math.min(maxRingTop, maxRingBottom, maxRingSide);
  if (layout.outerRingR > maxRing && maxRing > 0) {
    const scale = maxRing / layout.outerRingR;
    layout.innerRingR *= scale;
    layout.outerRingR *= scale;
    // パレットの皿自体も比例縮小
    if (scale < 0.85) {
      layout.paletteR *= Math.max(0.7, scale);
    }
  }

  const tier1 = TOPPINGS.filter(t => t.tier === 1);
  const tier2 = TOPPINGS.filter(t => t.tier === 2);

  // 上方向は HUD があるので、配置角は左下〜右下〜上の流れで分布させる
  // tier1: 内側リングを360度均等に配置するが、開始角を -π/2 + π/N にして真上を避ける
  layout.tier1Slots = tier1.map((topping, i) => {
    const N = tier1.length;
    const a = -Math.PI / 2 + Math.PI / N + (i / N) * Math.PI * 2;
    return {
      x: layout.cx + Math.cos(a) * layout.innerRingR,
      y: layout.cy + Math.sin(a) * layout.innerRingR,
      r: layout.paletteR,
      topping,
    };
  });
  // tier2: 外側リング、こちらも均等
  layout.tier2Slots = tier2.map((topping, i) => {
    const N = tier2.length;
    const a = -Math.PI / 2 + Math.PI / N + (i / N) * Math.PI * 2;
    return {
      x: layout.cx + Math.cos(a) * layout.outerRingR,
      y: layout.cy + Math.sin(a) * layout.outerRingR,
      r: layout.paletteR * 0.95,
      topping,
    };
  });
}

// --- 状態 ---
const state = {
  placed: [],            // { toppingId, x, y, rotation, scale }
  dragging: null,        // { topping, x, y, rotation, scale, sourceKind, sourceIdx }
  grade: 0,
  breakdown: { coverage: 0, balance: 0, spread: 0, overflow: 0, bonus: 0 },
  premiumUnlocked: false,
  premiumGlow: 0,        // 0..1 アニメーション
  finished: false,
  particles: [],
  hoverSlotIdx: -1,
  hoverSlotTier: 0,
  flashMs: 0,
};

function resetState() {
  state.placed = [];
  state.dragging = null;
  state.grade = 0;
  state.breakdown = { coverage: 0, balance: 0, spread: 0, overflow: 0, bonus: 0 };
  state.premiumUnlocked = false;
  state.premiumGlow = 0;
  state.finished = false;
  state.particles = [];
  state.hoverSlotIdx = -1;
  state.hoverSlotTier = 0;
  updateScore();
  ui.resultOverlay.classList.add("hidden");
}

// --- 採点更新 ---
function updateScore() {
  const prev = state.grade;
  const { grade, breakdown } = computeGrade(state.placed, {
    cx: layout.cx, cy: layout.cy, r: layout.pancakeR,
  });
  state.grade = grade;
  state.breakdown = breakdown;
  ui.gradeValue.textContent = grade;
  // バーは最大140想定で正規化
  const pct = Math.min(140, grade) / 140 * 100;
  ui.gradeBar.style.width = pct + "%";
  ui.bdCov.textContent = breakdown.coverage;
  ui.bdBal.textContent = breakdown.balance;
  ui.bdSp.textContent  = breakdown.spread;
  ui.bdOf.textContent  = breakdown.overflow;
  ui.bdBo.textContent  = breakdown.bonus;

  // フラッシュ
  if (grade !== prev) {
    ui.gradeValue.classList.add("flash");
    state.flashMs = performance.now();
  }
  // プレミアム解放判定
  if (grade > 100 && !state.premiumUnlocked) {
    triggerPremiumUnlock();
  }
  // プレミアム解放後のUI
  if (state.premiumUnlocked) {
    ui.gradeValue.classList.add("premium");
    ui.gradeBar.classList.add("premium");
  }
}

// --- プレミアム解放演出 ---
function triggerPremiumUnlock() {
  state.premiumUnlocked = true;
  playUnlock();
  // パーティクル爆発
  for (let i = 0; i < 80; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = 3 + Math.random() * 6;
    state.particles.push({
      x: layout.cx, y: layout.cy,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1,
      gravity: 0.12,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.3,
      size: 4 + Math.random() * 6,
      life: 90 + Math.random() * 50, maxLife: 140,
      color: ["#ffd66c", "#fff5a8", "#ffaa3a", "#fff"][Math.floor(Math.random() * 4)],
      kind: Math.random() < 0.7 ? "star" : "dot",
    });
  }
  ui.premiumToast.classList.remove("hidden");
  ui.premiumToast.classList.remove("show");
  // reflow trick to restart animation
  void ui.premiumToast.offsetWidth;
  ui.premiumToast.classList.add("show");
  setTimeout(() => ui.premiumToast.classList.remove("show"), 2500);
}

// --- ヒット判定 ---
function hitPaletteSlot(x, y) {
  // tier2 はロック中ならヒットしない
  const allSlots = [
    ...layout.tier1Slots.map((s, i) => ({ ...s, tier: 1, idx: i })),
    ...layout.tier2Slots.map((s, i) => ({ ...s, tier: 2, idx: i })),
  ];
  for (const s of allSlots) {
    if (s.tier === 2 && !state.premiumUnlocked) continue;
    const dx = x - s.x;
    const dy = y - s.y;
    if (dx * dx + dy * dy <= s.r * s.r) {
      return s;
    }
  }
  return null;
}

function hitPlacedTopping(x, y) {
  // 後ろから（上に乗っているものから）検索
  for (let i = state.placed.length - 1; i >= 0; i--) {
    const p = state.placed[i];
    const t = TOPPING_MAP[p.toppingId];
    if (!t) continue;
    const dx = x - p.x;
    const dy = y - p.y;
    const r = t.baseSize * p.scale * 1.05;
    if (dx * dx + dy * dy <= r * r) return i;
  }
  return -1;
}

function isOverPancake(x, y) {
  const dx = (x - layout.cx) / layout.pancakeR;
  const dy = (y - layout.cy) / (layout.pancakeR * 0.9);
  return dx * dx + dy * dy < 1.1;
}

// --- 入力ハンドラ ---
attachInput(canvas, {
  onPointerDown(x, y) {
    startAudio();
    if (state.finished) return;

    // まず既存トッピングを掴めるか
    const placedIdx = hitPlacedTopping(x, y);
    if (placedIdx >= 0) {
      const p = state.placed.splice(placedIdx, 1)[0];
      const t = TOPPING_MAP[p.toppingId];
      state.dragging = {
        topping: t,
        x, y,
        rotation: p.rotation,
        scale: p.scale,
        sourceKind: "placed",
        sourceData: p,
      };
      playSwitch();
      updateScore();
      return;
    }

    // パレット
    const slot = hitPaletteSlot(x, y);
    if (slot) {
      state.dragging = {
        topping: slot.topping,
        x, y,
        rotation: Math.random() * Math.PI * 2,
        scale: 0.95 + Math.random() * 0.2,
        sourceKind: "palette",
      };
      playPickup();
      return;
    }
  },
  onPointerMove(x, y) {
    if (state.dragging) {
      state.dragging.x = x;
      state.dragging.y = y;
    } else {
      // ホバー検出
      const slot = hitPaletteSlot(x, y);
      if (slot) {
        state.hoverSlotIdx = slot.idx;
        state.hoverSlotTier = slot.tier;
      } else {
        state.hoverSlotIdx = -1;
      }
    }
  },
  onPointerUp(x, y) {
    if (!state.dragging) return;
    const cancelled = !Number.isFinite(x);
    if (cancelled) {
      // 元から既存配置なら復元、新規なら破棄
      if (state.dragging.sourceKind === "placed") {
        state.placed.push(state.dragging.sourceData);
      }
      state.dragging = null;
      updateScore();
      return;
    }

    const onPancake = isOverPancake(state.dragging.x, state.dragging.y);
    if (onPancake) {
      state.placed.push({
        toppingId: state.dragging.topping.id,
        x: state.dragging.x,
        y: state.dragging.y,
        rotation: state.dragging.rotation,
        scale: state.dragging.scale,
      });
      playPlace();
    } else {
      // パレットに戻す（新規）or 既存削除
      // 新規パレットドラッグでもホットケーキ外に落とすと「ちょい外」のはみ出し配置を許す
      // → ゲーム性のため、ホットケーキの外周近くならボーダーでも置けるようにする
      const dx = (state.dragging.x - layout.cx) / layout.pancakeR;
      const dy = (state.dragging.y - layout.cy) / (layout.pancakeR * 0.9);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1.5 && state.dragging.sourceKind === "palette") {
        // ボーダー外でも配置（はみ出しペナルティが付く）
        state.placed.push({
          toppingId: state.dragging.topping.id,
          x: state.dragging.x,
          y: state.dragging.y,
          rotation: state.dragging.rotation,
          scale: state.dragging.scale,
        });
        playPlace();
      } else if (state.dragging.sourceKind === "placed") {
        playDelete();
      } else {
        playWrong();
      }
    }

    state.dragging = null;
    updateScore();
  },
});

// --- レンダリングループ ---
function frame(t) {
  const W = layout.W, H = layout.H;
  ctx.clearRect(0, 0, W, H);
  // 背景
  drawTable(ctx, W, H);
  // 大皿
  drawMainPlate(ctx, layout.cx, layout.cy, layout.mainPlateR);
  // プレミアム解放後のアニメーションを徐々に上げる
  const target = state.premiumUnlocked ? 1 : 0;
  state.premiumGlow += (target - state.premiumGlow) * 0.08;
  // ホットケーキ
  drawPancake(ctx, layout.cx, layout.cy, layout.pancakeR, state.premiumGlow, t);
  // ヒント (トッピング 0個)
  if (state.placed.length === 0 && !state.dragging) {
    drawCenteredHint(ctx, layout.cx, layout.cy, "↓ 周りの皿からトッピングをドラッグ ↓", 0.55);
  }

  // 既存トッピング
  drawPlacedToppings(ctx, state.placed);

  // パレット
  layout.tier1Slots.forEach((slot, i) => {
    const isHover = (state.hoverSlotIdx === i && state.hoverSlotTier === 1) ||
                    (state.dragging && state.dragging.sourceKind === "palette" &&
                     state.dragging.topping.id === slot.topping.id);
    drawPalettePlate(ctx, slot.x, slot.y, slot.r, slot.topping, t, isHover, false);
  });
  layout.tier2Slots.forEach((slot, i) => {
    const locked = !state.premiumUnlocked;
    const isHover = state.hoverSlotIdx === i && state.hoverSlotTier === 2 && !locked;
    // プレミアム解放アニメーション (fade in)
    const slotAlpha = locked ? 0.6 : 1.0 * state.premiumGlow + 0.4;
    ctx.save();
    ctx.globalAlpha = Math.min(1, slotAlpha);
    drawPalettePlate(ctx, slot.x, slot.y, slot.r, slot.topping, t, isHover, locked);
    ctx.restore();
  });

  // ゴースト
  if (state.dragging) {
    const validDrop = isOverPancake(state.dragging.x, state.dragging.y);
    drawGhost(ctx, state.dragging.topping,
              state.dragging.x, state.dragging.y,
              state.dragging.rotation, state.dragging.scale,
              validDrop);
  }

  // パーティクル更新
  if (state.particles.length > 0) {
    for (const p of state.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rot += p.vrot;
      p.life -= 1;
    }
    state.particles = state.particles.filter(p => p.life > 0);
    drawParticles(ctx, state.particles);
  }

  // フラッシュ解除
  if (state.flashMs && t - state.flashMs > 220) {
    ui.gradeValue.classList.remove("flash");
    state.flashMs = 0;
  }

  requestAnimationFrame(frame);
}

// --- UI ボタン ---
ui.btnFinish.addEventListener("click", () => {
  startAudio();
  if (state.finished) return;
  if (state.placed.length === 0) {
    playWrong();
    ui.btnFinish.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }],
      { duration: 250 }
    );
    return;
  }
  state.finished = true;
  const rank = gradeRank(state.grade);
  ui.resultGrade.textContent = state.grade;
  ui.resultRank.textContent = rank.name;
  ui.resultStars.textContent = rank.stars;
  ui.resultTitle.textContent = state.grade >= 100 ? "傑作の完成！" : "完成！";
  ui.resultOverlay.classList.remove("hidden");
  playFinish();
});

ui.btnReset.addEventListener("click", () => {
  startAudio();
  resetState();
  ui.gradeValue.classList.remove("premium");
  ui.gradeBar.classList.remove("premium");
});

ui.btnAgain.addEventListener("click", () => {
  startAudio();
  resetState();
  ui.gradeValue.classList.remove("premium");
  ui.gradeBar.classList.remove("premium");
});

ui.btnSound.addEventListener("click", () => {
  startAudio();
  const m = toggleMute();
  ui.btnSound.textContent = m ? "🔇" : "🔊";
});

ui.btnHelp.addEventListener("click", () => {
  window.open(REPO_README_URL, "_blank", "noopener,noreferrer");
});

// 起動直後のミュート状態をボタンに反映
if (isMuted()) ui.btnSound.textContent = "🔇";

// --- 起動 ---
function init() {
  recomputeLayout();
  window.addEventListener("resize", recomputeLayout);
  // 画面回転対策
  window.addEventListener("orientationchange", () => setTimeout(recomputeLayout, 50));
  updateScore();
  requestAnimationFrame(frame);
}

init();
