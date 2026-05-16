// 多層シンセサイズの BGM + 効果音エンジン。Web Audio API 完結、外部音源不要。
// レイヤ構成: ベルメロディ / 暖かいサウォースパッド / ディチューン・ベース / ノイズシェイカー
// 全てフィードバック・ディレイのライトリバーブを経由。

let ctx = null;
let master, bgmGain, padGain, bassGain, percGain, seGain;
let reverbInput, bgmReverbSend, seReverbSend, padReverbSend;
let bgmTimer = null;
let bgmCurrentBar = 0;
let bgmNextBarTime = 0;
let bgmRunning = false;
let muted = false;
try { muted = localStorage.getItem("hkdg.muted") === "1"; } catch (_) {}

const BPM = 80;
const BAR_DUR = (60 * 4) / BPM;        // 4 beats per bar = 3秒
const STEP_DUR = BAR_DUR / 8;          // 8分音符 = 0.375秒
const LOOP_BARS = 8;

// コード進行: Cmaj7 - Am7 - Dm7 - G7 (×2、後半はメロディ変奏)
// パッドは root を省略した3声ボイシング (bass が root を担当)
const PAD_CHORDS = [
  [329.63, 392.00, 493.88], // Cmaj7: E4 G4 B4
  [329.63, 392.00, 523.25], // Am7:   E4 G4 C5
  [349.23, 440.00, 523.25], // Dm7:   F4 A4 C5
  [349.23, 493.88, 587.33], // G7:    F4 B4 D5
];

// ベース: 各小節の1拍目と3拍目
const BASS_LINE = [
  [65.41, 98.00],  // Cmaj7: C2, G2
  [110.00, 82.41], // Am7:   A2, E2
  [73.42, 110.00], // Dm7:   D2, A2
  [98.00, 73.42],  // G7:    G2, D2
];

// メロディ (8 bars × 8 eighth-notes = 64 notes)
const MELODY = [
  // Bar 1 (Cmaj7): E G B G E G B D
  659.25, 783.99, 987.77, 783.99, 659.25, 783.99, 987.77, 1174.66,
  // Bar 2 (Am7):   E G C G E G C E
  659.25, 783.99, 1046.50, 783.99, 659.25, 783.99, 1046.50, 1318.51,
  // Bar 3 (Dm7):   F A C A F A C F
  698.46, 880.00, 1046.50, 880.00, 698.46, 880.00, 1046.50, 1396.91,
  // Bar 4 (G7):    F B D B F B D G
  698.46, 987.77, 1174.66, 987.77, 698.46, 987.77, 1174.66, 1567.98,
  // Bar 5 (Cmaj7): C↓→ pattern
  1046.50, 987.77, 783.99, 659.25, 783.99, 659.25, 783.99, 987.77,
  // Bar 6 (Am7):
  1046.50, 1318.51, 1046.50, 783.99, 659.25, 783.99, 1046.50, 1318.51,
  // Bar 7 (Dm7):
  880.00, 1396.91, 1046.50, 880.00, 698.46, 880.00, 1174.66, 1396.91,
  // Bar 8 (G7): turnaround down
  1174.66, 1567.98, 1174.66, 987.77, 698.46, 587.33, 493.88, 392.00,
];

// ベル倍音 (やや穏やかな比でアタックがキツくなりすぎないように)
const BELL_PARTIALS = [
  { ratio: 1.00, amp: 1.00, decay: 1.00 },
  { ratio: 2.00, amp: 0.32, decay: 0.80 },
  { ratio: 3.00, amp: 0.15, decay: 0.60 },
  { ratio: 4.93, amp: 0.07, decay: 0.40 },
];

// --- 合成プリミティブ ---

function bell(freq, time, dur, vol, output, reverb = null) {
  for (const p of BELL_PARTIALS) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq * p.ratio;
    osc.connect(gain);
    gain.connect(output);
    if (reverb) gain.connect(reverb);
    const pDur = dur * p.decay;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol * p.amp, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0005, time + pDur);
    osc.start(time);
    osc.stop(time + pDur + 0.05);
  }
}

// 暖かいパッド: 3つのディチューン・サウォース + フィルタエンベロープ + 遅いLFO
function pad(freq, time, dur, vol, output, reverb = null) {
  const sumGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 2.5;
  filter.connect(sumGain);
  sumGain.connect(output);
  if (reverb) sumGain.connect(reverb);

  // フィルタエンベロープ: 700 → 2400 → 1100 → 500 (3秒スパン)
  filter.frequency.setValueAtTime(700, time);
  filter.frequency.linearRampToValueAtTime(2400, time + 0.4);
  filter.frequency.linearRampToValueAtTime(1100, time + dur * 0.55);
  filter.frequency.linearRampToValueAtTime(500, time + dur);

  // 遅いLFO で柔らかい揺らぎ
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = "sine";
  lfo.frequency.value = 0.35;
  lfoGain.gain.value = 180;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start(time);
  lfo.stop(time + dur + 0.05);

  // 3 voice unison ディチューン
  for (const cents of [-8, 0, +8]) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    osc.detune.value = cents;
    osc.connect(filter);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  // 音量エンベロープ: ゆっくり立ち上がり / リリース
  sumGain.gain.setValueAtTime(0, time);
  sumGain.gain.linearRampToValueAtTime(vol, time + 0.25);
  sumGain.gain.setValueAtTime(vol, time + dur - 0.4);
  sumGain.gain.linearRampToValueAtTime(0, time + dur);
}

// 太いベース: ディチューン・トライアングル + サブのサイン + ローパス
function bass(freq, time, dur, vol, output) {
  const sumGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = freq * 5.5;
  filter.Q.value = 0.6;
  filter.connect(sumGain);
  sumGain.connect(output);

  for (const cents of [-6, +6]) {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    osc.detune.value = cents;
    osc.connect(filter);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }
  // オクターブ上のサブ・サイン (明瞭感)
  const sub = ctx.createOscillator();
  const subGain = ctx.createGain();
  sub.type = "sine";
  sub.frequency.value = freq * 2;
  subGain.gain.value = 0.22;
  sub.connect(subGain);
  subGain.connect(sumGain);
  sub.start(time);
  sub.stop(time + dur + 0.05);

  sumGain.gain.setValueAtTime(0, time);
  sumGain.gain.linearRampToValueAtTime(vol, time + 0.03);
  sumGain.gain.exponentialRampToValueAtTime(0.0005, time + dur);
}

// ノイズシェイカー: 帯域通過させたホワイトノイズの短いバースト
function shaker(time, dur, vol, output) {
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 4800;
  filter.Q.value = 1.4;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(vol, time + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0005, time + dur);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(output);

  src.start(time);
  src.stop(time + dur + 0.05);
}

function sweep(freqStart, freqEnd, time, dur, vol, output, type = "sine") {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, time);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), time + dur);
  osc.connect(gain);
  gain.connect(output);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(vol, time + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0005, time + dur);
  osc.start(time);
  osc.stop(time + dur + 0.05);
}

// --- BGM 小節スケジュール ---

function scheduleBar(barIdx, barStart) {
  const chordIdx = barIdx % 4;
  const chord = PAD_CHORDS[chordIdx];
  const bassPattern = BASS_LINE[chordIdx];

  // パッドコード (3声)
  chord.forEach(f => pad(f, barStart, BAR_DUR * 0.96, 0.045, padGain, padReverbSend));

  // ベース (1拍目・3拍目)
  bass(bassPattern[0], barStart, STEP_DUR * 4 * 0.95, 0.16, bassGain);
  bass(bassPattern[1], barStart + STEP_DUR * 4, STEP_DUR * 4 * 0.95, 0.16, bassGain);

  // メロディ (8分音符)
  const melodyStart = barIdx * 8;
  for (let i = 0; i < 8; i++) {
    const f = MELODY[melodyStart + i];
    const t = barStart + i * STEP_DUR;
    bell(f, t, STEP_DUR * 1.6, 0.085, bgmGain, bgmReverbSend);
  }

  // シェイカー (8分裏が少し強め、表は弱め)
  for (let i = 0; i < 8; i++) {
    const t = barStart + i * STEP_DUR;
    const v = (i % 2 === 0) ? 0.022 : 0.038;
    shaker(t, 0.065, v, percGain);
  }

  // 小節末のフィル装飾 (4小節ごとに 50% 確率)
  if ((barIdx === 3 || barIdx === 7) && Math.random() < 0.5) {
    const top = MELODY[melodyStart + 7] * 1.5;
    bell(top, barStart + STEP_DUR * 7.5, 0.5, 0.05, bgmGain, bgmReverbSend);
  }

  // 装飾の高音スパークル (たまに)
  if (Math.random() < 0.25) {
    const sf = 1800 + Math.random() * 2200;
    const st = barStart + Math.random() * BAR_DUR;
    bell(sf, st, 0.45, 0.035, bgmGain, bgmReverbSend);
  }
}

function scheduleBGM() {
  if (!ctx || !bgmRunning) return;
  const lookahead = 0.4;
  while (bgmNextBarTime < ctx.currentTime + lookahead) {
    scheduleBar(bgmCurrentBar, bgmNextBarTime);
    bgmCurrentBar = (bgmCurrentBar + 1) % LOOP_BARS;
    bgmNextBarTime += BAR_DUR;
  }
}

// --- iOS / Mobile アンロック ---

function iosUnlock() {
  if (!ctx) return;
  try {
    // 無音バッファを再生して iOS の WebAudio セッションをアクティブ化
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch (_) {}
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

// --- 公開API ---

export function startAudio() {
  if (ctx) {
    iosUnlock();
    if (!bgmRunning) {
      bgmRunning = true;
      bgmCurrentBar = 0;
      bgmNextBarTime = ctx.currentTime + 0.15;
    }
    if (!bgmTimer) bgmTimer = setInterval(scheduleBGM, 100);
    return;
  }

  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;

  ctx = new AC();

  // マスター + リミッタ
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.7;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -5;
  limiter.knee.value = 8;
  limiter.ratio.value = 10;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.12;
  master.connect(limiter);
  limiter.connect(ctx.destination);

  // バス: メロディ / パッド / ベース / 打楽器 / SE
  bgmGain  = ctx.createGain(); bgmGain.gain.value  = 0.32; bgmGain.connect(master);
  padGain  = ctx.createGain(); padGain.gain.value  = 0.40; padGain.connect(master);
  bassGain = ctx.createGain(); bassGain.gain.value = 0.55; bassGain.connect(master);
  percGain = ctx.createGain(); percGain.gain.value = 0.38; percGain.connect(master);
  seGain   = ctx.createGain(); seGain.gain.value   = 0.85; seGain.connect(master);

  // フィードバック・ディレイ・リバーブ (やや長めの空間)
  reverbInput = ctx.createGain();
  reverbInput.gain.value = 1.0;
  const delay = ctx.createDelay(2.0);
  delay.delayTime.value = 0.21;
  const fb = ctx.createGain();
  fb.gain.value = 0.42;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2200;
  const reverbOut = ctx.createGain();
  reverbOut.gain.value = 0.55;
  reverbInput.connect(delay);
  delay.connect(lp);
  lp.connect(fb);
  fb.connect(delay);
  delay.connect(reverbOut);
  reverbOut.connect(master);

  // 各バスのリバーブ送り
  bgmReverbSend = ctx.createGain(); bgmReverbSend.gain.value = 0.22; bgmReverbSend.connect(reverbInput);
  padReverbSend = ctx.createGain(); padReverbSend.gain.value = 0.30; padReverbSend.connect(reverbInput);
  seReverbSend  = ctx.createGain(); seReverbSend.gain.value  = 0.55; seReverbSend.connect(reverbInput);

  // iOS / モバイル のアンロック
  iosUnlock();

  // BGM 開始
  bgmRunning = true;
  bgmCurrentBar = 0;
  bgmNextBarTime = ctx.currentTime + 0.2;
  bgmTimer = setInterval(scheduleBGM, 100);

  // タブ復帰時に suspended なら resume
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.visibilityState === "visible") {
      ctx.resume().catch(() => {});
    }
  });
}

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem("hkdg.muted", muted ? "1" : "0"); } catch (_) {}
  if (master && ctx) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(muted ? 0 : 0.7, ctx.currentTime + 0.12);
  }
  return muted;
}

export function isMuted() { return muted; }

function ready() {
  return ctx && ctx.state === "running" && !muted;
}

// --- 効果音 ---

export function playPickup() {
  if (!ready()) return;
  const t = ctx.currentTime;
  bell(880, t, 0.25, 0.13, seGain, seReverbSend);
  bell(1175, t + 0.05, 0.25, 0.11, seGain, seReverbSend);
}

export function playPlace() {
  if (!ready()) return;
  const t = ctx.currentTime;
  bell(1320, t, 0.6, 0.16, seGain, seReverbSend);
  bell(1980, t + 0.005, 0.5, 0.08, seGain, seReverbSend);
  bell(2640, t + 0.02, 0.3, 0.04, seGain, seReverbSend);
}

export function playSwitch() {
  if (!ready()) return;
  const t = ctx.currentTime;
  bell(660, t, 0.18, 0.12, seGain, seReverbSend);
}

export function playDelete() {
  if (!ready()) return;
  const t = ctx.currentTime;
  sweep(880, 220, t, 0.25, 0.10, seGain, "triangle");
}

export function playWrong() {
  if (!ready()) return;
  const t = ctx.currentTime;
  sweep(220, 130, t, 0.22, 0.10, seGain, "sine");
}

export function playUnlock() {
  if (!ready()) return;
  const t = ctx.currentTime;
  const seq = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.5, 1568.0, 1975.5, 2093.0];
  seq.forEach((f, i) => {
    bell(f, t + i * 0.075, 1.0, 0.14, seGain, seReverbSend);
  });
  for (let i = 0; i < 35; i++) {
    const f = 1500 + Math.random() * 3500;
    const dt = t + 0.4 + Math.random() * 2.6;
    bell(f, dt, 0.4, 0.025 + Math.random() * 0.025, seGain, seReverbSend);
  }
  bass(65.4, t, 1.5, 0.18, seGain);
  bass(130.81, t + 0.1, 1.0, 0.12, seGain);
}

export function playFinish() {
  if (!ready()) return;
  const t = ctx.currentTime;
  const seq = [523.25, 659.25, 783.99, 1046.5];
  seq.forEach((f, i) => {
    bell(f, t + i * 0.13, 0.7, 0.18, seGain, seReverbSend);
  });
  const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5];
  chord.forEach(f => {
    bell(f, t + 0.62, 1.8, 0.10, seGain, seReverbSend);
  });
}

// --- 自動アンロック (フォールバック) ---
// canvas の pointerdown だけでなく、ドキュメント側の各種入力でも startAudio を呼ぶ。
// iOS Safari など、最初の touch を確実に user-gesture として捕まえる保険。
(function attachAutoUnlock() {
  if (typeof document === "undefined") return;
  const handler = () => { try { startAudio(); } catch (_) {} };
  const events = ["pointerdown", "touchend", "mousedown", "keydown"];
  events.forEach(evt => {
    document.addEventListener(evt, handler, { passive: true, capture: true });
  });
})();
