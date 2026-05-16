import { TOPPING_MAP, toppingArea } from "./toppings.js";

// 採点アルゴリズム。盛りつけバランス重視。
// placed: [{ toppingId, x, y, rotation, scale }, ...]
// pancake: { cx, cy, r }  (r は楕円の長半径; 高さは r*0.9 で扱う)
// 戻り値: { grade, breakdown: { coverage, balance, spread, overflow, bonus } }

export function computeGrade(placed, pancake) {
  const breakdown = { coverage: 0, balance: 0, spread: 0, overflow: 0, bonus: 0 };
  if (placed.length === 0) {
    return { grade: 0, breakdown };
  }

  const { cx, cy, r } = pancake;
  const ryEll = r * 0.9; // 楕円の縦半径
  const pancakeArea = Math.PI * r * ryEll;

  // 1. カバー率 (0-40)
  // 各トッピングの占有面積をホットケーキ内成分のみで合算
  let coveredArea = 0;
  for (const p of placed) {
    const t = TOPPING_MAP[p.toppingId];
    if (!t) continue;
    const insideFrac = pointInsidePancakeFrac(p.x, p.y, cx, cy, r, ryEll);
    coveredArea += toppingArea(t, p.scale) * insideFrac;
  }
  const coverage = coveredArea / pancakeArea;
  // 0.55 で満点、0.20以下と1.0以上で0点。台形カーブ
  const idealMin = 0.40;
  const idealMax = 0.70;
  let covScore;
  if (coverage < idealMin) {
    covScore = (coverage / idealMin) * 40;
  } else if (coverage <= idealMax) {
    covScore = 40;
  } else {
    // 過剰 → 1.2で 0 点まで線形に落ちる
    const t = (coverage - idealMax) / (1.2 - idealMax);
    covScore = 40 * (1 - Math.min(1, t));
  }
  breakdown.coverage = Math.round(covScore);

  // 2. 分布バランス (0-30)
  // 重心オフセット
  let mx = 0, my = 0;
  for (const p of placed) {
    mx += p.x;
    my += p.y;
  }
  mx /= placed.length;
  my /= placed.length;
  const dx = (mx - cx) / r;
  const dy = (my - cy) / ryEll;
  const offset = Math.sqrt(dx * dx + dy * dy);
  // 0.0 で 30 点, 0.6 以上で 0 点
  const balScore = Math.max(0, 30 * (1 - offset / 0.6));
  breakdown.balance = Math.round(balScore);

  // 3. 散らばり (0-30)
  // 各トッピングの最近傍距離の平均と分散を見る。
  // 平均距離 / 期待距離 が 1 に近く、分散が小さいほど高得点。
  let spreadScore;
  if (placed.length === 1) {
    // 単体は中央寄せボーナス
    spreadScore = 15;
  } else {
    const nnDists = [];
    for (let i = 0; i < placed.length; i++) {
      let best = Infinity;
      for (let j = 0; j < placed.length; j++) {
        if (i === j) continue;
        const ddx = placed[i].x - placed[j].x;
        const ddy = placed[i].y - placed[j].y;
        const d = Math.hypot(ddx, ddy);
        if (d < best) best = d;
      }
      nnDists.push(best);
    }
    const avg = nnDists.reduce((a, b) => a + b, 0) / nnDists.length;
    // 期待距離: ホットケーキの面積を全トッピング数で割った正方格子の辺長
    const expected = Math.sqrt(pancakeArea / placed.length) * 0.85;
    const ratio = Math.min(avg, expected) / Math.max(avg, expected); // 0..1
    // 分散 (CV)
    const variance = nnDists.reduce((a, b) => a + (b - avg) ** 2, 0) / nnDists.length;
    const cv = Math.sqrt(variance) / Math.max(avg, 1); // 0..∞、小さいほど均等
    const evenness = Math.max(0, 1 - cv);              // 0..1
    spreadScore = 30 * (0.55 * ratio + 0.45 * evenness);
  }
  breakdown.spread = Math.round(spreadScore);

  // 4. はみ出しペナルティ (0 ~ -30)
  let overflowAmount = 0;
  for (const p of placed) {
    const t = TOPPING_MAP[p.toppingId];
    if (!t) continue;
    const outsideFrac = 1 - pointInsidePancakeFrac(p.x, p.y, cx, cy, r, ryEll);
    overflowAmount += outsideFrac * toppingArea(t, p.scale);
  }
  // 全体トッピング面積に対するはみ出し割合
  const totalArea = placed.reduce((sum, p) => {
    const t = TOPPING_MAP[p.toppingId];
    return sum + (t ? toppingArea(t, p.scale) : 0);
  }, 0);
  const outFrac = totalArea > 0 ? overflowAmount / totalArea : 0;
  // 5% までは無視、それ以上は減点
  const overScore = -Math.min(30, Math.max(0, (outFrac - 0.05) * 80));
  breakdown.overflow = Math.round(overScore);

  // 5. ボーナス
  // 種類数
  const kinds = new Set(placed.map(p => p.toppingId));
  let varietyBonus = 0;
  if (kinds.size >= 3) varietyBonus += 5;
  if (kinds.size >= 5) varietyBonus += 5;
  if (kinds.size >= 7) varietyBonus += 5;

  // 同色クランプ抑制: 同 colorTag 同士がベタっと固まっていなければ +
  // 各トッピングについて、最近傍が同色だった割合
  let sameColorAdjacency = 0;
  if (placed.length >= 4) {
    for (let i = 0; i < placed.length; i++) {
      const ti = TOPPING_MAP[placed[i].toppingId];
      if (!ti) continue;
      let bestJ = -1;
      let bestD = Infinity;
      for (let j = 0; j < placed.length; j++) {
        if (i === j) continue;
        const ddx = placed[i].x - placed[j].x;
        const ddy = placed[i].y - placed[j].y;
        const d = Math.hypot(ddx, ddy);
        if (d < bestD) { bestD = d; bestJ = j; }
      }
      if (bestJ >= 0) {
        const tj = TOPPING_MAP[placed[bestJ].toppingId];
        if (tj && tj.colorTag === ti.colorTag) sameColorAdjacency++;
      }
    }
    const ratio = sameColorAdjacency / placed.length;
    // 同色隣接 30% 以下なら +5、10% 以下なら +5 追加
    if (ratio <= 0.30) varietyBonus += 5;
    if (ratio <= 0.10) varietyBonus += 5;
  }

  // プレミアム使用ボーナス（プレミアム1個ごとに +2、最大+10）
  const premiumCount = placed.filter(p => {
    const t = TOPPING_MAP[p.toppingId];
    return t && t.tier === 2;
  }).length;
  varietyBonus += Math.min(10, premiumCount * 2);

  breakdown.bonus = varietyBonus;

  const grade = Math.max(0,
    breakdown.coverage + breakdown.balance + breakdown.spread +
    breakdown.overflow + breakdown.bonus
  );

  return { grade: Math.round(grade), breakdown };
}

// ホットケーキ楕円内のフラクション。中心が中なら 1、外なら 0、境界付近はスムージング。
function pointInsidePancakeFrac(x, y, cx, cy, rx, ry) {
  const ndx = (x - cx) / rx;
  const ndy = (y - cy) / ry;
  const d = Math.sqrt(ndx * ndx + ndy * ndy);
  if (d <= 0.85) return 1;
  if (d >= 1.05) return 0;
  return (1.05 - d) / 0.20;
}

// ランク称号
export function gradeRank(grade) {
  if (grade >= 130) return { name: "神の手", stars: "★★★★★+" };
  if (grade >= 110) return { name: "シェフ・ド・パティスリー", stars: "★★★★★" };
  if (grade >= 100) return { name: "パティシエ・スター", stars: "★★★★★" };
  if (grade >= 85)  return { name: "パティシエ", stars: "★★★★☆" };
  if (grade >= 65)  return { name: "見習い職人", stars: "★★★☆☆" };
  if (grade >= 45)  return { name: "上達中", stars: "★★☆☆☆" };
  if (grade >= 20)  return { name: "練習中", stars: "★☆☆☆☆" };
  return { name: "修行中…", stars: "☆☆☆☆☆" };
}
