function clear(ctx, w, h) {
  ctx.clearRect(0,0,w,h);
}

function drawGrid(ctx, w, h) {
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  const steps = 4;
  for (let i=1;i<=steps;i++){
    const y = (h/steps)*i;
    ctx.moveTo(0,y);
    ctx.lineTo(w,y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawBars(canvas, labels, values, titleHint="") {
  const ctx = canvas.getContext("2d");
  const w = canvas.width = canvas.clientWidth * devicePixelRatio;
  const h = canvas.height = 180 * devicePixelRatio;

  clear(ctx,w,h);

  // styling
  ctx.strokeStyle = "rgba(255,255,255,.18)";
  ctx.fillStyle = "rgba(255,255,255,.86)";
  ctx.font = `${12*devicePixelRatio}px system-ui`;

  drawGrid(ctx,w,h);

  const maxV = Math.max(1, ...values);
  const padding = 16 * devicePixelRatio;
  const baseY = h - padding - 18*devicePixelRatio;
  const barW = (w - padding*2) / labels.length * 0.62;
  const gap = (w - padding*2) / labels.length * 0.38;

  for (let i=0;i<labels.length;i++){
    const xSlot = padding + i*((barW+gap));
    const barH = (values[i] / maxV) * (h - padding*2 - 28*devicePixelRatio);
    const x = xSlot + gap/2;
    const y = baseY - barH;

    // bar
    ctx.fillStyle = "rgba(94,234,212,.55)";
    ctx.fillRect(x, y, barW, barH);

    // value
    ctx.fillStyle = "rgba(255,255,255,.85)";
    ctx.fillText(String(values[i]), x, y - 6*devicePixelRatio);

    // label
    ctx.fillStyle = "rgba(167,179,214,.85)";
    ctx.fillText(labels[i], x, h - padding);
  }
}

export const Charts = {
  bar(canvas, labels, values) {
    drawBars(canvas, labels, values);
  }
};
