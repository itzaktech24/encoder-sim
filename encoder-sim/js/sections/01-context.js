/* Section 01 — Motor context & why encoders sit in commutation loops */
window.ENC_SECTIONS = window.ENC_SECTIONS || [];
window.ENC_SECTIONS.push({
  id:'context', num:'01',
  title:'Motor Context & Encoder Basics',
  sub:'Where rotary position sensors live inside a brushless drive — commutation sectors, field-oriented control, latency budgets and stray fields — before any silicon detail.',
  refs:['DSH000237_002EN','DS000307','DS000686'],
  tabs:{
    hal:{
      watch:[
        {t:'The job to be done', d:'Every brushless motor needs to know <b>where its rotor is</b>. The HAL 302x answers with <b>ratiometric analog SIN/COS</b> — two voltages that swing 10–90 % of VSUP in quadrature. Any downstream ADC (including a resolver-to-digital-style front end) can recover angle = atan2(V<sub>SIN</sub>, V<sub>COS</sub>) with zero protocol overhead.'},
        {t:'Inside the drive chain', d:'Typical placement: <b>rotor magnet → HAL 302x → MCU ADC → FOC / commutation logic → gate driver → phase currents</b>. Because the outputs are analog, there is no serialization latency — the limiting factor is the analog filter (bw_filt, 16.1 kHz default) plus your ADC sampling rate.'},
        {t:'Latency = angle error', d:'Angle error from latency is <b>Δθ = ω·t</b>. At 10 000 rpm (ω ≈ 1047 rad/s), the HAL 302x low-bandwidth setting (t<sub>Delay</sub> typ 40.4 µs) costs ≈ <b>0.042°</b>; maximum bandwidth (4.59 µs) costs ≈ <b>0.005°</b>. FOC at high rpm almost always wants bw_filt = 00…01.'},
        {t:'Stray-field reality', d:'Inverter phase currents couple tens of mT of stray flux into the sensor. HAL 3021 keeps ΔE<sub>θ</sub> drift ≤ <b>0.06°</b> (3020: ≤ 0.10°) — this, not base accuracy, is usually why HAL 3021 is chosen for harsh drives. Layout shielding still matters; see Section 12.'},
        {t:'What to look at next', d:'Section 02 pinouts → Section 04 functional blocks → Section 05 hall array geometry → Section 06 outputs. The physics sandbox in Section 05 is the single best 10 minutes in this lab.'},
      ],
      play:function(container, data){
        const UI = window.ENC_UI;
        const card = UI.h(`<div class="card"><h3>FOC latency & sector explorer <span class="tag">interactive</span></h3>
          <p style="color:var(--muted);font-size:12px;margin:0 0 8px">Commutation needs the rotor angle <b>before</b> the torque vector is applied. Latency rotates the measured vector behind the true rotor — pure loss.</p></div>`);
        const readout = UI.h(`<div class="readout"></div>`);
        const bars = UI.h(`<div style="margin-top:6px"></div>`);
        const mk = () => {
          const speed = +speedSlider.querySelector('input').value, polePairs = +ppSlider.querySelector('input').value;
          const omega = speed * 2 * Math.PI / 60;
          const elec = (omega * polePairs);
          const err = t => elec * t * 180 / Math.PI;
          const rows = [
            ['HAL 302x · bw_filt=00 (typ 4.59 µs)', err(4.59e-6), '#FBBF24'],
            ['HAL 302x · bw_filt=11 (typ 40.4 µs)', err(40.4e-6), '#F59E0B'],
            ['AS5147 raw (90–110 µs)', err(100e-6), '#22D3EE'],
            ['AS5147 + DAEC (1.5–1.9 µs)', err(1.7e-6), '#67E8F9'],
            ['AS5116 · TD = 16 µs', err(16e-6), '#34D399'],
          ];
          readout.innerHTML = `<div class="readout-item"><div class="ro-label">Mechanical speed</div><div class="ro-value">${speed}<span class="ro-unit"> rpm</span></div></div>
            <div class="readout-item"><div class="ro-label">Electrical frequency</div><div class="ro-value">${(elec/2/Math.PI).toFixed(0)}<span class="ro-unit"> Hz</span></div></div>
            <div class="readout-item"><div class="ro-label">Time per elec. degree</div><div class="ro-value">${(1000/(elec*180/Math.PI)).toFixed(2)}<span class="ro-unit"> µs</span></div></div>`;
          const maxErr = Math.max(...rows.map(r => r[1]), 0.001);
          bars.innerHTML = `<div class="spec-note" style="margin:4px 0 8px">Electrical angle error Δθ = ω<sub>elec</sub>·t<sub>delay</sub> at ${speed} rpm, ${polePairs} pole pairs:</div>` +
            rows.map(([l, e, c]) => `<div class="gauge"><div class="gauge-top"><span>${l}</span><b>${e.toFixed(4)}°</b></div>
              <div class="gauge-track"><div class="gauge-fill" style="width:${Math.max(1.5, e/maxErr*100)}%;background:${c}"></div></div></div>`).join('');
        };
        const speedSlider = UI.sliderRow('Rotor speed', 100, 14500, 50, 3000, 'rpm', mk);
        const ppSlider = UI.sliderRow('Pole pairs', 1, 12, 1, 4, '', mk);
        card.appendChild(speedSlider); card.appendChild(ppSlider); card.appendChild(readout); card.appendChild(bars);
        container.appendChild(card);
        mk();
      }
    },
    as5147:{
      watch:[
        {t:'The job to be done', d:'The AS5147 does the conversion <b>on-die</b>: plates → A/D → CORDIC → <b>14-bit ANGLE</b>, delivered over SPI and/or ABI/UVW/PWM. Your MCU reads a number, not a voltage — no external ADC, no ratiometric error chain.'},
        {t:'Inside the drive chain', d:'<b>rotor magnet → AS5147 → SPI (ANGLECOM) → MCU → FOC → gate driver</b>. Alternatively the device drives the inverter <b>directly</b>: U/V/W with 1–7 programmable pole pairs replaces external commutation logic for BLDC/PMSM drives.'},
        {t:'Latency & DAEC', d:'Raw pipeline latency is 90–110 µs, which at high speed would be a huge angle error. The <b>Dynamic Angle Error Compensation</b> adds ω·t<sub>delay</sub> back: DAE<sub>1700</sub> = 0.02°, DAE<sub>max</sub> = <b>0.18° @ 14 500 rpm</b>, and only 1.5–1.9 µs effective added delay (t<sub>delay_DAEC</sub>).'},
        {t:'Angle codes you will read', d:'<code>ANGLE</code> 0x3FFE (raw), <code>ANGLECOM</code> 0x3FFF (compensated — <b>use this one</b>), <code>DIAAGC</code> 0x3FFC and <code>MAG</code> 0x3FFD for diagnostics/field strength. 14-bit ⇒ 0.022° per LSB.'},
        {t:'What to look at next', d:'Section 04 (block diagram), Section 05 (geometry), Section 07 gains/DAE math, Section 08 SPI framing. The race-condition simulator in Section 10 shows why latch-atomic reads matter.'},
      ],
      play:function(container, data){ container.appendChild(window.ENC_UI.h(`<div class="card"><h3>Use the HAL tab sandbox <span class="tag">shared math</span></h3><p style="color:var(--muted);font-size:13px">The latency bar chart under the <b>HAL 302x</b> tab compares all three devices side by side — including AS5147 raw vs AS5147+DAEC. Open it to build intuition for Δθ = ω·t.</p></div>`)); }
    },
    as5116:{
      watch:[
        {t:'The job to be done', d:'The AS5116 delivers <b>differential analog</b> SIN/COS (SINP/SINN, COSP/COSN) after on-die <b>DMOD</b> demodulation — the analog world’s best answer to 1/f noise and offset without digital protocol overhead.'},
        {t:'Inside the drive chain', d:'<b>rotor magnet → AS5116 → (MCU ADC via differential driver) → FOC → gate driver</b>. Differential signalling lets the sense lines travel cm-long traces in a noisy inverter bay; the MCU still sees clean quadrature after its own PGA/ADC.'},
        {t:'Latency = angle error', d:'TD is programmable: 12 / 16 / 20 µs. Smaller TD = wider bandwidth & faster response; larger TD = lower noise. At 10 000 rpm, TD = 16 µs costs ≈ <b>0.017° electrical-equivalent phase</b> — comfortable for most EV-class traction motors.'},
        {t:'Built for ±30 000 rpm', d:'V<sub>MAX</sub> = <b>±30 000 rpm</b> — the highest mechanical rating of the three devices. Combined with 10–100 mT peak Bz target and gain codes from 8 to 60 mV/mT, it survives weak-field high-speed operation.'},
        {t:'What to look at next', d:'Section 05 (plates + DMOD), Section 06 outputs (differential drive), Section 09 ECC/UART, Section 11 OTP burn. Its diagnostics live on pin 6 (DIAG/UART) — Section 10.'},
      ],
      play:function(container, data){ container.appendChild(window.ENC_UI.h(`<div class="card"><h3>Use the HAL tab sandbox <span class="tag">shared math</span></h3><p style="color:var(--muted);font-size:13px">The latency bar chart under the <b>HAL 302x</b> tab compares all three devices — AS5116 at TD = 16 µs included. Use it, then argue about TD in Section 07.</p></div>`)); }
    },
    compare:{
      watch:[
        {t:'One question, three answers', d:'Same physics — diametrically magnetized rotor + Hall plates — three different deliverables: <b>HAL 302x</b> = dumb-but-fast ratiometric analog · <b>AS5147</b> = angle as a digital register · <b>AS5116</b> = clean differential analog with on-die DMOD and service UART.'},
        {t:'Speed headroom', d:'HAL 302x: 60 000 rpm (bw-limited) · AS5116: ±30 000 rpm · AS5147: DAE-limited, specified at 14 500 rpm (0.18°). High-rpm traction motors gravitate to HAL/AS5116; servo + position loops gravitate to AS5147.'},
        {t:'Cost & BOM', d:'Analog outputs avoid MCU pins but need ADC channels and ratiometric routing; the AS5147 spends a few extra MCU pins instead (SPI) but deletes the analog chain entirely. AS5116 needs a differential ADC path — the priciest sensing front end of the three, justified by signal integrity.'},
        {t:'Safety & diagnostics', d:'HAL 302x: FuSa diagnostics + error bands (motor-commutation ASIL). AS5116: ECC + guard-band burn check (transmission/speed). AS5147: SPI parity + DIAG flags. None is “safety-rated” by itself — <b>system</b> ASIL comes from architecture, not the sensor.'},
      ],
      play:function(container, data){ window.ENC_UI.comparePane(container, ['Identity & class','Magnetic input','Accuracy & dynamics']); }
    },
  }
});
