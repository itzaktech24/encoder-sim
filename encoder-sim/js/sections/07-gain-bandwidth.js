/* Section 07 — Gain, sensitivity, bandwidth & dynamic error */
window.ENC_SECTIONS = window.ENC_SECTIONS || [];

function stepResponse(canvas, bwHz, tauMs){
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = '#1B2532'; ctx.lineWidth = 1;
  for(let i = 1; i < 8; i++){ const y = H * i / 8; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.strokeStyle = '#FBBF24'; ctx.lineWidth = 2.5; ctx.shadowColor = '#FBBF24'; ctx.shadowBlur = 6;
  ctx.beginPath();
  for(let x = 0; x <= W; x++){
    const t = x / W * tauMs * 4;
    const v = 1 - Math.exp(-t * 1000 / (1000 / (2 * Math.PI * bwHz)));
    const y = H - 18 - v * (H - 36);
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke(); ctx.shadowBlur = 0;
  ctx.fillStyle = '#8B97AB'; ctx.font = '11px ui-monospace,monospace';
  ctx.fillText('step response · f₃dB ≈ ' + (bwHz/1000).toFixed(1) + ' kHz', 10, 16);
}

window.ENC_SECTIONS.push({
  id:'gain', num:'07',
  title:'Gain, Sensitivity & Bandwidth',
  sub:'mag_range vs FINE_GAIN_CUST vs bw_filt (HAL) · CORDIC DAE math (AS5147) · GAIN_CODE & TD demodulation bandwidth (AS5116).',
  refs:['Table 5-3/5-5 · DSH000237','§“Dynamic Angle Error” · DS000307','Table “Gain” · DS000686'],
  tabs:{
    hal:{
      watch:[
        {t:'Two gains, one knob', d:'Coarse trim <b>mag_range</b> (5-bit): ±250…±5 mT full-scale — sets input-referred operating point. Fine trim <b>FINE_GAIN_CUST</b> (1.25–1.5×): compensates magnet strength &amp; mechanical stack-up. Order: pick mag_range from Bz, then FINE_GAIN_CUST to center the ADC.'},
        {t:'bw_filt — bandwidth for noise', d:'<b>00</b> = 70.5 kHz (max) · <b>01</b> = 32.1 kHz · <b>10</b> = 16.1 kHz (default) · <b>11</b> = 4.6 kHz (lowest noise). Cutting bandwidth cuts RMS noise ~½ per halving of BW — the classic trade; pick the lowest BW your control loop tolerates.'},
        {t:'tDelay &amp; jitter, per bw_filt', d:'@500 Hz (min/typ/max µs): 00 → 4.16/4.59/4.90 · 01 → 6.20/6.98/7.51 · 10 → 9.02/10.16/10.93 · 11 → 37.55/40.40/42.69. <b>Jitter max 2 ns (RMS)</b> — extraordinary; the analog output is essentially jitter-free vs any digital chain.'},
        {t:'VOUT noise vs BW', d:'Angular noise falls ≈ √BW. DSH000237 Table 5-5 lists VOUT,noise per bw_filt for HAL 3020 and 3021 (mag_range = 01001, 75 mT class): worst-case values drop from ≈1.0–1.3 mV class at bw_filt=00 to ≈0.3–0.4 mV class at bw_filt=11. Read Table 5-5 for your exact column; jitter stays ≤ 2 ns regardless of filter.'},
      ],
      play:function(container, data){
        const UI = window.ENC_UI;
        const card = UI.h(`<div class="card"><h3>bw_filt select — delay vs bandwidth <span class="tag">interactive</span></h3></div>`);
        const rows = [
          ['00 — Maximum', '70.5', '4.16/4.59/4.90'],
          ['01 — High', '32.1', '6.20/6.98/7.51'],
          ['10 — Medium (default)', '16.1', '9.02/10.16/10.93'],
          ['11 — Low noise', '4.6', '37.55/40.40/42.69'],
        ];
        const canvas = document.createElement('canvas');
        canvas.width = 640; canvas.height = 180; canvas.className = 'sim-canvas';
        const info = UI.h(`<div></div>`);
        const seg = UI.segButtons(rows.map(r => r[0].split(' — ')[0]), 2, (i) => {
          const bw = parseFloat(rows[i][1]);
          stepResponse(canvas, bw * 1000, 1000 / (2 * Math.PI * bw * 1000));
          info.innerHTML = `<div class="readout"><div class="readout-item"><div class="ro-label">Filter</div><div class="ro-value">${rows[i][0]}</div></div>
            <div class="readout-item"><div class="ro-label">f₃db</div><div class="ro-value">${rows[i][1]}<span class="ro-unit"> kHz</span></div></div>
            <div class="readout-item"><div class="ro-label">tDelay min/typ/max</div><div class="ro-value" style="font-size:15px">${rows[i][2]}<span class="ro-unit"> µs</span></div></div></div>`;
        });
        card.appendChild(seg); card.appendChild(canvas); card.appendChild(info);
        card.appendChild(UI.h(`<div class="spec-note">Sensitivity at 25 °C: 31.5 / 33 / 36 %VSUP per mag_range — example 0.022 V/mT @ VSUP = 5 V, mag_range = 75 mT. Noise & mismatch min/max values: Table 5-5 of DSH000237_002EN (mag_range = 01001).</div>`));
        container.appendChild(card);
        stepResponse(canvas, 16100, 10);
        info.innerHTML = `<div class="readout"><div class="readout-item"><div class="ro-label">Filter</div><div class="ro-value">10 — Medium (default)</div></div><div class="readout-item"><div class="ro-label">f₃db</div><div class="ro-value">16.1<span class="ro-unit"> kHz</span></div></div><div class="readout-item"><div class="ro-label">tDelay min/typ/max</div><div class="ro-value" style="font-size:15px">9.02/10.16/10.93<span class="ro-unit"> µs</span></div></div></div>`;
      }
    },
    as5147:{
      watch:[
        {t:'The DAE equation', d:'Dynamic Angle Error = <b>ω × t_delay</b>. With t_delay = 100 µs at 10 000 rpm (1047 rad/s): <b>0.10°</b> raw. DAEC adds ω × t_delay_DAEC back: effective 1.5–1.9 µs → residual error ≈ <b>0.002°</b>. This is why the compensated register exists.'},
        {t:'Spec’d error growth', d:'DAE₇₁₀₀ =? — datasheet anchors: <b>DAE₁₇₀₀ = 0.02°</b> · <b>DAE₍max₎ = 0.18° @ 14 500 rpm</b> · <b>DAEacc = 0.175° @ 25 krad/s²</b> (acceleration!) — yes, acceleration error is specified separately.'},
        {t:'Noise floor', d:'NOISESET=0 → <b>0.068° rms</b> (5 V, −40…150 °C; 3.3 V, −40…125 °C). NOISESET=1 → <b>0.082° rms</b> (full 3.3 V range to 150 °C). DAECDIS costs +0.016° rms of noise benefit when disabled (static, &lt;100 rpm).'},
        {t:'Choosing ANGLE vs ANGLECOM', d:'ANGLE 0x3FFE = raw (use for diagnostics &amp; bringing up the loop). <b>ANGLECOM 0x3FFF</b> = latency-compensated — always command from this one. ABI/UVW/PWM are generated from the compensated path internally.'},
      ],
      play:function(container, data){
        const UI = window.ENC_UI;
        const card = UI.h(`<div class="card"><h3>DAE = ω·t — raw vs DAEC-compensated <span class="tag">interactive</span></h3></div>`);
        const readout = UI.h(`<div class="readout"></div>`);
        const bars = UI.h(`<div></div>`);
        const toggle = UI.toggle('NOISESET = 1 (0.082° rms, full 3.3 V range)', false, () => render());
        const speedCtl = UI.sliderRow('Rotor speed', 0, 14500, 100, 5000, 'rpm', () => render());
        function render(){
          const speed = +speedCtl.querySelector('input').value;
          const omega = speed * 2 * Math.PI / 60;
          const raw = omega * 100e-6 * 180/Math.PI;
          const comp = omega * 1.7e-6 * 180/Math.PI;
          readout.innerHTML = `<div class="readout-item"><div class="ro-label">ω</div><div class="ro-value">${omega.toFixed(0)}<span class="ro-unit"> rad/s</span></div></div>
            <div class="readout-item"><div class="ro-label">Noise (NOISESET)</div><div class="ro-value">${toggle.querySelector('input').checked ? '0.082' : '0.068'}<span class="ro-unit">° rms</span></div></div>
            <div class="readout-item"><div class="ro-label">Effective DAEC delay</div><div class="ro-value">1.5–1.9<span class="ro-unit"> µs</span></div></div>`;
          const maxE = Math.max(raw, 0.001);
          bars.innerHTML = `<div class="gauge"><div class="gauge-top"><span>Raw pipeline (90–110 µs)</span><b>${raw.toFixed(3)}°</b></div><div class="gauge-track"><div class="gauge-fill" style="width:${Math.max(2, raw/maxE*100)}%"></div></div></div>
            <div class="gauge"><div class="gauge-top"><span>With DAEC (1.5–1.9 µs eff.)</span><b>${comp.toFixed(4)}°</b></div><div class="gauge-track"><div class="gauge-fill" style="width:${Math.max(2, comp/maxE*100)}%;background:var(--as5147)"></div></div></div>
            <div class="spec-note">Datasheet anchors — DAE₁₇₀₀ = 0.02° · DAEmax = 0.18° @ 14 500 rpm · DAEacc = 0.175° @ 25 krad/s². At 14 500 rpm: raw ≈ ${(14500*2*Math.PI/60*100e-6*180/Math.PI).toFixed(3)}°, DAEC ≈ ${(14500*2*Math.PI/60*1.7e-6*180/Math.PI).toFixed(4)}°.</div>`;
        }
        card.appendChild(speedCtl); card.appendChild(toggle); card.appendChild(readout); card.appendChild(bars);
        container.appendChild(card);
        render();
      }
    },
    as5116:{
      watch:[
        {t:'Gain_Code — 8 to 60 mV/mT', d:'@5 V: <b>Gain_Code 0 → 8 mV/mT … 24 → 60 mV/mT</b> (3.3 V mode maxes at 45). Set by Bz: with 30 mT nominal, code ~12 (32 mV/mT) lands ±0.96 V differential swing — ideal ADC match. GV tolerance ±16 % end-to-end.'},
        {t:'TD — the bandwidth/noise dial', d:'<b>TD = 12 / 16 / 20 µs</b>. 12 µs: fastest, noisiest (≈13 kHz class) · 16 µs: balanced · 20 µs: most quiet, sluggish (≈8 kHz). Spec picks the <u>latency budget</u> first; noise second.'},
        {t:'DMOD doesn’t do DAE', d:'Analog chain: no ω-compensation happens — the signal simply delays by TD. That’s why the AS5116 wins at low-to-medium rpm where 12–20 µs is no burden, and why its accuracy budget lives elsewhere (DMOD offsets, GV spread).'},
        {t:'Amplitude check', d:'Vout_diff (peak) = M × Bz_peak. With M = 32 mV/mT and Bz = 50 mT: ±1.6 V. Check against swing GND+0.25…VDD−0.5 with CM ≤ VCM defaults (1.375/2.125 V) — never clip the DRV.'},
      ],
      play:function(container, data){
        const UI = window.ENC_UI;
        const card = UI.h(`<div class="card"><h3>Gain & amplitude calculator <span class="tag">interactive</span></h3></div>`);
        const readout = UI.h(`<div class="readout"></div>`);
        const bar = UI.h(`<div></div>`);
        const gainCtl = UI.sliderRow('Gain_Code (0–24)', 0, 24, 1, 12, '', render);
        const bzCtl = UI.sliderRow('Bz at plates', 10, 100, 1, 50, 'mT', render);
        const tdSeg = UI.segButtons(['TD = 12 µs', 'TD = 16 µs', 'TD = 20 µs'], 1, render);
        function render(){
          const code = +gainCtl.querySelector('input').value, bz = +bzCtl.querySelector('input').value;
          const m = 8 + code * (60 - 8) / 24;           // endpoint interpolation, see datasheet table
          const diffPeak = m * bz / 1000;               // V
          const headroom = 5 / 2 - diffPeak;            // vs VDD/2 rail class
          readout.innerHTML = `<div class="readout-item"><div class="ro-label">Sensitivity M</div><div class="ro-value">${m.toFixed(1)}<span class="ro-unit"> mV/mT</span></div></div>
            <div class="readout-item"><div class="ro-label">Vout diff (peak)</div><div class="ro-value">±${diffPeak.toFixed(2)}<span class="ro-unit"> V</span></div></div>
            <div class="readout-item"><div class="ro-label">GV spread</div><div class="ro-value">±16<span class="ro-unit"> %</span></div></div>
            <div class="readout-item"><div class="ro-label">Swing check</div><div class="ro-value" style="color:${headroom > 0.4 ? 'var(--ok)' : 'var(--bad)'}">${headroom > 0.4 ? 'OK' : 'CLIPPING'}</div></div>`;
          bar.innerHTML = `<div class="gauge"><div class="gauge-top"><span>Differential amplitude</span><b>${(diffPeak * 2).toFixed(2)} V p-p</b></div><div class="gauge-track"><div class="gauge-fill" style="width:${Math.min(100, diffPeak * 2 / 5 * 100)}%;background:var(--as5116)"></div></div></div>
            <div class="spec-note">Gain_Code endpoints verified: 0 → 8 mV/mT · 24 → 60 mV/mT @5 V (3V3 mode max 45). Intermediate codes per datasheet gain table; linear interpolation shown. TD trades bandwidth (~13/10/8 kHz class) for output noise.</div>`;
        }
        card.appendChild(gainCtl); card.appendChild(bzCtl); card.appendChild(tdSeg); card.appendChild(readout); card.appendChild(bar);
        container.appendChild(card);
        render();
      }
    },
    compare:{
      watch:[
        {t:'Three ways to “gain”', d:'HAL: sensitivity via <b>mag_range</b> + FINE_GAIN_CUST (%VSUP referenced) · AS5147: <b>AGC</b>, digital gain — effectively infinite range within Bz window, reported as 8-bit MAG · AS5116: analog <b>Gain_Code</b> 8–60 mV/mT + GV ±16 %.'},
        {t:'Bandwidth headroom ranking', d:'HAL 70.5 kHz max (analog wizardry) &gt; AS5116 ~13 kHz (TD=12 µs) &gt; AS5147 (CORDIC-limited, compensated). For PWM-inverter noise floors above 20 kHz, HAL wins; for 100 kHz+ torque loops, nothing analog touches a CORDIC.'},
        {t:'The noise budget truth', d:'All three quote angle noise in radians only via system-level assumptions. Cheap proxy: ENOB ≈ log₂(V_swing / (noise_density × √BW)). Differential wiring beats any register setting every single time.'},
      ],
      play:function(container, data){ window.ENC_UI.comparePane(container, ['Accuracy & dynamics']); }
    },
  }
});
