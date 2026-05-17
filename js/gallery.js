import { drawTable, drawMainPlate, drawPancake, drawPlacedToppings } from "./draw.js";

const STORAGE_KEY = "pancakeDeco.gallery";
const MAX_ITEMS = 30;
const SNAPSHOT_SIZE = 480;

export function maxItems() { return MAX_ITEMS; }

export function loadGallery() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function persist(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error("gallery: localStorage write failed", err);
    throw err;
  }
}

export function saveItem(item) {
  const items = loadGallery();
  items.push(item);
  // 上限超過 → スコアが低いものから自動削除（同点なら古いものを優先削除）
  while (items.length > MAX_ITEMS) {
    let minIdx = 0;
    for (let i = 1; i < items.length; i++) {
      const a = items[i], b = items[minIdx];
      if (a.score < b.score || (a.score === b.score && a.timestamp < b.timestamp)) {
        minIdx = i;
      }
    }
    items.splice(minIdx, 1);
  }
  persist(items);
  return items;
}

export function deleteItem(id) {
  const items = loadGallery().filter((it) => it.id !== id);
  persist(items);
  return items;
}

export function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// 完成時のホットケーキ＋トッピングを 480x480 の JPEG dataURL に焼く。
// 元のレイアウトとは独立に、中央配置の正方形フレームへトッピング座標を変換する。
export function snapshotPancake(placed, srcLayout) {
  const out = document.createElement("canvas");
  out.width = SNAPSHOT_SIZE;
  out.height = SNAPSHOT_SIZE;
  const c = out.getContext("2d");

  const cx = SNAPSHOT_SIZE / 2;
  const cy = SNAPSHOT_SIZE / 2;
  const targetR = SNAPSHOT_SIZE * 0.32;
  const scale = targetR / srcLayout.pancakeR;

  drawTable(c, SNAPSHOT_SIZE, SNAPSHOT_SIZE);
  drawMainPlate(c, cx, cy, targetR * 1.22);
  drawPancake(c, cx, cy, targetR, 0, 0);

  const translated = placed.map((p) => ({
    toppingId: p.toppingId,
    x: cx + (p.x - srcLayout.cx) * scale,
    y: cy + (p.y - srcLayout.cy) * scale,
    rotation: p.rotation,
    scale: p.scale * scale,
  }));
  drawPlacedToppings(c, translated);

  return out.toDataURL("image/jpeg", 0.85);
}

export function downloadImage(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
