// フルシンセサイズの BGM + 効果音エンジン。外部音源ファイル不要。
// Web Audio API のみで、ミュージックボックス調の暖かい音色を構築する。

let ctx = null;
let master = null;
let bgmGain = null;
let bgmReverbSend = null;
let seGain = null;
let seReverbSend = null;
let reverbInput = null;
let bgmTimer = null;
let bgmStep = 0;
let bgmNextTime = 0;
let bgmRunning = false;
let muted = false;
try { muted = localStorage.getItem("hkdg.muted") === "1"; } catch (_) {}

const BPM = 88;
const STEP_DUR = 60 / BPM / 2;       // 8分音符
const STEPS_PER_LOOP = 64;           // 8小節 × 8拍

// ミュージックボックス／ベル風の非調和倍音比
const BELL_PARTIALS = [
  { ratio: 1.00, amp: 1.00, decay: 1.00 },
  { ratio: 2.01, amp: 0.42, decay: 0.85 },
  { ratio: 3.03, amp: 0.20, decay: 0.65 },
  { ratio: 4.90, amp: 0.10, decay: 0.45 },
];

// メロディ (64ステップ、8分音符、C major)
// コード進行: C - Am - F - G (×2、後半は変奏)
const MELODY = [
  // 小節1 (C): 上昇アーチ
  523.25, 659.25, 783.99, 1046.5, 1318.5, 783.99, 1046.5, 659.25,
  // 小節2 (Am)
  523.25, 659.25, 880.00, 1046.5, 1318.5, 1046.5, 880.00, 659.25,
  // 小節3 (F)
  698.46, 880.00, 1046.5, 1396.9, 1046.5, 880.00, 698.46, 523.25,
  // 小節4 (G)
  783.99, 987.77, 1174.7, 1567.9, 1174.7, 987.77, 783.99, 587.33,
  // 小節5 (C - 変奏)
  659.25, 783.99, 1046.5, 659.25, 783.99, 523.25, 659.25, 880.00,
  // 小節6 (Am)
  440.00, 523.25, 659.25, 880.00, 1046.5, 880.00, 659.25, 523.25,
  // 小節7 (F)
  440.00, 523.25, 698.46, 880.00, 1046.5, 880.00, 698.46, 523.25,
  // 小節8 (G → C へ戻る)
  392.00, 493.88, 587.33, 783.99, 987.77, 783.99, 587.33, 493.88,
];

// ベース: 各小節の1拍目と3拍目（4ステップごと）
const BASS = new Array(STEPS_PER_LOOP).fill(null);
BASS[0]  = 130.81; BASS[4]  = 196.00;  // C3 / G3
BASS[8]  = 110.00; BASS[12] = 164.81;  // A2 / E3
BASS[16] = 174.61; BASS[20] = 130.81;  // F3 / C3
BASS[24] = 196.00; BASS[28] = 146.83;  // G3 / D3
BASS[32] = 130.81; BASS[36] = 196.00;
BASS[40] = 110.00; BASS[44] = 164.81;
BASS[48] = 174.61; BASS[52] = 130.81;
BASS[56] = 196.00; BASS[60] = 146.83;

// --- 合成プリミティブ ---

function bell(freq, time, dur, vol, output, reverbSend = null) {
  for (const p of BELL_PARTIALS) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq * p.ratio;
    osc.connect(gain);
    gain.connect(output);
    if (reverbSend) gain.connect(reverbSend);
    const pDur = dur * p.decay;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol * p.amp, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0005, time + pDur);
    osc.start(time);
    osc.stop(time + pDur + 0.05);
  }
}

function bassNote(freq, time, dur, vol, output) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = "triangle";
  osc.frequency.value = freq;
  filter.type = "lowpass";
  filter.frequency.value = freq * 4;
  filter.Q.value = 0.5;
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(output);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(vol, time + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0005, time + dur);
  osc.start(time);
  osc.stop(time + dur + 0.05);
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

// --- BGM スケジューラ ---

function scheduleBGM() {
  if (!ctx || !bgmRunning) return;
  const lookahead = 0.2;
  while (bgmNextTime < ctx.currentTime + lookahead) {
    const step = bgmStep;
    const t = bgmNextTime;

    // メロディ
    bell(MELODY[step], t, 0.55, 0.10, bgmGain, bgmReverbSend);

    // ベース (拍頭のみ)
    if (BASS[step]) {
      bassNote(BASS[step], t, 0.9, 0.20, bgmGain);
    }

    // 装飾スパークル (オフビート 10%)
    if ((step % 2) === 1 && Math.random() < 0.10) {
      const sparkleF = 1800 + Math.random() * 2200;
      bell(sparkleF, t + STEP_DUR * 0.5, 0.35, 0.04, bgmGain, bgmReverbSend);
    }

    // 小節末のフィル (35%)
    if ((step === 7 || step === 23 || step === 39 || step === 55) && Math.random() < 0.35) {
      bell(MELODY[step] * 1.5, t + STEP_DUR * 0.5, 0.4, 0.05, bgmGain, bgmReverbSend);
    }

    bgmStep = (bgmStep + 1) % STEPS_PER_LOOP;
    bgmNextTime += STEP_DUR;
  }
}

// --- 公開API ---

export function startAudio() {
  if (ctx) {
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    if (!bgmRunning) {
      bgmRunning = true;
      bgmStep = 0;
      bgmNextTime = ctx.currentTime + 0.15;
    }
    if (!bgmTimer) bgmTimer = setInterval(scheduleBGM, 50);
    return;
  }

  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();

  // マスター + リミッタ
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.55;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.knee.value = 6;
  limiter.ratio.value = 8;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.1;
  master.connect(limiter);
  limiter.connect(ctx.destination);

  // BGM / SE バス
  bgmGain = ctx.createGain();
  bgmGain.gain.value = 0.45;
  bgmGain.connect(master);

  seGain = ctx.createGain();
  seGain.gain.value = 0.75;
  seGain.connect(master);

  // フィードバック・ディレイ・リバーブ
  reverbInput = ctx.createGain();
  reverbInput.gain.value = 1.0;
  const delay = ctx.createDelay(1.0);
  delay.delayTime.value = 0.17;
  const fb = ctx.createGain();
  fb.gain.value = 0.34;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2400;
  const reverbOut = ctx.createGain();
  reverbOut.gain.value = 0.55;
  reverbInput.connect(delay);
  delay.connect(lp);
  lp.connect(fb);
  fb.connect(delay);
  delay.connect(reverbOut);
  reverbOut.connect(master);

  // 各バスのリバーブ送り
  bgmReverbSend = ctx.createGain();
  bgmReverbSend.gain.value = 0.18;
  bgmReverbSend.connect(reverbInput);
  seReverbSend = ctx.createGain();
  seReverbSend.gain.value = 0.5;
  seReverbSend.connect(reverbInput);

  // BGM 開始
  bgmRunning = true;
  bgmStep = 0;
  bgmNextTime = ctx.currentTime + 0.15;
  bgmTimer = setInterval(scheduleBGM, 50);

  // タブ復帰時に suspended なら resume
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.visibilityState === "visible" && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  });
}

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem("hkdg.muted", muted ? "1" : "0"); } catch (_) {}
  if (master && ctx) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(muted ? 0 : 0.55, ctx.currentTime + 0.1);
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
  // 上昇アルペジオ
  const seq = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.5, 1568.0, 1975.5, 2093.0];
  seq.forEach((f, i) => {
    bell(f, t + i * 0.075, 1.0, 0.14, seGain, seReverbSend);
  });
  // シマークラウド
  for (let i = 0; i < 35; i++) {
    const f = 1500 + Math.random() * 3500;
    const dt = t + 0.4 + Math.random() * 2.6;
    bell(f, dt, 0.4, 0.025 + Math.random() * 0.025, seGain, seReverbSend);
  }
  // 低音インパクト
  bassNote(65.4, t, 1.5, 0.18, seGain);
  bassNote(130.81, t + 0.1, 1.0, 0.12, seGain);
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
