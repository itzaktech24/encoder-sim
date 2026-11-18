/* Section 11 — OTP / EEPROM programming & transfer of trim */
window.ENC_SECTIONS = window.ENC_SECTIONS || [];

/* --- AS5147 OTP burn sequence exerciser --- */
function otpSequence(container){
  const UI = window.ENC_UI;
  const card = UI.h(`<div class="card"><h3>OTP burn sequence — order matters <span class="tag">interactive</span></h3>
    <p style="color:var(--muted);font-size:12px;margin:2px 0 10px">DS000307 “Burn and verification of the OTP memory”. Tick the steps in order — wrong order = failed burn / corrupted trim (unrecoverable in OTP!).</p></div>`);
  const steps = [
    ['VDD = 4.5–5.5 V, VDD_Burn = 3.3–3.5 V applied via programmer', 'Supply'],
    ['TA = 25 °C ± 20 °C (TaProg 5…45 °C absolute)', 'Thermal'],
    ['Enter burn mode via TEST pin sequence (per datasheet timing)', 'Access'],
    ['Write user settings (SETTINGS2, ABI format, UVW poles…)', 'Content'],
    ['PROGVERIFY — read-back & compare (bits still eFuse-unburned)', 'Verify-1'],
    ['OTPBURN — sense amplifiers blow the fuse cells', 'Burn'],
    ['PROGVERIFY again — post-burn readback mandatory', 'Verify-2'],
    ['Power-cycle; device boots from burned OTP; validate angle on bench', 'Accept'],
  ];
  let done = 0;
  const list = UI.h(`<div style="display:flex;flex-direction:column;gap:6px;margin:12px 0"></div>`);
  const banner = UI.h(`<div class="banner banner-info">Awaiting step 1/8.</div>`);
  const reset = UI.el('button', 'btn', 'Reset sequence'); reset.type = 'button';
  reset.addEventListener('click', () => { done = 0; render(); });
  const boxes = steps.map(([label, tag], i) => {
    const b = UI.el('button', 'quiz-opt', '');
    b.type = 'button';
    b.innerHTML = `<b style="color:var(--faint)">${String(i+1).padStart(2,'0')}</b> · ${label} <span class="pin-chip" style="margin-left:6px">${tag}</span>`;
    b.addEventListener('click', () => {
      if(i === done){ done++; render(); }
      else {
        banner.className = 'banner banner-bad';
        banner.innerHTML = `<b>Wrong order.</b> Step ${done+1} expected, you picked step ${i+1}. In OTP there is no undo — the part may be scrapped. Real line: interlock in the programmer firmware.`;
      }
    });
    list.appendChild(b); return b;
  });
  function render(){
    boxes.forEach((b, i) => {
      b.classList.toggle('correct', i < done);
      b.classList.toggle('wrong', false);
      b.disabled = i < done;
    });
    banner.className = done === steps.length ? 'banner banner-info' : 'banner banner-info';
    banner.innerHTML = done === steps.length
      ? '<b>Burn complete & verified.</b> OTP is now immutable — every unit: record serial → DIAAGC/MAG → angle sanity → archive logs.'
      : `Awaiting step ${done + 1}/${steps.length}: <b>${steps[done][0]}</b>`;
  }
  card.appendChild(list); card.appendChild(banner); card.appendChild(reset);
  container.appendChild(card);
  render();
}

/* --- AS5116 GLOAD guard-band & checksum demo --- */
function guardBandDemo(container){
  const UI = window.ENC_UI;
  const card = UI.h(`<div class="card"><h3>P2RAM_CONTROL (0x03) — GLOAD guard-band <span class="tag">interactive</span></h3>
    <p style="color:var(--muted);font-size:12px;margin:2px 0 10px">AS5116 burn quality is verified with <b>GLOAD</b>: after burning, the cell is read at forced low drive — marginal cells (weak 1s) are detected <u>before</u> they drift at −40 °C. Toggle the simulated cell strength to see the guard-band decision.</p></div>`);
  const readout = UI.h(`<div class="readout"></div>`);
  const verdict = UI.h(`<div class="banner banner-info"></div>`);
  const slider = UI.sliderRow('Fuse cell drive margin (relative)', 0, 100, 1, 78, '%', render);
  function render(){
    const m = +slider.querySelector('input').value;
    readout.innerHTML = `<div class="readout-item"><div class="ro-label">Cell margin</div><div class="ro-value">${m}<span class="ro-unit"> %</span></div></div>
      <div class="readout-item"><div class="ro-label">GLOAD threshold</div><div class="ro-value">≈ 60<span class="ro-unit"> %</span></div></div>
      <div class="readout-item"><div class="ro-label">Decision</div><div class="ro-value" style="color:${m >= 60 ? 'var(--ok)' : m >= 45 ? 'var(--warn)' : 'var(--bad)'}">${m >= 60 ? 'BURN OK' : m >= 45 ? 'MARGINAL' : 'REJECT'}</div></div>`;
    verdict.className = 'banner ' + (m >= 60 ? 'banner-info' : m >= 45 ? 'banner-warn' : 'banner-bad');
    verdict.innerHTML = m >= 60
      ? '<b>GLOAD PASS.</b> Cell holds its programmed state with guard-band margin. ECC checksum (reg 0x1B) will validate forever.'
      : m >= 45
        ? '<b>Marginal cell.</b> Reads correctly today, may drift over temp/aging. EOL should reject or re-burn — a latent field failure otherwise.'
        : '<b>GLOAD FAIL.</b> Cell not programmed to margin. Reject the unit; check burn voltage (P2RAM_CONTROL burn command path) and VDD_Burn integrity.';
  }
  card.appendChild(slider); card.appendChild(readout); card.appendChild(verdict);
  container.appendChild(card);
  render();
}

/* --- HAL EEPROM NPRG counter --- */
function nprgCounter(container){
  const UI = window.ENC_UI;
  const card = UI.h(`<div class="card"><h3>NPRG — 100 programming cycles <span class="tag">interactive</span></h3>
    <p style="color:var(--muted);font-size:12px;margin:2px 0 10px">HAL 302x EEPROM guarantees ≥ <b>100</b> programming cycles (0 °C &lt; TA &lt; 55 °C). EOL flow burns maybe 2–3; field recalibration should be essentially never. Burn a few — watch the budget.</p></div>`);
  let used = 0;
  const bar = UI.h(`<div class="gauge"><div class="gauge-top"><span>EEPROM cycles consumed</span><b>0 / 100</b></div><div class="gauge-track"><div class="gauge-fill" style="width:0%;background:var(--ok)"></div></div></div>`);
  const log = UI.h(`<div class="spec-note" style="min-height:44px">No burns yet.</div>`);
  const row = UI.h(`<div style="display:flex;gap:8px;margin-top:10px"></div>`);
  const burn = UI.el('button', 'btn btn-primary', 'Burn EEPROM cycle'); burn.type = 'button';
  const reset = UI.el('button', 'btn', 'Reset counter'); reset.type = 'button';
  burn.addEventListener('click', () => {
    if(used < 100) used++;
    const pct = used;
    bar.querySelector('b').textContent = `${used} / 100`;
    const fill = bar.querySelector('.gauge-fill');
    fill.style.width = pct + '%';
    fill.style.background = used > 85 ? 'var(--bad)' : used > 60 ? 'var(--warn)' : 'var(--ok)';
    log.textContent = used >= 100
      ? 'Budget exhausted — part must not be reprogrammed. Scrap or use as-is forever.'
      : `Burn #${used} OK (VSUP modulation on OUT3, readback verified). Remaining: ${100 - used} cycles.`;
  });
  reset.addEventListener('click', () => { used = 0; bar.querySelector('b').textContent = '0 / 100'; bar.querySelector('.gauge-fill').style.width = '0%'; log.textContent = 'Counter reset (simulation only — real EEPROM does not reset!).'; });
  row.appendChild(burn); row.appendChild(reset);
  card.appendChild(row); card.appendChild(bar); card.appendChild(log);
  container.appendChild(card);
}

window.ENC_SECTIONS.push({
  id:'otp', num:'11',
  title:'OTP / EEPROM Programming & Trim Transfer',
  sub:'EEPROM with 100 guaranteed cycles (HAL) vs one-shot OTP with verify (AS5147 / AS5116) — burn flows, guard-band checks, GLOAD, and the ECC that guards them.',
  refs:['§“Programming” · DSH000237','Figure 36–38 · DS000307','§“OTP/ECC” · DS000686'],
  tabs:{
    hal:{
      watch:[
        {t:'EEPROM, not OTP', d:'HAL 302x trims live in true <b>EEPROM</b> — reprogrammable in principle, <b>NPRG = 100 cycles</b> (0 °C &lt; TA &lt; 55 °C) guaranteed. That is for EOL correction, not for field writes: each burn stresses the cells.'},
        {t:'What lives in it', d:'mag_range, FINE_GAIN_CUST (1.25–1.5), bw_filt, OUT_DRV_CONFIG, en_outx, CONFIG, offset/gain/phase/0-angle calibration matrix, crossbar selection, lock bits. Everything Section 07–09 described.'},
        {t:'Programming entry', d:'<b>OUT3 overcurrent pattern</b> (2048/1536/1024/512 µs complex or 2048/2048 simple) → BiPhase mode → register writes by OUT3 modulation → readback verify → power-cycle. No test pin required — the output pin is the interface.'},
        {t:'Field recalibration?', d:'Possible (EEPROM!) but: 100-cycle budget + EOL traceability + safety case impact — almost always “no”. Calibrate once at EOL; if drift is observed in the field, that is a DV escape, not a service action.'},
      ],
      play:nprgCounter
    },
    as5147:{
      watch:[
        {t:'One shot, no undo', d:'OTP: bits burn once, forever. <b>PROGVERIFY → OTPBURN → PROGVERIFY</b> read-back discipline is the whole game. TaProg 5…45 °C; VDD_Burn 3.3–3.5 V; burn at 25 ± 20 °C or don’t burn at all.'},
        {t:'The 8-step EOL flow', d:'Apply supplies → thermal check → TEST/burn entry → write settings (SETTINGS2 0x0019, ABI, UVW poles…) → verify readback → <b>OTPBURN</b> → verify again → power-cycle + bench sanity. 8 gates, interlocked in the programmer.'},
        {t:'What to burn', d:'ABI resolution (ABIRES), UVW pole pairs, PWM source/mux, NOISESET, 3V150°C bit (if needed), DAECDIS, parity enable, output drive strength, polarity, customer ID / lot code for traceability.'},
        {t:'Death by wrong order', d:'Burn before verify → a stuck cell silently corrupts gain forever. Burn at 60 °C → marginal fuse, drifts at cold. Skip final power-cycle → miss boot-from-OTP faults. All three happen in real factories — interlock them.'},
      ],
      play:otpSequence
    },
    as5116:{
      watch:[
        {t:'OTP + Hamming', d:'Every burned byte carries a <b>Hamming SEC</b> checksum (ECC reg 0x1B: Chsum 0:6 + EN 7). Startup verifies → single-bit errors self-heal silently; double-bit → major system error → safe outputs.'},
        {t:'GLOAD — burn quality, closed loop', d:'<b>P2RAM_CONTROL (0x03)</b> commands: state read, load latch from fuse, <b>GLOAD guard-band check</b>, burn. GLOAD reads each cell at reduced drive — flags weak cells that would drift across temperature. This is <u>verification of the burn itself</u>, not just the data.'},
        {t:'Burn flow', d:'UART or pin-banged service mode → 0x55 sync → write GAIN_CODE / TD / VCM trims → GLOAD → burn → ECC re-verify → power-cycle → bench check (gain vs Bz sweep). TA_PROG 0…45 °C.'},
        {t:'Lock it down', d:'After burn: set the lock bits (programming disable). An unlocked AS5116 in a noisy service bay is one UART glitch away from a corrupted GAIN_CODE. Lock = free insurance.'},
      ],
      play:guardBandDemo
    },
    compare:{
      watch:[
        {t:'Memory economics', d:'EEPROM (HAL) = 100 cycles, field-tweakable, no burn fixture (OUT3!) — lowest factory cost. OTP (AS5147/AS5116) = 1 cycle, irreversible, but <u>immutable in the field</u> — best integrity story for safety and anti-tamper.'},
        {t:'Integrity verification', d:'HAL: readback via the analog path (ADC in the fixture) — indirect but proven. AS5147: digital readback + parity — fast & absolute. AS5116: readback + <b>GLOAD margin check + Hamming ECC</b> — the only one that verifies the physics of the fuse.'},
        {t:'EOL test-time ranking', d:'HAL: ~50 ms per unit (pattern + writes + verify) · AS5147: ~1 s (8-step + 2 verifies) · AS5116: ~1 s (burn + GLOAD + ECC). Multiply by your takt time — fixture complexity differs too (OUT3 vs SPI vs UART pogos).'},
      ],
      play:function(container, data){ window.ENC_UI.comparePane(container, ['Programming & trim','Diagnostics & safety']); }
    },
  }
});
