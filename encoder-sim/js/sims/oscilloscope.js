/* Oscilloscope — grid canvas, N traces, sweep cursor.
   opts: {title, xLabel, xMin, xMax, yLabel, yMin, yMax, traces:[{label,color,fn(x),dash?}], fmtY} */
window.ENC_SIMS = window.ENC_SIMS || {};
window.ENC_SIMS.scope = function(container, opts){
  const DPR = window.devicePixelRatio || 1;
  const W = 680, H = 300, padL = 46, padR = 10, padT = 26, padB = 30;
  const canvas = document.createElement('canvas');
  canvas.className = 'sim-canvas';
  canvas.width = W * DPR; canvas.height = H * DPR; canvas.style.aspectRatio = (W + '/' + H);
  const ctx = canvas.getContext('2d'); ctx.scale(DPR, DPR);
  let running = true, sweepX = 0, lastT = 0, raf = null;

  const foot = document.createElement('div');
  foot.innerHTML = `<div class="wave-legend">${opts.traces.map(t => `<span><i style="background:${t.color}"></i>${t.label}</span>`).join('')}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;gap:10px;flex-wrap:wrap">
      <span class="spec-note" style="margin:0">${opts.title || ''} · x: ${opts.xLabel || 'angle'} · y: ${opts.yLabel || 'amplitude'}</span>
      <button class="btn" type="button">⏸ Freeze</button>
    </div>`;
  const freezeBtn = foot.querySelector('button');
  freezeBtn.addEventListener('click', () => {
    running = !running;
    freezeBtn.textContent = running ? '⏸ Freeze' : '▶ Run';
    if(running){ lastT = performance.now(); tick(lastT); }
  });

  const xToPx = x => padL + (x - opts.xMin) / (opts.xMax - opts.xMin) * (W - padL - padR);
  const yToPx = y => padT + (1 - (y - opts.yMin) / (opts.yMax - opts.yMin)) * (H - padT - padB);

  function draw(){
    ctx.clearRect(0, 0, W, H);
    // graticule
    ctx.strokeStyle = '#1B2532'; ctx.fillStyle = '#5C6879'; ctx.lineWidth = 1; ctx.font = '9px ui-monospace,monospace';
    for(let i = 0; i <= 10; i++){
      const x = padL + i * (W - padL - padR) / 10;
      ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, H - padB); ctx.stroke();
      if(i % 2 === 0) ctx.fillText((opts.xMin + i * (opts.xMax - opts.xMin) / 10).toFixed(0), x - 8, H - padB + 13);
    }
    for(let j = 0; j <= 6; j++){
      const y = padT + j * (H - padT - padB) / 6;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      ctx.fillText((opts.yMax - j * (opts.yMax - opts.yMin) / 6).toFixed(1), 4, y + 3);
    }
    // zero line if in range
    if(opts.yMin < 0 && opts.yMax > 0){
      ctx.strokeStyle = '#2C3A4E'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(padL, yToPx(0)); ctx.lineTo(W - padR, yToPx(0)); ctx.stroke();
    }
    // traces
    opts.traces.forEach(tr => {
      ctx.strokeStyle = tr.color; ctx.lineWidth = 2; ctx.setLineDash(tr.dash || []);
      ctx.shadowColor = tr.color; ctx.shadowBlur = 5;
      ctx.beginPath();
      const N = 480;
      for(let i = 0; i <= N; i++){
        const x = opts.xMin + (opts.xMax - opts.xMin) * i / N;
        const y = tr.fn(x);
        const px = xToPx(x), py = yToPx(window.ENC_UI.clamp(y, opts.yMin, opts.yMax));
        if(i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke(); ctx.shadowBlur = 0; ctx.setLineDash([]);
    });
    // sweep cursor
    if(running || sweepX > 0){
      const px = xToPx(sweepX);
      ctx.strokeStyle = 'rgba(226,232,240,.55)'; ctx.lineWidth = 1.2; ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(px, padT); ctx.lineTo(px, H - padB); ctx.stroke(); ctx.setLineDash([]);
    }
    // frame
    ctx.strokeStyle = '#253041'; ctx.strokeRect(padL, padT, W - padL - padR, H - padT - padB);
    ctx.fillStyle = '#8B97AB'; ctx.font = '10px ui-monospace,monospace';
    ctx.fillText(opts.title || 'SCOPE', padL, 15);
  }
  function tick(now){
    if(!running) return;
    if(!lastT) lastT = now;
    const dt = (now - lastT) / 1000; lastT = now;
    sweepX += dt * (opts.xMax - opts.xMin) / 1.6;   // one sweep ≈ 1.6 s
    if(sweepX > opts.xMax) sweepX = opts.xMin;
    draw();
    raf = requestAnimationFrame(tick);
  }
  container.appendChild(canvas); container.appendChild(foot);
  draw();
  raf = requestAnimationFrame(tick);
  return { destroy: () => cancelAnimationFrame(raf) };
};
