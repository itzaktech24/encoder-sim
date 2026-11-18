/* Magnet physics sandbox — diametrically magnetized rotor over 2D Hall plate circle.
   Simplified educational model (not a field solver); labeled as such in the UI. */
window.ENC_SIMS = window.ENC_SIMS || {};
window.ENC_SIMS.magnetPhysics = function(container, opts){
  opts = opts || {};
  const DPR = window.devicePixelRatio || 1;
  const W = 660, H = 400;
  const canvas = document.createElement('canvas');
  canvas.className = 'sim-canvas';
  canvas.width = W * DPR; canvas.height = H * DPR; canvas.style.aspectRatio = (W + '/' + H);
  const ctx = canvas.getContext('2d'); ctx.scale(DPR, DPR);

  const state = { angle: 30, gap: 0.6, bz: 45, offset: 0.0 };

  const ui = document.createElement('div');
  ui.innerHTML = `<div class="sim-controls"></div>
    <div class="readout">
      <div class="readout-item"><div class="ro-label">Field angle θ</div><div class="ro-value" data-ro="theta">–</div><div class="ro-unit">deg</div></div>
      <div class="readout-item"><div class="ro-label">|B| at plates</div><div class="ro-value" data-ro="bm">–</div><div class="ro-unit">mT</div></div>
      <div class="readout-item"><div class="ro-label">Bx (sin-axis)</div><div class="ro-value" data-ro="bx">–</div><div class="ro-unit">mT</div></div>
      <div class="readout-item"><div class="ro-label">By (cos-axis)</div><div class="ro-value" data-ro="by">–</div><div class="ro-unit">mT</div></div>
      <div class="readout-item"><div class="ro-label">Angle error Δθ</div><div class="ro-value" data-ro="err">–</div><div class="ro-unit">deg</div></div>
    </div>
    <div class="spec-note">Simplified model: B(y) ∝ Bz·(R/(R+g))<sup>n</sup> with first-order eccentricity error — ideal for intuition, not for magnet design sign-off. Plate layout & field definition per datasheet Fig. 3–1 / 5–3…5–5.</div>`;

  const controls = ui.querySelector('.sim-controls');
  const UI = window.ENC_UI;
  controls.appendChild(UI.sliderRow('Rotor angle', 0, 360, 0.5, state.angle, '°', v => { state.angle = v; draw(); }));
  controls.appendChild(UI.sliderRow('Air gap g', 0.1, 3.0, 0.05, state.gap, 'mm', v => { state.gap = v; draw(); }));
  controls.appendChild(UI.sliderRow('Magnet Bz (at surface)', 5, 250, 1, state.bz, 'mT', v => { state.bz = v; draw(); }));
  controls.appendChild(UI.sliderRow('Lateral offset (eccentricity)', 0, 0.5, 0.01, state.offset, 'mm', v => { state.offset = v; draw(); }));

  function field(){
    // decay with gap: near field of a cylinder ~ cube-ish falloff beyond surface
    const effR = 5 + state.gap;           // magnet radius 5 mm (typical 6–12 mm dia.)
    const scale = Math.pow(5 / effR, 2.6);
    const eccErr = (state.offset / effR) * Math.sin(state.angle * Math.PI/180 + 0.7) * 3.2; // deg, first-order
    const bm = state.bz * scale;
    const th = state.angle * Math.PI/180;
    return { bm, bx: bm * Math.cos(th), by: bm * Math.sin(th), err: eccErr };
  }

  function draw(){
    ctx.clearRect(0, 0, W, H);
    const cxL = 168, cyL = H/2 + 8, Rmag = 64;
    // ---- left panel: side view (magnet + gap + sensor)
    ctx.fillStyle = '#0A0E14'; ctx.fillRect(0, 0, W/2 - 6, H);
    ctx.fillRect(W/2 + 6, 0, W/2 - 6, H);
    ctx.fillStyle = '#22304A'; ctx.font = '10px ui-monospace,monospace';
    ctx.fillText('SIDE VIEW — gap & magnet', 16, 20);
    // magnet cylinder
    const mg = ctx.createLinearGradient(cxL - Rmag, 70, cxL + Rmag, 70);
    mg.addColorStop(0, '#3B82F6'); mg.addColorStop(0.5, '#1E3A8A'); mg.addColorStop(1, '#F87171');
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.roundRect(cxL - Rmag, 60, Rmag*2, 44, 8); ctx.fill();
    ctx.fillStyle = '#DBEAFE'; ctx.font = 'bold 13px ui-monospace,monospace';
    ctx.fillText('N', cxL + Rmag - 20, 87);
    ctx.fillStyle = '#FEE2E2'; ctx.fillText('S', cxL - Rmag + 8, 87);
    // gap arrows
    const gapPx = UI.clamp(state.gap * 26, 6, 78);
    ctx.strokeStyle = '#5C6879'; ctx.lineWidth = 1; ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.moveTo(cxL + Rmag + 12, 82); ctx.lineTo(cxL + Rmag + 12, 82 + gapPx); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#8B97AB'; ctx.font = '10px ui-monospace,monospace';
    ctx.fillText('g=' + state.gap.toFixed(2) + ' mm', cxL + Rmag + 18, 82 + gapPx/2 + 3);
    // PCB + sensor
    const pcbY = 82 + gapPx + 26;
    ctx.fillStyle = '#14532D'; ctx.fillRect(cxL - 92, pcbY, 184, 14);
    ctx.fillStyle = '#0E1116'; ctx.fillRect(cxL - 24, pcbY - 8, 48, 8); // sensor body
    ctx.strokeStyle = '#34D399'; ctx.strokeRect(cxL - 24, pcbY - 8, 48, 8);
    ctx.fillStyle = '#A7F3D0'; ctx.font = '9px ui-monospace,monospace'; ctx.fillText('SENSOR', cxL - 17, pcbY - 1);

    // ---- right panel: top view, rotor vector + plate circle
    const cxR = W/2 + (W - W/2)/2, cyR = H/2 + 8, Rp = 118;
    ctx.fillStyle = '#22304A'; ctx.fillText('TOP VIEW — rotor & plate circle', W/2 + 18, 20);
    // field circle (plate circle Ø1.9 mm, drawn bigger)
    ctx.strokeStyle = '#33415C'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cxR, cyR, Rp * 0.55, 0, Math.PI*2); ctx.stroke();
    ctx.strokeStyle = '#253041'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cxR, cyR, Rp, 0, Math.PI*2); ctx.setLineDash([5,5]); ctx.stroke(); ctx.setLineDash([]);
    // plates (6 shown)
    for(let i = 0; i < 6; i++){
      const a = i * Math.PI/3 + Math.PI/12;
      const px = cxR + Rp * 0.55 * Math.cos(a), py = cyR + Rp * 0.55 * Math.sin(a);
      ctx.fillStyle = i % 2 ? '#FBBF24' : '#22D3EE';
      ctx.beginPath(); ctx.arc(px, py, 6.5, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#0E1116'; ctx.stroke();
    }
    // rotor
    const th = state.angle * Math.PI/180;
    ctx.save(); ctx.translate(cxR, cyR); ctx.rotate(th);
    const grad = ctx.createLinearGradient(-34, 0, 34, 0);
    grad.addColorStop(0, '#1D4ED8'); grad.addColorStop(0.5, '#0F172A'); grad.addColorStop(1, '#B91C1C');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#475569'; ctx.stroke();
    ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(30, 0); ctx.stroke();
    ctx.fillStyle = '#F8FAFC'; ctx.font = 'bold 12px ui-monospace,monospace';
    ctx.fillText('N', 16, -10); ctx.fillText('S', -24, -10);
    // field vector arrow
    ctx.strokeStyle = '#34D399'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -Rp * 0.92); ctx.stroke();
    ctx.fillStyle = '#34D399';
    ctx.beginPath(); ctx.moveTo(0, -Rp * 0.92 - 10); ctx.lineTo(-6, -Rp*0.92 + 8); ctx.lineTo(6, -Rp*0.92 + 8); ctx.closePath(); ctx.fill();
    ctx.restore();

    const f = field();
    ui.querySelector('[data-ro=theta]').textContent = state.angle.toFixed(1);
    ui.querySelector('[data-ro=bm]').textContent = f.bm.toFixed(1);
    ui.querySelector('[data-ro=bx]').textContent = f.bx.toFixed(1);
    ui.querySelector('[data-ro=by]').textContent = f.by.toFixed(1);
    ui.querySelector('[data-ro=err]').textContent = f.err.toFixed(3);
  }

  container.appendChild(canvas); container.appendChild(ui);
  draw();
};
