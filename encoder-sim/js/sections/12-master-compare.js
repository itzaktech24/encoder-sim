/* Section 12 — Master compare: full matrix + application recommender */
window.ENC_SECTIONS = window.ENC_SECTIONS || [];

const QUIZ = [
  {q:'How does your MCU want to see angle?', opts:[
    ['ADC channels — I have spare ones, love ratiometric analog', {hal:3, as5116:3, as5147:0}],
    ['Digital bus — SPI preferred, minimal analog routing', {as5147:4, hal:0, as5116:1}],
    ['Ready-made commutation (ABI/UVW) straight to the inverter', {as5147:4, hal:1, as5116:0}],
    ['Differential analog pair — best SNR over a long cable run', {as5116:4, hal:2, as5147:0}],
  ]},
  {q:'Rotor speed class?', opts:[
    ['≤ 3 000 rpm — fans, pumps, appliances', {hal:2, as5147:2, as5116:2}],
    ['3 000 – 15 000 rpm — EV traction, turbo, spindles', {as5147:3, as5116:2, hal:1}],
    ['15 000 – 30 000 rpm — high-speed drives', {as5116:3, hal:2, as5147:1}],
    ['30 000 – 60 000 rpm — extreme / air-bearing class', {hal:4, as5116:1, as5147:0}],
  ]},
  {q:'Magnetic environment?', opts:[
    ['Clean — shielded resolver-style bay', {hal:2, as5147:2, as5116:2}],
    ['Inverter bay, high stray dV/dt + di/dt', {hal:3, as5116:2, as5147:1}],
    ['Heavy stray field — ferrite plates unreliable', {hal:4, as5116:1, as5147:0}],
    ['Long cable between sensor and MCU', {as5116:4, hal:1, as5147:1}],
  ]},
  {q:'Factory programming flow?', opts:[
    ['Burn once at EOL — traceability via OTP, no field writes', {as5147:2, as5116:2, hal:1}],
    ['Field-tweakable EEPROM preferred — calibration escapes happen', {hal:4, as5147:0, as5116:0}],
    ['Zero programming — ship fixed function', {as5147:2, as5116:2, hal:1}],
  ]},
  {q:'Safety posture?', opts:[
    ['ASIL-B/D chain — built-in diagnostics + error bands wanted', {hal:4, as5147:2, as5116:1}],
    ['QM/SEooC with supervision — digital parity + registers fine', {as5147:3, hal:1, as5116:2}],
    ['Transmission/speed class — ECC + guard-band burn wanted', {as5116:4, hal:1, as5147:1}],
  ]},
];

function recommender(container){
  const UI = window.ENC_UI;
  const card = UI.h(`<div class="card"><h3>Pick my sensor — application recommender <span class="tag">interactive</span></h3><p style="color:var(--muted);font-size:12px;margin:2px 0 10px">Five questions. Weighted scoring over verified datasheet traits — not marketing. Your result includes the *why*.</p></div>`);
  const answers = new Array(QUIZ.length).fill(-1);
  const result = UI.h(`<div class="banner banner-info" style="margin-top:12px">Answer all ${QUIZ.length} questions to get a recommendation.</div>`);
  const scoreBar = UI.h(`<div style="margin-top:12px"></div>`);
  QUIZ.forEach((item, qi) => {
    const q = UI.h(`<div style="margin:14px 0 6px;font-size:13.5px;color:var(--text);font-weight:600">${qi + 1}. ${item.q}</div>`);
    const opts = UI.h(`<div></div>`);
    item.opts.forEach(([label], oi) => {
      const b = UI.el('button', 'quiz-opt', label);
      b.type = 'button';
      b.addEventListener('click', () => {
        answers[qi] = oi;
        opts.querySelectorAll('.quiz-opt').forEach((x, i) => x.classList.toggle('correct', i === oi));
        render();
      });
      opts.appendChild(b);
    });
    card.appendChild(q); card.appendChild(opts);
  });
  card.appendChild(scoreBar); card.appendChild(result);
  function render(){
    if(answers.some(a => a === -1)) return;
    const score = {hal:0, as5147:0, as5116:0};
    answers.forEach((a, qi) => {
      const w = QUIZ[qi].opts[a][1];
      Object.entries(w).forEach(([k, v]) => { score[k] += v; });
    });
    const max = Math.max(score.hal, score.as5147, score.as5116);
    const winner = Object.entries(score).filter(([,v]) => v === max).map(([k]) => k);
    const names = {hal:'TDK-Micronas HAL 3021', as5147:'ams AS5147', as5116:'ams AS5116'};
    const total = Object.values(score).reduce((a,b) => a+b, 0) || 1;
    scoreBar.innerHTML = Object.entries(score).map(([k, v]) => {
      const pct = Math.round(v / total * 100);
      const color = {hal:'var(--hal)', as5147:'var(--as5147)', as5116:'var(--as5116)'}[k];
      return `<div class="gauge"><div class="gauge-top"><span>${names[k]}</span><b>${v} pts · ${pct}%</b></div><div class="gauge-track"><div class="gauge-fill" style="width:${pct}%;background:${color}"></div></div></div>`;
    }).join('');
    result.className = 'banner banner-info';
    result.innerHTML = winner.length > 1
      ? `<b>Tie: ${winner.map(w => names[w]).join(' vs ')}.</b> Environment-dependent — pick by Section 03 ESD/EMC needs and Section 11 factory-programming constraints. Run both through DV.`
      : `<b>Recommended: ${names[winner[0]]}.</b> Score ${max}/${total}. Validate against the master matrix below, then check Section 07 (latency budget at your speed) and Section 10 (diagnostics required by your safety case) before freezing the BOM.`;
  }
  container.appendChild(card);
}

window.ENC_SECTIONS.push({
  id:'compare', num:'12',
  title:'Master Compare — Three Devices, One Table',
  sub:'The full cross-device matrix (every row verified against the datasheets), the mismatch flags, and an application recommender.',
  refs:['All three datasheets, full text'],
  tabs:{
    hal:{
      watch:[
        {t:'HAL 302x in one line', d:'Analog ratiometric SIN/COS, 2–60 k RPM class, FuSa diagnostics, EEPROM, SOIC-8 — the <b>motor-commutation workhorse</b> where a stray-field-immune analog interface is loved by legacy and resolver-replacement designs.'},
        {t:'Strengths', d:'70.5 kHz analog bandwidth · 2 ns jitter · stray-field ΔEθ ≤ 0.06° (3021) · 60 000 rpm · EEPROM re-trims · error-band signalling · ISO 11452-8 characterized · best-in-class ESD (±8 kV gun w/ PCB protection).'},
        {t:'Watch-outs', d:'No digital interface (needs ADC + prog fixture) · OUT3 is both COS and prog pin · sensitivity spread 31.5–36 %VSUP across parts (calibrate!) · noise grows √BW · programming cycles limited to 100.'},
        {t:'Pick when', d:'Resolver replacement · high-rpm EV/e-axle commutation · ASIL powertrain sensing · harshest EMC · field-calibration escapes tolerated · minimum MCU coupling wanted.'},
      ],
      play:function(container, data){ window.ENC_UI.comparePane(container, ['Identity & class','Magnetic input','Accuracy & dynamics','Diagnostics & safety']); }
    },
    as5147:{
      watch:[
        {t:'AS5147 in one line', d:'<b>14-bit angle as data</b>: CORDIC + DAEC, SPI mode 1, ABI/UVW/PWM outputs, DIAG layers — a sensor that doubles as a <b>commutation controller</b> for fixed-topology BLDC drives.'},
        {t:'Strengths', d:'ANGLECOM compensated readout (0.18° max DAE @14.5 k rpm) · DAEC 1.5–1.9 µs effective · SPI ≤10 MHz + parity · ABI 2048 cpr · UVW 1–7 poles · PWM · full diagnostic set · OTP immutable in field.'},
        {t:'Watch-outs', d:'Raw latency 90–110 µs without DAEC · 2 kV ESD only · no gun rating · Bz window 35–70 mT (narrow!) · SPI firmware is yours to write & verify · 3.3 V mode temp cap unless 3V150°C bit · OTP = one shot.'},
        {t:'Pick when', d:'Servo / position loops · FOC with digital current sensing · BLDC pumps/fans (UVW direct drive, MCU-less) · where ratiometric routing is impossible · needs-register-level diagnostics.'},
      ],
      play:function(container, data){ window.ENC_UI.comparePane(container, ['Identity & class','Outputs & interfaces','Accuracy & dynamics','Programming & trim']); }
    },
    as5116:{
      watch:[
        {t:'AS5116 in one line', d:'<b>DMOD-cleaned differential analog</b> for ±30 000 rpm speed/direction — the transmission-grade sibling of the HAL 302x, differential out the door, UART-serviced, ECC-guarded.'},
        {t:'Strengths', d:'±30 000 rpm · 10–100 mT window · differential end-to-end + CM taps · DMOD 1/f rejection · gain 8–60 mV/mT · ECC + GLOAD burn guard-band · ISO 11452-8 characterized · TJ 165 °C.'},
        {t:'Watch-outs', d:'No digital angle (needs differential ADC) · GV ±16 % (must calibrate in system) · TD 12–20 µs latency · UART service only during burn (not runtime) · IDD ≤ 17 mA · pin 4 = VDD5 (not compatible with HAL 302x!).'},
        {t:'Pick when', d:'Transmission speed/direction · longest cable runs · harshest EMI bays · high-volume EOL with service-UART fixture · where analog-only existing designs demand differential upgrade path.'},
      ],
      play:function(container, data){ window.ENC_UI.comparePane(container, ['Magnetic input','Supply & thermal','Diagnostics & safety','Outputs & interfaces']); }
    },
    compare:{
      watch:[
        {t:'How to read this matrix', d:'Every row is traceable to a datasheet page — units appended, “—” = not published in the extract. <b>Violet-highlighted rows differ across devices.</b> Use the filter box & difference toggle; expand via Section 12 tabs for device-focused views.'},
        {t:'Mismatch flags — read this first', d:'(1) <b>“150 mW”</b> belongs to <b>AS5147</b> (Pt abs-max), not “all sensors”. HAL 302x: typ self-heat 53/65 mW (3020/3021) @ 5 V. (2) <b>Stray-field ΔEθ ≤ 0.06° is HAL 3021 only</b> — 3020 is ≤ 0.10°. (3) <b>“IDD 10.5–17 mA”</b> is a mix: HAL 3020 → 10.5 typ/12 max, HAL 3021 → 13/15, AS5147 → 15, AS5116 → 17. (4) <b>“60 000 rpm”</b> is HAL, bandwidth-limited — AS5116 is ±30 000, AS5147 specified at 14 500 rpm (DAE). (5) <b>“Analog outputs”</b> does not describe AS5147 at all — it is digital.'},
        {t:'The one-sentence verdicts', d:'<b>HAL 302x</b> — analog purist, fastest, toughest EMC, needs ADC. <b>AS5147</b> — angle as data, richest features, needs SPI firmware. <b>AS5116</b> — differential analog tank, ±30 k rpm, needs diff ADC and burns once.'},
        {t:'Before freezing the BOM', d:'Run: (1) Bz at plates over gap tolerance; (2) Δθ = ω·t at max rpm <u>including</u> ADC latency; (3) stray-field test with inverter switching; (4) ISO 10605 at the connector; (5) −40 °C cold-start angle sanity. Then sign the DV plan.'},
      ],
      play:function(container, data){
        container.appendChild(window.ENC_UI.h(`<div class="banner banner-warn" style="margin-bottom:14px"><b>Verification notice (datasheet vs common shorthand):</b> 150 mW → AS5147 only · 0.06° stray drift → HAL 3021 only · “10.5–17 mA” mixes three different IDD specs · 60 000 rpm → HAL only · 0.068° rms noise @NOISESET=0 (AS5147) is the same figure some decks quote as “0.06°”. Always cite the exact table &amp; condition.</div>`));
        window.ENC_UI.matrix(container, window.ENC_DATA.COMPARE.groups, {compact:false, filterable:true, showDiff:true, full:true});
        recommender(container);
      }
    },
  }
});
