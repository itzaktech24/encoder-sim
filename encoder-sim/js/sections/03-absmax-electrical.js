/* Section 03 — Absolute maximum ratings & electrical characteristics */
window.ENC_SECTIONS = window.ENC_SECTIONS || [];

const STRESS = {
  hal: {
    vdd: {min:3.0, max:5.5, absHigh:null, label:'VSUP recommended 3.0 / 5.0 / 5.5 V', note:'Beyond 5.5 V the device enters the overvoltage-detection band (VOV typ 5.85 / 6.1 / 6.35 V by xVDD_SOVI_BAND). No single abs-max VSUP line is published in DSH000237_002EN — treat OV detection as functional, damage ratings as not specified.'},
    ta:  {min:-40, max:150, absHigh:160, note:'TA operating −40…+150 °C (abs-max TA 160 °C · TJ 190 °C)'},
    esd: {limit:4, gun:8, note:'±4 kV HBM AEC-Q100-002 (100 pF/1.5 kΩ) · ±8 kV gun ISO 10605 with PCB protection'},
    extra:'Typ self-heat: 53 mW (3020) / 65 mW (3021) @ 5 V · IDD 10.5/12–13/15 mA · ISO 11452-8:2015 characterized'
  },
  as5147: {
    vdd: {min:-0.3, max:7.0, absHigh:7.0, label:'VDD abs-max −0.3/+7.0 V', note:'Operating 4.5/5.0/5.5 V · VDD3V3 abs-max 5.0 V · VREG 3.2/3.4/3.6 V'},
    ta:  {min:-40, max:150, absHigh:150, note:'TA (5 V mode) −40…+150 °C · TA (3.3 V mode) −40…+125 °C · TA_PROG 5…45 °C · TSTRG −55…+150 °C'},
    esd: {limit:2, gun:null, note:'±2 kV HBM AEC-Q100-002'},
    extra:'Pt = 150 mW abs-max · IDD ≤ 15 mA · Ta3V3 ≤ 125 °C (or ≤ 150 °C with 3V150°C bit)'
  },
  as5116: {
    vdd: {min:-0.3, max:7.0, absHigh:7.0, label:'VDD5 abs-max −0.3/+7.0 V', note:'Operating 4.5/5.0/5.5 V · VREG abs-max 5.0 V · IDD ≤ 17 mA'},
    ta:  {min:-40, max:150, absHigh:150, note:'TA operating −40…+150 °C · TJ max 165 °C · TA_PROG 0…45 °C · TSTRG −55…+150 °C'},
    esd: {limit:2, gun:null, note:'HBM per AEC-Q100-002 (see datasheet EMC chapter) · ISO 11452-8:2015 characterized'},
    extra:'VCM1 = 1.375 V · VCM2 = 2.125 V (defaults) · CLOAD ≤ 10 nF · IOUT ±1 mA · TPOWER_ON 10 ms'
  }
};

function stressExplorer(container, icKey){
  const UI = window.ENC_UI;
  const L = STRESS[icKey];
  const state = { v:5.0, t:25, esd:2 };
  const verdict = UI.h(`<div class="banner banner-info"></div>`);
  const gWrap = UI.h(`<div></div>`);
  const card = UI.h(`<div class="card"><h3>Stress explorer — abs-max vs recommended <span class="tag">interactive</span></h3></div>`);

  function render(){
    const {v, t, esd} = state;
    const rows = [];
    // supply verdict
    let vState = 'ok';
    if(icKey === 'hal'){ vState = (v < 3.0 || v > 5.5) ? (v > 6.35 ? 'bad' : 'warn') : 'ok'; }
    else { vState = (v < -0.3 || v > L.vdd.absHigh) ? 'bad' : (v < L.vdd.min || v > L.vdd.max - 2) ? 'warn' : 'ok'; }
    // temp verdict
    let tState = 'ok';
    if(t > L.ta.absHigh || t < -55) tState = 'bad'; else if(t > L.ta.max || t < L.ta.min) tState = 'warn';
    // esd verdict
    let eState = esd <= L.esd.limit ? 'ok' : (L.esd.gun && esd <= L.esd.gun ? 'warn' : 'bad');
    const badge = s => s === 'ok' ? '<span class="badge badge-ok">PASS</span>' : s === 'warn' ? '<span class="badge badge-warn">MARGINAL</span>' : '<span class="badge badge-bad">FAIL</span>';
    gWrap.innerHTML = `<div class="kv" style="margin:12px 0">
      <dt>Supply verdict</dt><dd>${badge(vState)} — ${L.vdd.label || L.vdd.min + '…' + L.vdd.max + ' V'}</dd>
      <dt>Temperature verdict</dt><dd>${badge(tState)} — ${L.ta.note}</dd>
      <dt>ESD immunity verdict</dt><dd>${badge(eState)} — ${L.esd.note}</dd>
    </div>`;
    const worst = [vState, tState, eState].includes('bad') ? 'bad' : ([vState, tState, eState].includes('warn') ? 'warn' : 'ok');
    verdict.className = 'banner ' + (worst === 'bad' ? 'banner-bad' : worst === 'warn' ? 'banner-warn' : 'banner-info');
    verdict.innerHTML = worst === 'bad'
      ? '<b>Out of specification.</b> Absolute-maximum limits are damage thresholds, not operating targets — design to the <u>recommended</u> column with ≥10 % margin.'
      : worst === 'warn'
        ? '<b>Inside the detection/abs-max grey zone.</b> Functional protection may act (OV/UV, thermal shutdown) but accuracy and lifetime are not guaranteed.'
        : '<b>All stresses within recommended operating conditions.</b> Good starting point — still budget self-heating & derating per AEC-Q100 grade 0/1.';
    verdict.innerHTML += `<div class="spec-note" style="margin-top:6px">${L.vdd.note}<br>${L.extra}</div>`;
  }
  card.appendChild(UI.sliderRow('Supply voltage', 2.5, 7.5, 0.05, state.v, 'V', v => { state.v = v; render(); }));
  card.appendChild(UI.sliderRow('Ambient temperature', -55, 175, 1, state.t, '°C', v => { state.t = v; render(); }));
  card.appendChild(UI.sliderRow('ESD gun event', 0, 16, 0.5, state.esd, 'kV', v => { state.esd = v; render(); }));
  card.appendChild(gWrap); card.appendChild(verdict);
  container.appendChild(card);
  render();
}

window.ENC_SECTIONS.push({
  id:'absmax', num:'03',
  title:'Absolute Maximum Ratings & Electrical Characteristics',
  sub:'Damage thresholds, operating windows, ESD/EMC classes and supply margins — the numbers that keep parts alive on an inverter PCB.',
  refs:['DSH000237 §5','DS000307 §“Absolute Maximum Ratings”','DS000686 §“Absolute Maximum Ratings”'],
  tabs:{
    hal:{
      watch:[
        {t:'Abs-max ≠ operating', d:'The <b>operating</b> window is VSUP 3.0/5.0/5.5 V, TA −40…+150 °C. The <b>survival</b> envelope is wider (TJ −40…+190 °C) — but nothing is guaranteed except not-instant-death. Design reviews target recommended, never abs-max.'},
        {t:'Over/undervoltage protection', d:'HAL 302x watches both rails: <b>VOV</b> typ 5.85/6.1/6.35 V and <b>UV</b> with hysteresis (e.g. xVDD_SUVI_BAND 255/155/105/55 mV class values by band). Outputs drive to defined safe levels on supply fault instead of random angles.'},
        {t:'ESD & EMC portfolio', d:'<b>±4 kV HBM</b> (AEC-Q100-002) and <b>±8 kV gun</b> ISO 10605 <u>with proper PCB protection</u>. ISO 11452-8:2015 direct power injection is characterized — the right test for motor-phase coupling. Add TVS + series R on every OUTx leaving the PCB.'},
        {t:'Self-heating', d:'Typ 53 mW (3020) / 65 mW (3021) at 5 V. At 150 °C ambient this consumes ~15–20 °C of the TJ budget in still air inside a sealed housing — verify junction rise in your enclosure, especially next to a hot FET.'},
      ],
      play:(c) => stressExplorer(c, 'hal')
    },
    as5147:{
      watch:[
        {t:'Hard numbers', d:'<b>VDD −0.3…+7.0 V</b>, <b>VDD3V3 −0.3…+5.0 V</b>, <b>Pt = 150 mW</b>, TA −40…+150 °C (5 V) / −40…+125 °C (3.3 V), TSTRG −55…+150 °C. OTP burn: TaProg <b>5…45 °C</b> only.'},
        {t:'3.3 V mode’s small print', d:'3.3 V operation is ≤ +125 °C unless the <b>3V150°C</b> bit (SETTINGS2 0x0019) is blown — then ≤ +150 °C. Many field escapes are exactly this bit being ignored at 140 °C soak. Check it before your thermal test.'},
        {t:'ESD reality check', d:'<b>±2 kV HBM</b> — half the HAL 302x class. Motor-drive environments need <b>external protection</b>: TVS on VDD/VDD3V3, SPI over a short run, no stubs to the cable connector. ISO 10605 gun testing is <u>not</u> claimed.'},
        {t:'IDD ≤ 15 mA', d:'Modest but not negligible: at 5 V that is 75 mW — half of the Pt budget. Good practice: measure IDD vs speed & temperature in DV, not just typ at 25 °C.'},
      ],
      play:(c) => stressExplorer(c, 'as5147')
    },
    as5116:{
      watch:[
        {t:'Hard numbers', d:'<b>VDD5 −0.3…+7.0 V</b>, VREG abs-max <b>5.0 V</b>, IDD ≤ <b>17 mA</b> (largest of the three), TJ ≤ <b>165 °C</b>, TA_PROG 0…45 °C for OTP. TSTRG −55…+150 °C.'},
        {t:'VREG is not a supply', d:'VDD3 (pin 5) is the <b>internal regulator output</b> — externally decouple only, never feed it. Driving VREG above 5.0 V or back-feeding it while unpowered violates abs-max instantly.'},
        {t:'EMC-characterized', d:'<b>ISO 11452-8:2015</b> characterized — alongside HAL 302x it is the only one with this claim. Still add: common-mode chokes on the SIN/COS pairs if they leave the board, TVS on VDD5, solid GND plane under the sensor.'},
        {t:'10 ms to valid outputs', d:'TPOWER_ON = <b>10 ms</b>. The MCU must ignore (or gate) SIN/COS readings for 10 ms after power-up, or use the DIAG pin status — same discipline as an ASIL brown-out window.'},
      ],
      play:(c) => stressExplorer(c, 'as5116')
    },
    compare:{
      watch:[
        {t:'Same envelope, different details', d:'All three tolerate <b>+7 V</b> class abs-max supply and industrial/automotive −40 °C starts. The differences: ESD (4/2/AEC-class kV), gun rating (HAL only), ISO 11452-8 (HAL & AS5116), and programming-temp windows (0–55 / 5–45 / 0–45 °C).'},
        {t:'The 150 mW figure in most slides', d:'“150 mW” belongs to the <b>AS5147</b> (Pt abs-max). HAL 302x publishes typical self-heat 53/65 mW instead; AS5116 expects thermal design by IDD ≤ 17 mA × VDD5. Do not mix these rows in a requirements table.'},
        {t:'Design margin recipe', d:'Derate junction temp by 20 %, voltage by 10 %, ESD paths by layout (not by silicon). Then verify: (1) ISO 10605 gun at the connector, (2) ISO 11452-8 at the harness, (3) hot soak at max load — all three ICs, same method.'},
      ],
      play:function(container, data){ window.ENC_UI.comparePane(container, ['Supply & thermal','Identity & class']); }
    },
  }
});
