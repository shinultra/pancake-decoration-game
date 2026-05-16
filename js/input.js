// 入力処理: マウスとタッチを統一インターフェイスでハンドリング。
// 外部からは attachInput(canvas, handlers) を呼ぶ。handlers は:
//   onPointerDown(x, y)
//   onPointerMove(x, y)
//   onPointerUp(x, y)

export function attachInput(canvas, handlers) {
  let activePointerId = null;

  function clientToCanvas(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  function down(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (activePointerId !== null) return;
    activePointerId = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    const { x, y } = clientToCanvas(e.clientX, e.clientY);
    handlers.onPointerDown(x, y);
    e.preventDefault();
  }
  function move(e) {
    if (e.pointerId !== activePointerId) return;
    const { x, y } = clientToCanvas(e.clientX, e.clientY);
    handlers.onPointerMove(x, y);
    e.preventDefault();
  }
  function up(e) {
    if (e.pointerId !== activePointerId) return;
    const { x, y } = clientToCanvas(e.clientX, e.clientY);
    handlers.onPointerUp(x, y);
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    activePointerId = null;
    e.preventDefault();
  }
  function cancel(e) {
    if (e.pointerId !== activePointerId) return;
    handlers.onPointerUp(NaN, NaN); // キャンセル合図として NaN を渡す
    activePointerId = null;
  }

  canvas.addEventListener("pointerdown", down, { passive: false });
  canvas.addEventListener("pointermove", move, { passive: false });
  canvas.addEventListener("pointerup", up, { passive: false });
  canvas.addEventListener("pointercancel", cancel, { passive: false });

  // iOS でうっかりスクロールを誘発しないように
  canvas.addEventListener("touchstart", e => e.preventDefault(), { passive: false });
  canvas.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
}
