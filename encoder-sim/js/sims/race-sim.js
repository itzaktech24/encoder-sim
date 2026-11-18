/* Race-condition simulator — sample vs latch timing.
   Shows why digital angle interfaces must be read atomically (ANGLECOM latch / SPI shadow). */
window.ENC_SIMS = window.ENC_SIMS || {};
window.ENC_SIMS.raceSim = function(container, opts){
  const UI = window.ENC_UI;
  const canvas = document.createElement('canvas');
  canvas.className = 'sim-canvas';
  const DPR = window.devicePixelRatio || 1;
  const W = 660, H = 240;
  canvas.width = W * DPR; canvas.height = H * DPR; canvas.style.aspectRatio = (W + '/' + H);
  const ctx = canvas.getContext('2d'); ctx.scale(DPR, DPR);

  const state = { skew: 35, running: false, t: 0, history: [], errs: 0, reads: 0 };

  const skewSlider = UI.sliderRow('Sampling skew vs latch boundary', 0, 100, 1, state.skew, 'ns-equivalents', v => {
    state.skew = v; drawTimeline(); stats.innerHTML = statsHtml();
  });
  const btnRow = UI.h(`<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
    <button class="btn btn-primary" type="button" data-act="run">▶ Run 2000 reads</button>
    <button class="btn" type="button" data-act="clear">Clear stats</button>
  </div>`);
  const stats = UI.h(`<div class="readout"></div>`);
  const note = UI.h(`<div class="banner banner-warn"> <b>Race:</b> the CORDIC updates ANGLE mid-conversion. If the MCU reads the two bytes without a latch, the upper/lower halves can come from <u>different</u> conversions — a torn read that appears as a glitch spike (up to ±180° in the worst case). ANGLECOM (0x3FFF) is latched atomically precisely to prevent this; SPI mode-1 with the correct CSn framing gives you the same guarantee.</div>`);

  function tornRead(){
    const angle = Math.random() * 16384;
    const hiNew = Math.random() < (state.skew / 100);   // probability the MSB rolled over mid-read
    const lo = Math.floor(Math.random() * 256);
    const hi = Math.floor(angle / 256);
    if(hiNew){
      // MSB from conversion n+1, LSB from n — if rollover 0x3FFF→0x0000, error is huge
      const err = Math.min(angle, 16384 - angle);
      return { torn: true, err: err / 16384 * 360 };
    }
    return { torn: false, err: 0 };
  }
  function statsHtml(){
    const rate = state.reads ? (state.errs / state.reads * 100) : 0;
    return `<div class="readout-item"><div class="ro-label">Reads</div><div class="ro-value">${state.reads}</div></div>
      <div class="readout-item"><div class="ro-label">Torn reads</div><div class="ro-value">${state.errs}</div></div>
      <div class="readout-item"><div class="ro-label">Error rate</div><div class="ro-value">${rate.toFixed(1)}<span class="ro-unit"> %</span></div></div>
      <div class="readout-item"><div class="ro-label">Worst case</div><div class="ro-value">±180<span class="ro-unit">°</span></div></div>`;
  }
  function drawTimeline(){
    ctx.clearRect(0, 0, W, H);
    // two horizontal rails: "ANGLE counter" and "MCU read"
    ctx.fillStyle = '#8B97AB'; ctx.font = '10px ui-monospace,monospace';
    ctx.fillText('ANGLE counter (updates at CORDIC latch)', 12, 30);
    ctx.fillText('MCU read (16-bit, 2×8-bit transfers)', 12, 120);
    // counter rail
    const railY1 = 52;
    ctx.strokeStyle = '#22D3EE'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(12, railY1);
    let y = railY1;
    for(let x = 12; x <= W - 12; x += 6){
      const step = Math.sin(x / 22) > 0.985 ? -16 : 0;   // occasional rollover pulse
      y = railY1 + step; ctx.lineTo(x, y);
    }
    ctx.stroke();
    // read rail
    const railY2 = 142;
    ctx.strokeStyle = '#FBBF24'; ctx.lineWidth = 2;
    // read window positioned by skew
    const rw = 150, rx = 24 + (state.skew / 100) * (W - rw - 48);
    ctx.beginPath(); ctx.moveTo(12, railY2); ctx.lineTo(W - 12, railY2); ctx.stroke();
    ctx.fillStyle = 'rgba(251,191,36,.18)'; ctx.fillRect(rx, railY2 - 14, rw, 28);
    ctx.strokeStyle = '#FBBF24'; ctx.strokeRect(rx, railY2 - 14, rw, 28);
    // mid-window marker
    const over = rx < W/2 && rx + rw > W/2;
    ctx.fillStyle = over ? '#F87171' : '#34D399';
    ctx.font = 'bold 11px ui-monospace,monospace';
    ctx.fillText(over ? 'READ SPANS THE LATCH → TORN BYTES' : 'READ FULLY INSIDE ONE CONVERSION → OK', 12, 205);
  }
  btnRow.querySelector('[data-act=run]').addEventListener('click', () => {
    for(let i = 0; i < 2000; i++){ const r = tornRead(); state.reads++; if(r.torn) state.errs++; }
    stats.innerHTML = statsHtml();
  });
  btnRow.querySelector('[data-act=clear]').addEventListener('click', () => { state.reads = 0; state.errs = 0; stats.innerHTML = statsHtml(); });

  container.appendChild(canvas); container.appendChild(skewSlider); container.appendChild(btnRow); container.appendChild(stats); container.appendChild(note);
  drawTimeline(); stats.innerHTML = statsHtml();
};
