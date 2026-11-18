/* Section 06 — Output stages & waveforms */
window.ENC_SECTIONS = window.ENC_SECTIONS || [];
window.ENC_SECTIONS.push({
  id:'outputs', num:'06',
  title:'Output Stages — Analog, Digital, PWM & ABI',
  sub:'Live traces of exactly what leaves the pins: ratiometric SIN±/COS±, differential drivers, ANGLE registers, ABI quadrature, UVW commutation and PWM.',
  refs:['Fig. 5–9/5–10 · DSH000237','Figure 33/34 · DS000307','DS000686 §“SIN/COS Outputs”'],
  tabs:{
    hal:{
      watch:[
        {t:'Ratiometric by construction', d:'OUT1..OUT4 swing <b>10–90 % of VSUP</b> in quadrature. Ratiometric = the ADC ratiometric to VSUP rejects supply noise for free. OUT3/OUT4 share the COS channel; OUT3 is also the programming pin — with single-ended use, plan routing and protection accordingly.'},
        {t:'Differential vs single-ended', d:'Differential SIN±/COS± doubles SNR and cancels CM shift. Cost: 4 ADC channels (or 2 diff inputs). Single-ended mode with OUT3 as prog pin is possible but gives up COS differential headroom.'},
        {t:'Error-band signalling', d:'On fault, OUTx leaves the valid 10–90 % band: <b>90/96 %VSUP</b> = error-high, <b>50 %VSUP</b> = center, <b>10/4 %VSUP</b> = error-low, plus <b>high-Z</b> (en_outx = 0). The receiving ADC+MCU must treat out-of-band as a fault — same idea as ASIL PWM “low” signalling.'},
        {t:'Sensitivity budget', d:'Typ 33 (min 31.5 / max 36) %VSUP per mag_range; e.g. 0.022 V/mT at 5 V, mag_range = 75 mT. ADC reference design: full-scale ±1.5 V sin swing → good match for 3.3/5 V ADC with PGA gain 1–2.'},
      ],
      play:function(container, data){
        const state = { safe:'normal' };
        const card = window.ENC_UI.h(`<div class="card"><h3>OUT1..OUT4 vs shaft angle <span class="tag">oscilloscope</span></h3></div>`);
        const scopeHost = window.ENC_UI.h(`<div></div>`);
        const seg = window.ENC_UI.segButtons(['Normal', 'Error-high 90%', 'Error-low 10%', 'High-Z (off)'], 0, (i, label) => {
          state.safe = ['normal','high','low','hiz'][i];
          scopeHost.innerHTML = '';
          build();
        });
        function wave(fn){
          if(state.safe === 'normal') return fn;
          if(state.safe === 'high') return () => 90;
          if(state.safe === 'low') return () => 10;
          return () => 0.5; // high-Z shown as mid-rail residual
        }
        function build(){
          const mk = (base, phase) => x => {
            const r = 50 + 28 * Math.sin(x * Math.PI/180 + phase);
            return state.safe === 'normal' ? r : (state.safe === 'high' ? 90 : state.safe === 'low' ? 10 : 0.5);
          };
          window.ENC_SIMS.scope(scopeHost, {
            title: state.safe === 'normal' ? 'NORMAL OPERATION — 10…90 %VSUP valid band' : (state.safe === 'hiz' ? 'HIGH-Z — output driver disabled (receiver sees pull-down residual)' : 'SAFE STATE — out-of-band error level, ADC must flag fault'),
            xLabel:'shaft angle [°]', xMin:0, xMax:360, yLabel:'% VSUP', yMin:0, yMax:100,
            traces:[
              {label:'OUT1 +SIN', color:'#FBBF24', fn:mk(0, 0)},
              {label:'OUT2 −SIN', color:'#F59E0B', fn:mk(0, Math.PI), dash:[4,3]},
              {label:'OUT3 +COS', color:'#22D3EE', fn:mk(0, Math.PI/2)},
              {label:'OUT4 −COS', color:'#67E8F9', fn:mk(0, 3*Math.PI/2), dash:[4,3]},
            ]
          });
        }
        card.appendChild(seg);
        card.appendChild(scopeHost);
        container.appendChild(card);
        build();
      }
    },
    as5147:{
      watch:[
        {t:'One die, four formats', d:'AS5147 speaks: (1) <b>ANGLE / ANGLECOM</b> 14-bit over SPI, (2) <b>ABI</b> quadrature 2048/1024 cpr, (3) <b>UVW</b> 1–7 pole pairs, (4) <b>PWM</b> duty ∝ angle (frame 4119 clk). All are <u>always available</u>; muxes decide pins 6–10 & 14.'},
        {t:'ABIRES — the cpr knob', d:'ABIRES bit: <b>11-bit → 2048 steps/rev</b>, <b>10-bit → 1024</b>. Angle per count: 0.176° / 0.352°. For BLDC commutation without a CPU, ABI direct to Hall-input inverter gates works beautifully.'},
        {t:'PWM frame economics', d:'<b>4119 clock periods per frame</b>; duty 0.3–99.7 % (13–16 of first 16 periods low = error in PWM-over-frames mode, or all 4096 low). A simple MCU captures period+duty with any timer — no firmware protocol stack.'},
        {t:'UVW — the commutation dream', d:'1–7 pole pairs, exact 120° spacing, 000 safe-state on error. Pair with an inverter that has Hall-emulation inputs: <b>zero MCU in the torque path</b> for fixed-speed BLDC fans, pumps, e-scooters.'},
      ],
      play:function(container, data){
        const state = { angle: 120 };
        const card = window.ENC_UI.h(`<div class="card"><h3>A/B quadrature & PWM duty vs angle <span class="tag">oscilloscope</span></h3>
          <p style="color:var(--muted);font-size:12px;margin:2px 0 10px">Toggle the angle slider — watch the quadrature phase and the PWM duty. ABI drawn over one electrical cycle (4 visible periods, illustrative).</p></div>`);
        const scopeHost = window.ENC_UI.h(`<div></div>`);
        const angleCtl = window.ENC_UI.sliderRow('Rotor electrical angle', 0, 360, 1, state.angle, '°', v => { state.angle = v; dutyOut.innerHTML = dutyHtml(); redraw(); });
        const dutyOut = window.ENC_UI.h(`<div class="readout"></div>`);
        function dutyHtml(){
          const duty = state.angle / 360 * 100;
          return `<div class="readout-item"><div class="ro-label">PWM duty</div><div class="ro-value">${duty.toFixed(1)}<span class="ro-unit"> %</span></div></div>
            <div class="readout-item"><div class="ro-label">ABI position</div><div class="ro-value">${Math.round(state.angle/360*2048)}<span class="ro-unit"> /2048 cpr</span></div></div>
            <div class="readout-item"><div class="ro-label">UVW sector</div><div class="ro-value">${Math.floor(((state.angle%60)+60)/10) % 6 + 1}<span class="ro-unit"> /6</span></div></div>`;
        }
        let scope;
        function redraw(){
          scopeHost.innerHTML = '';
          const sq = (x, phase) => (Math.sin((x - phase) * 4 * Math.PI/180) >= 0 ? 1 : -1);
          scope = window.ENC_SIMS.scope(scopeHost, {
            title:'A (phase), B (90° lag), INDEX (1/rev), PWM',
            xLabel:'shaft angle [°]', xMin:0, xMax:360, yLabel:'logic', yMin:-1.6, yMax:1.8,
            traces:[
              {label:'A', color:'#FBBF24', fn:x => sq(x, 0)},
              {label:'B', color:'#22D3EE', fn:x => sq(x, 90/4), dash:[5,3]},
              {label:'I (index)', color:'#A78BFA', fn:x => (x < 6 ? 1 : -1)},
              {label:'PWM duty', color:'#34D399', fn:x => (x <= state.angle % 360 ? 1 : -1) * 0.7 - 0.0, dash:[2,2]},
            ]
          });
        }
        card.appendChild(angleCtl); card.appendChild(dutyOut); card.appendChild(scopeHost);
        container.appendChild(card);
        dutyOut.innerHTML = dutyHtml(); redraw();
      }
    },
    as5116:{
      watch:[
        {t:'Differential everything', d:'SINP/SINN and COSP/COSN — push-pull drivers, anti-phase by construction. Common-mode outputs CM_SIN/CM_COS reference your ADC’s sampling caps to the exact output CM (defaults 1.375 / 2.125 V).'},
        {t:'Swing & loading', d:'Each pin swings <b>GND+0.25 V … VDD−0.5 V</b> peak-wise; differential amplitude (peak) = M × Bz with M = 8–60 mV/mT. CLOAD ≤ 10 nF, IOUT ≤ ±1 mA — the DRV stage is sized for cable + ADC, not for 50 Ω lines.'},
        {t:'Reading it clean', d:'Best practice: differential ADC or fully-differential PGA referenced to CM_SIN/CM_COS, bulk cap 100 nF per pair at the receiver. Never single-end one leg against GND — you throw away the CM rejection you paid for.'},
        {t:'DIAG on pin 6', d:'Pin 6 multiplexes <b>DIAG + UART</b>: in service mode it is the 1.1–70 kbit/s port; in run mode it flags fault — wire it to an MCU interrupt, and treat “DIAG high” as torque-disable. See Section 10.'},
      ],
      play:function(container, data){
        const card = window.ENC_UI.h(`<div class="card"><h3>Differential SINP/SINN & COSP/COSN <span class="tag">oscilloscope</span></h3>
          <p style="color:var(--muted);font-size:12px;margin:2px 0 10px">Traces in volts around VCM (typ 1.375 / 2.125 V). Swing set by Gain_Code — here 32 mV/mT @ 5 V × 62.5 mT signal = ±2.0 V differential.</p></div>`);
        const scopeHost = window.ENC_UI.h(`<div></div>`);
        window.ENC_SIMS.scope(scopeHost, {
          title:'Differential outputs (VCM1 ≈ 1.375 V, VCM2 ≈ 2.125 V)',
          xLabel:'shaft angle [°]', xMin:0, xMax:360, yLabel:'V', yMin:-0.5, yMax:4.5,
          traces:[
            {label:'SINP', color:'#34D399', fn:x => 1.375 + 1.0 * Math.sin(x * Math.PI/180)},
            {label:'SINN', color:'#10B981', fn:x => 1.375 - 1.0 * Math.sin(x * Math.PI/180), dash:[5,3]},
            {label:'COSP', color:'#22D3EE', fn:x => 2.125 + 1.0 * Math.cos(x * Math.PI/180)},
            {label:'COSN', color:'#67E8F9', fn:x => 2.125 - 1.0 * Math.cos(x * Math.PI/180), dash:[5,3]},
          ]
        });
        card.appendChild(scopeHost);
        container.appendChild(card);
      }
    },
    compare:{
      watch:[
        {t:'Three output philosophies', d:'<b>HAL</b> = voltage ratiometric (no protocol, no clock) · <b>AS5147</b> = numbers & edges (register + ABI + PWM) · <b>AS5116</b> = high-integrity analog pairs (differential + CM taps). Choose by what your MCU/ADC/inverter already speaks.'},
        {t:'Fault behaviour is the hidden spec', d:'HAL: out-of-band voltage (≥90/≤10/4 %VSUP) or high-Z · AS5147: ABI=111, UVW=000, PWM stuck low (≈0.3 % or 0 % duty) · AS5116: pin-6 DIAG + UART flags. All three are detectable with a plain comparator or timer capture — no exotic safety IC required.'},
        {t:'EMC ranking (output pins only)', d:'AS5116 differential ≥ HAL differential ≫ AS5147 push-pull CMOS (but AS5147’s SPI is point-to-point low-swing, so it wins inside a sealed control unit). Cable runs &gt; 10 cm: differential or shielded, always.'},
      ],
      play:function(container, data){ window.ENC_UI.comparePane(container, ['Outputs & interfaces','Diagnostics & safety']); }
    },
  }
});
