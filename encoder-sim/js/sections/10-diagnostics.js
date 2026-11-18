/* Section 10 — Diagnostics, safe states & fault behaviour */
window.ENC_SECTIONS = window.ENC_SECTIONS || [];

/* --- AS5116 Hamming(7,4) teaching demo of OTP ECC --- */
function hammingDemo(container){
  const UI = window.ENC_UI;
  const card = UI.h(`<div class="card"><h3>OTP ECC live — Hamming SEC <span class="tag">interactive</span></h3>
    <p style="color:var(--muted);font-size:12px;margin:2px 0 10px">The real AS5116 stores a 7-bit checksum (ECC reg 0x1B, Chsum bits 0:6, EN bit 7) with Hamming single-error-correction. This is the same code, minimal case: 4 data bits in red wells, 3 parity bits in blue wells. <b>Click any bit wells to flip them.</b></p></div>`);
  // positions 1..7 (1-indexed), parity at 1,2,4
  let bits = {3:1, 5:0, 6:1, 7:1}; // d1 d2 d3 d4 at positions 3,5,6,7
  function compute(){
    const d1 = bits[3], d2 = bits[5], d3 = bits[6], d4 = bits[7];
    const p1 = d1 ^ d2 ^ d4, p2 = d1 ^ d3 ^ d4, p4 = d2 ^ d3 ^ d4;
    return {1:p1, 2:p2, 4:p4, 3:d1, 5:d2, 6:d3, 7:d4};
  }
  let stored = compute();
  const wells = UI.h(`<div class="seg" style="gap:8px;justify-content:center;margin:14px 0"></div>`);
  const cells = {};
  [1,2,3,4,5,6,7].forEach(pos => {
    const isP = (pos & (pos - 1)) === 0;
    const b = UI.el('button', 'seg-btn', '');
    b.type = 'button'; b.style.minWidth = '64px'; b.style.textAlign = 'center'; b.style.padding = '10px 6px';
    b.innerHTML = `<div style="font-size:9px;letter-spacing:1px;color:var(--faint)">${isP ? 'P' + pos : 'D' + ({3:1,5:2,6:3,7:4})[pos]} · bit ${pos}</div><div style="font-size:22px;margin-top:4px">0</div>`;
    if(isP) b.style.borderColor = 'rgba(34,211,238,.5)'; else b.style.borderColor = 'rgba(251,191,36,.5)';
    b.addEventListener('click', () => { stored[pos] ^= 1; decode(); });
    wells.appendChild(b); cells[pos] = b;
  });
  const out = UI.h(`<div class="banner banner-info"></div>`);
  const actions = UI.h(`<div style="display:flex;gap:8px;margin-top:10px"></div>`);
  const bReset = UI.el('button', 'btn', 'Re-encode (clear errors)'); bReset.type = 'button';
  const bFlip = UI.el('button', 'btn', 'Flip random bit'); bFlip.type = 'button';
  bReset.addEventListener('click', () => { stored = compute(); decode(); });
  bFlip.addEventListener('click', () => { const p = 1 + Math.floor(Math.random() * 7); stored[p] ^= 1; decode(); });
  actions.appendChild(bReset); actions.appendChild(bFlip);

  function decode(){
    [1,2,3,4,5,6,7].forEach(pos => { cells[pos].querySelector('div:last-child').textContent = stored[pos]; });
    const d1 = stored[3], d2 = stored[5], d3 = stored[6], d4 = stored[7];
    const s1 = stored[1] ^ d1 ^ d2 ^ d4, s2 = stored[2] ^ d1 ^ d3 ^ d4, s4 = stored[4] ^ d2 ^ d3 ^ d4;
    const syndrome = s1 * 1 + s2 * 2 + s4 * 4;
    if(syndrome === 0){
      out.className = 'banner banner-info';
      out.innerHTML = '<b>Syndrome 000 — codeword valid.</b> ECC_STATUS = 0 (OK). This is the state after a clean burn.';
    } else {
      const bad = syndrome;
      out.className = 'banner banner-warn';
      out.innerHTML = `<b>Syndrome ${(s4*4+s2*2+s1).toString(2).padStart(3,'0')} — single-bit error at bit position ${bad}.</b> Hamming SEC corrects it in hardware; data recovered: d = ${stored[3]}${stored[5]}${stored[6]}${stored[7]}. ECC_STATUS = 1 (single-bit corrected, informative). If <u>two</u> bits were flipped, syndrome points at a wrong bit — uncorrectable → ECC_STATUS = 2, major system error.`;
    }
  }
  card.appendChild(wells); card.appendChild(actions); card.appendChild(out);
  container.appendChild(card);
  decode();
}

/* --- HAL flux-less self-test sequencer --- */
function fluxlessTest(container){
  const UI = window.ENC_UI;
  const card = UI.h(`<div class="card"><h3>Flux-less self-test sequencer <span class="tag">interactive</span></h3>
    <p style="color:var(--muted);font-size:12px;margin:2px 0 10px">The HAL 302x stimulates its own front-end (no magnet): internal current sources inject quadrature patterns in 64/32 µs steps; the chain must report forced angles / high-Z / error bands exactly 16 times.</p></div>`);
  const btn = UI.el('button', 'btn btn-primary', '▶ Run flux-less self-test'); btn.type = 'button';
  const grid = UI.h(`<div class="reg-file" style="margin-top:10px"></div>`);
  const banner = UI.h(`<div class="banner banner-info" style="margin-top:10px">Idle — press run. 16 checks will execute.</div>`);
  const checks = [
    ['P1 SINE forced', '∠0°'],['P1 COS forced', '∠90°'],['P2 SINE forced', '∠180°'],['P2 COS forced', '∠270°'],
    ['P3 gain lo', 'range lo'],['P3 gain hi', 'range hi'],['Band lo band', '10/4 %VSUP'],['Band hi band', '90/96 %VSUP'],
    ['High-Z entry', 'en_outx=0'],['Band mid', '50 %VSUP'],['Polarity A', '+sin→+'],['Polarity B', '−sin→−'],
    ['Crossbar map', 'xbar[0]'],['Crossbar map', 'xbar[1]'],['FUSE parity', 'ok'],['Temperature', 'ok'],
  ];
  btn.addEventListener('click', () => {
    grid.innerHTML = ''; banner.className = 'banner banner-info'; banner.innerHTML = 'Self-test running…';
    let i = 0;
    const tick = setInterval(() => {
      if(i >= checks.length){
        clearInterval(tick);
        banner.className = 'banner banner-info';
        banner.innerHTML = '<b>16/16 checks passed.</b> Front-end, trims and output drivers verified <u>without any magnetic field</u> — safe to run at EOL and periodically in application.';
        return;
      }
      const [name, expect] = checks[i];
      grid.appendChild(UI.h(`<div class="reg-cell"><div class="reg-addr">check ${String(i+1).padStart(2,'0')}</div><div class="reg-name">${name}</div><div class="reg-val" style="color:var(--ok)">PASS · ${expect}</div></div>`));
      i++;
    }, 160);
  });
  card.appendChild(btn); card.appendChild(grid); card.appendChild(banner);
  container.appendChild(card);
}

/* --- AS5147 field-strength monitor (MAG/DIAAGC) --- */
function fieldMonitor(container){
  const UI = window.ENC_UI;
  const card = UI.h(`<div class="card"><h3>MAG register — field strength &amp; magnet-loss detection <span class="tag">interactive</span></h3></div>`);
  const readout = UI.h(`<div class="readout"></div>`);
  const bar = UI.h(`<div></div>`);
  const diag = UI.h(`<div></div>`);
  const slider = UI.sliderRow('Magnetic field at plates (Bz)', 0, 80, 1, 50, 'mT', render);
  function render(){
    const bz = +slider.querySelector('input').value;
    const mag = Math.round(bz / 80 * 255);
    const good = bz >= 35 && bz <= 70;
    readout.innerHTML = `<div class="readout-item"><div class="ro-label">MAG (0x3FFD)</div><div class="ro-value">0x${mag.toString(16).toUpperCase().padStart(2,'0')} <span class="ro-unit">(${mag})</span></div></div>
      <div class="readout-item"><div class="ro-label">DIAAGC (0x3FFC)</div><div class="ro-value" style="font-size:15px;color:${good ? 'var(--ok)' : 'var(--warn)'}">${good ? 'AGC LOCK · no error' : 'AGC RAILED · field out of window'}</div></div>`;
    bar.innerHTML = `<div class="gauge"><div class="gauge-top"><span>Bz at plates</span><b>${bz} mT</b></div><div class="gauge-track"><div class="gauge-fill" style="width:${bz/80*100}%;background:${good ? 'var(--as5147)' : 'var(--warn)'}"></div></div></div>
      <div class="spec-note">Good window 35–70 mT (R = 1.1 mm circle). Below 35 mT: MAG drops, AGC saturates, noise grows beyond the 0.068° floor. Above 70 mT: front-end saturates — angle still readable but linearity & fit degrade.</div>`;
    diag.innerHTML = bz === 0
      ? `<div class="banner banner-bad"><b>MAGNET LOST.</b> MAG ≈ 0x00, DIAAGC field-error asserted → drive torque disable. This single check catches the #1 field failure before the first commutation glitch.</div>`
      : (!good ? `<div class="banner banner-warn"><b>Out of window.</b> Verify magnet distance / strength in end-of-line. Record DIAAGC + MAG per unit.</div>` : `<div class="banner banner-info"><b>Nominal field.</b> AGC in linear range; 0.068° rms class angle noise achievable.</div>`);
  }
  card.appendChild(slider); card.appendChild(readout); card.appendChild(bar); card.appendChild(diag);
  container.appendChild(card);
  render();
}

window.ENC_SECTIONS.push({
  id:'diagnostics', num:'10',
  title:'Diagnostics, Safe States & Fault Behaviour',
  sub:'What each device does when the world breaks: error bands, high-Z, ABI=111, DIAG pins, parity flags, ECC corrections, flux-less self-test — and the torn-read race.',
  refs:['§“Output Diagnostics” · DSH000237','§“Diagnostics” · DS000307','§“ECC” · DS000686'],
  tabs:{
    hal:{
      watch:[
        {t:'The output IS the diagnostic', d:'No status register exists. <b>The voltage level on OUTx is the diagnostic</b>: 10–90 %VSUP = angle, 90/96 = error-high band, 10/4 = error-low band, 50 = center, high-Z = driver off (en_outx = 0). Your ADC must threshold these.'},
        {t:'Safe PWM drive', d:'Map error-high/low to inverter <b>torque disable</b> in the MCU; map high-Z to “no valid angle”. Both are detectable with two comparators or one ADC watchdog — no extra silicon.'},
        {t:'Flux-less self-test', d:'No magnet needed: internal current patterns force the chain through 16 verification vectors (angle, gain, band levels, polarity, crossbar map, high-Z). Run at power-up and in background every ~100 ms.'},
        {t:'Error band semantics', d:'The bands are <u>intentionally wide</u>: 4 %VSUP hysteresis-class separation. Aging, temperature, R_pull-down tolerance — all tolerated. If your ADC threshold sits midway, you never get a false pass.'},
      ],
      play:fluxlessTest
    },
    as5147:{
      watch:[
        {t:'Three layers of diagnostics', d:'Layer 1: <b>SPI parity</b> (PARC/PARD/PARERR) on every frame. Layer 2: <b>DIAAGC/MAG</b> field &amp; AGC status registers. Layer 3: <b>safe outputs</b> — ABI=111, UVW=000, PWM low 13–16 of first 16 periods or all 4096 low.'},
        {t:'The torn-read trap', d:'Reading ANGLE (14 bits) as two 8-bit transfers without a latch: byte 1 from conversion N, byte 2 from N+1 → glitch up to ±180°. ANGLECOM latches atomically; SPI framing with correct CSn guarantees it. The race simulator below demonstrates the mechanism.'},
        {t:'AGC loss = magnet lost', d:'MAG register <b>0x3FFD</b> reports field strength code. MAG → 0x00 with DIAAGC error = magnet physically gone. Poll it at 1 kHz on critical drives; it costs one extra 2 µs SPI transaction.'},
        {t:'UVW/ABI on error', d:'On internal fault: <b>ABI = 111</b> (both phases high + index) and <b>UVW = 000</b>. An inverter with Hall-emulation inputs interprets these as “no valid hall” → fault stop. That is the designed fail-silent path.'},
      ],
      play:function(container, data){
        fieldMonitor(container);
        const raceCard = window.ENC_UI.h(`<div class="card" style="margin-top:14px"><h3>Torn-read race simulator <span class="tag">interactive</span></h3></div>`);
        window.ENC_SIMS.raceSim(raceCard, {});
        container.appendChild(raceCard);
      }
    },
    as5116:{
      watch:[
        {t:'ECC — the whole safety story', d:'OTP is protected by <b>Hamming SEC</b>: ECC reg 0x1B (Chsum 0:6, EN 7). At startup, ECC_STATUS: <b>0 = OK</b>, <b>1 = single-bit corrected</b> (informative, log it), <b>2 = double-bit → major system error</b> → outputs to safe state.'},
        {t:'P2RAM GLOAD guard-band', d:'During burn, the device verifies fuse margins: <b>GLOAD</b> checks bit cell margins under guard-band — catches marginal burns that would read “OK” at room temp but fail at −40 °C. This is closed-loop burn quality, not just verify-after-write.'},
        {t:'UART_ERROR (0x01)', d:'SYNC / PARITY / FRAME flags — every UART transaction is self-checking. Any flag → stop, resync with 0x55, retry ≤ 3 times, else latch DIAG fault to the MCU.'},
        {t:'POR &amp; 10 ms', d:'TPOWER_ON = <b>10 ms</b>: VDD ramp → POR → DMOD lock → ECC verify → outputs valid. Gate torque-enable on (DIAG low AND 10 ms AND plausibility check). Never commutate on a 2 ms-old VDD.'},
      ],
      play:hammingDemo
    },
    compare:{
      watch:[
        {t:'Diagnostic richness ranking', d:'AS5147 (3 layers: parity + registers + safe outputs) &gt; HAL 302x (voltage bands + flux-less self-test, arguably simpler to integrate) = AS5116 (ECC + GLOAD + UART flags, digital depth but anonymous analog outputs).'},
        {t:'Functional safety honesty', d:'None of the three is a certified safety element. They are <b>QM/SEooC building blocks</b>: HAL for powertrain ASIL-B/D chains (FuSa diag), AS5147 for ASIL-B (with MCU supervision), AS5116 for transmission-class QM. System rating = architecture + process + these parts.'},
      ],
      play:function(container, data){ window.ENC_UI.comparePane(container, ['Diagnostics & safety','Outputs & interfaces']); }
    },
  }
});
