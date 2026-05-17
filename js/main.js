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
import { submitScore, fetchTopScores } from "./ranking.js";
import {
  loadGallery, saveItem, deleteItem, snapshotPancake, downloadImage, generateId, maxItems,
} from "./gallery.js";

const REPO_README_URL = "https://github.com/shinultra/pancake-decoration-game#readme";
const PLAYER_NAME_KEY = "pancakeDeco.playerName";

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
  btnSound:   document.getElementById("btn-sound"),
  btnHelp:    document.getElementById("btn-help"),
  btnRanking: document.getElementById("btn-ranking"),
  btnGallery: document.getElementById("btn-gallery"),
  btnFinish:  document.getElementById("btn-finish"),
  btnReset:   document.getElementById("btn-reset"),
  btnAgain:   document.getElementById("btn-again"),
  resultOverlay: document.getElementById("result-overlay"),
  resultGrade:   document.getElementById("result-grade"),
  resultRank:    document.getElementById("result-rank"),
  resultStars:   document.getElementById("result-stars"),
  resultTitle:   document.getElementById("result-title"),
  premiumToast:  document.getElementById("premium-toast"),

  submitForm:    document.getElementById("submit-form"),
  playerName:    document.getElementById("player-name"),
  btnSubmit:     document.getElementById("btn-submit-score"),
  submitStatus:  document.getElementById("submit-status"),
  btnShowRanking: document.getElementById("btn-show-ranking"),

  rankingOverlay: document.getElementById("ranking-overlay"),
  rankingStatus:  document.getElementById("ranking-status"),
  rankingTbody:   document.getElementById("ranking-tbody"),
  btnRankingClose:  document.getElementById("btn-ranking-close"),
  btnRankingReload: document.getElementById("btn-ranking-reload"),

  btnSaveGallery:  document.getElementById("btn-save-gallery"),
  galleryOverlay:  document.getElementById("gallery-overlay"),
  galleryStatus:   document.getElementById("gallery-status"),
  galleryGrid:     document.getElementById("gallery-grid"),
  galleryCount:    document.getElementById("gallery-count"),
  btnGalleryClose: document.getElementById("btn-gallery-close"),

  detailOverlay:   document.getElementById("detail-overlay"),
  detailImage:     document.getElementById("detail-image"),
  detailGrade:     document.getElementById("detail-grade"),
  detailRank:      document.getElementById("detail-rank"),
  detailBreakdown: document.getElementById("detail-breakdown"),
  detailDate:      document.getElementById("detail-date"),
  btnDetailClose:  document.getElementById("btn-detail-close"),
  btnDetailDownload: document.getElementById("btn-detail-download"),
  btnDetailDelete: document.getElementById("btn-detail-delete"),
};

let detailCurrentId = null;

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
  scoreSubmitted: false,
  lastSnapshot: null,
  gallerySaved: false,
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
  state.scoreSubmitted = false;
  state.lastSnapshot = null;
  state.gallerySaved = false;
  updateScore();
  ui.resultOverlay.classList.add("hidden");
  resetSubmitForm();
  resetSaveGalleryButton();
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
  // 完成時点でスナップショットを焼いておく（リサイズで座標がズレる前に確定）
  try {
    state.lastSnapshot = snapshotPancake(state.placed, {
      cx: layout.cx, cy: layout.cy, pancakeR: layout.pancakeR,
    });
  } catch (err) {
    console.error("snapshot failed", err);
    state.lastSnapshot = null;
  }
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

// --- ランキング ---
function resetSubmitForm() {
  if (!ui.submitForm) return;
  ui.submitForm.classList.remove("hidden");
  ui.submitStatus.textContent = "";
  ui.submitStatus.classList.remove("error", "success");
  ui.btnSubmit.disabled = false;
  ui.btnSubmit.textContent = "登録";
}

function openRanking() {
  ui.rankingOverlay.classList.remove("hidden");
  loadRanking();
}

function closeRanking() {
  ui.rankingOverlay.classList.add("hidden");
}

async function loadRanking() {
  ui.rankingStatus.textContent = "読み込み中…";
  ui.rankingStatus.classList.remove("error");
  ui.rankingTbody.innerHTML = "";
  try {
    const rows = await fetchTopScores(50);
    if (rows.length === 0) {
      ui.rankingStatus.textContent = "まだ誰も登録していません。一番乗りを狙おう！";
      return;
    }
    ui.rankingStatus.textContent = `TOP ${rows.length}`;
    const frag = document.createDocumentFragment();
    rows.forEach((row, i) => {
      const tr = document.createElement("tr");
      const rank = i + 1;
      if (rank <= 3) tr.classList.add(`rank-${rank}`);
      tr.innerHTML = `
        <td class="rank-cell">${rank}</td>
        <td class="name-cell"></td>
        <td class="num">${row.score ?? 0}</td>
        <td class="date">${formatDate(row.timestamp)}</td>
      `;
      tr.querySelector(".name-cell").textContent = row.playerName ?? "ななし";
      frag.appendChild(tr);
    });
    ui.rankingTbody.appendChild(frag);
  } catch (err) {
    console.error(err);
    ui.rankingStatus.textContent = "ランキングの取得に失敗しました。通信状況を確認してね。";
    ui.rankingStatus.classList.add("error");
  }
}

function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}/${m}/${day}`;
}

ui.btnRanking.addEventListener("click", () => {
  startAudio();
  openRanking();
});

ui.btnRankingClose.addEventListener("click", () => {
  closeRanking();
});

ui.btnRankingReload.addEventListener("click", () => {
  loadRanking();
});

ui.rankingOverlay.addEventListener("click", (e) => {
  if (e.target === ui.rankingOverlay) closeRanking();
});

ui.btnShowRanking.addEventListener("click", () => {
  startAudio();
  openRanking();
});

ui.submitForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (state.scoreSubmitted) return;
  const name = ui.playerName.value.trim();
  if (!name) {
    ui.playerName.focus();
    return;
  }
  if (state.placed.length === 0 || !state.finished) {
    ui.submitStatus.textContent = "完成してから登録してね。";
    ui.submitStatus.classList.add("error");
    return;
  }
  ui.btnSubmit.disabled = true;
  ui.btnSubmit.textContent = "登録中…";
  ui.submitStatus.textContent = "";
  ui.submitStatus.classList.remove("error", "success");
  try {
    await submitScore(name, state.grade);
    try { localStorage.setItem(PLAYER_NAME_KEY, name); } catch {}
    state.scoreSubmitted = true;
    ui.submitStatus.textContent = "登録しました！ 🏆";
    ui.submitStatus.classList.add("success");
    ui.btnSubmit.textContent = "登録済み";
  } catch (err) {
    console.error(err);
    ui.submitStatus.textContent = "登録に失敗しました。通信状況を確認してね。";
    ui.submitStatus.classList.add("error");
    ui.btnSubmit.disabled = false;
    ui.btnSubmit.textContent = "再試行";
  }
});

// --- ギャラリー ---
function resetSaveGalleryButton() {
  if (!ui.btnSaveGallery) return;
  ui.btnSaveGallery.disabled = false;
  ui.btnSaveGallery.classList.remove("saved");
  ui.btnSaveGallery.textContent = "📚 ギャラリーに保存";
}

function formatDateShort(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}/${m}/${day}`;
}

function formatDateTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getFullYear()}/${m}/${day} ${hh}:${mm}`;
}

function openGallery() {
  ui.galleryOverlay.classList.remove("hidden");
  renderGallery();
}

function closeGallery() {
  ui.galleryOverlay.classList.add("hidden");
}

function renderGallery() {
  const items = loadGallery();
  ui.galleryCount.textContent = `(${items.length}/${maxItems()})`;
  ui.galleryGrid.innerHTML = "";
  if (items.length === 0) {
    ui.galleryStatus.textContent = "まだ作品はありません。完成画面から「📚 ギャラリーに保存」で残せます。";
    ui.galleryStatus.classList.add("empty");
    return;
  }
  ui.galleryStatus.textContent = "";
  ui.galleryStatus.classList.remove("empty");

  // 新しい順
  const sorted = [...items].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  const frag = document.createDocumentFragment();
  for (const it of sorted) {
    const card = document.createElement("div");
    card.className = "gallery-thumb";
    card.dataset.id = it.id;
    const img = document.createElement("img");
    img.src = it.image;
    img.alt = `グレード ${it.score}`;
    img.loading = "lazy";
    const scoreChip = document.createElement("div");
    scoreChip.className = "score-chip";
    scoreChip.textContent = it.score;
    const dateChip = document.createElement("div");
    dateChip.className = "date-chip";
    dateChip.textContent = formatDateShort(it.timestamp);
    card.append(img, scoreChip, dateChip);
    card.addEventListener("click", () => openDetail(it.id));
    frag.appendChild(card);
  }
  ui.galleryGrid.appendChild(frag);
}

function openDetail(id) {
  const item = loadGallery().find((it) => it.id === id);
  if (!item) return;
  detailCurrentId = id;
  ui.detailImage.src = item.image;
  ui.detailGrade.textContent = item.score;
  ui.detailRank.textContent = item.rank ?? "";
  ui.detailDate.textContent = formatDateTime(item.timestamp);
  ui.detailBreakdown.innerHTML = "";
  const bd = item.breakdown ?? {};
  const rows = [
    ["盛り", bd.coverage],
    ["均衡", bd.balance],
    ["散らばり", bd.spread],
    ["はみ出し", bd.overflow],
    ["彩り", bd.bonus],
  ];
  for (const [label, val] of rows) {
    if (val == null) continue;
    const li = document.createElement("li");
    li.innerHTML = `${label}<b></b>`;
    li.querySelector("b").textContent = val;
    ui.detailBreakdown.appendChild(li);
  }
  ui.detailOverlay.classList.remove("hidden");
}

function closeDetail() {
  ui.detailOverlay.classList.add("hidden");
  detailCurrentId = null;
}

ui.btnGallery.addEventListener("click", () => {
  startAudio();
  openGallery();
});

ui.btnGalleryClose.addEventListener("click", () => closeGallery());

ui.galleryOverlay.addEventListener("click", (e) => {
  if (e.target === ui.galleryOverlay) closeGallery();
});

ui.btnSaveGallery.addEventListener("click", () => {
  startAudio();
  if (state.gallerySaved) return;
  if (!state.finished || state.placed.length === 0) return;
  let snapshot = state.lastSnapshot;
  if (!snapshot) {
    try {
      snapshot = snapshotPancake(state.placed, {
        cx: layout.cx, cy: layout.cy, pancakeR: layout.pancakeR,
      });
      state.lastSnapshot = snapshot;
    } catch (err) {
      console.error(err);
      return;
    }
  }
  const rankInfo = gradeRank(state.grade);
  const item = {
    id: generateId(),
    image: snapshot,
    score: state.grade,
    rank: `${rankInfo.name} ${rankInfo.stars}`.trim(),
    breakdown: { ...state.breakdown },
    timestamp: Date.now(),
  };
  try {
    saveItem(item);
    state.gallerySaved = true;
    ui.btnSaveGallery.classList.add("saved");
    ui.btnSaveGallery.textContent = "✓ 保存しました";
    ui.btnSaveGallery.disabled = true;
  } catch (err) {
    console.error(err);
    ui.btnSaveGallery.textContent = "保存失敗 (容量不足?)";
  }
});

ui.btnDetailClose.addEventListener("click", () => closeDetail());

ui.detailOverlay.addEventListener("click", (e) => {
  if (e.target === ui.detailOverlay) closeDetail();
});

ui.btnDetailDownload.addEventListener("click", () => {
  if (!detailCurrentId) return;
  const item = loadGallery().find((it) => it.id === detailCurrentId);
  if (!item) return;
  const filename = `pancake_${formatDateShort(item.timestamp).replace(/\//g, "")}_${item.score}.jpg`;
  downloadImage(item.image, filename);
});

ui.btnDetailDelete.addEventListener("click", () => {
  if (!detailCurrentId) return;
  if (!confirm("この作品を削除しますか?")) return;
  deleteItem(detailCurrentId);
  closeDetail();
  renderGallery();
});

// 起動時に保存済みプレイヤー名を復元
try {
  const saved = localStorage.getItem(PLAYER_NAME_KEY);
  if (saved) ui.playerName.value = saved;
} catch {}

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
