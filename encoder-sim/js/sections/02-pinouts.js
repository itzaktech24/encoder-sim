/* Section 02 — Packages & pinouts */
window.ENC_SECTIONS = window.ENC_SECTIONS || [];
window.ENC_SECTIONS.push({
  id:'pinouts', num:'02',
  title:'Packages & Interactive Pinouts',
  sub:'SOIC-8 (HAL 302x · AS5116) vs TSSOP-14 (AS5147). Click any pin — function, direction, electrical notes. Real package drawings from the datasheets below.',
  refs:['DSH000237 §5.8/6.4','DS000307 §8/“Package Outline”','DS000686 §3.2/§“Package”'],
  tabs:{
    hal:{
      watch:[
        {t:'8 pins, 4 signals', d:'HAL 302x is an <b>SOIC-8</b> with only four real outputs: <b>OUT1=+SIN, OUT2=−SIN, OUT3=+COS, OUT4=−COS</b>. Pin 4 (OUT3) doubles as the <b>programming pin</b> — the only digital access the device has.'},
        {t:'The pins you must not forget', d:'Pins 2, 5, 6 <b>must connect to GND</b>. Pins 5/6 (NC) are bonded internally; floating them violates the datasheet and can drift the frontend. Pin 1 is VSUP — ratiometric reference for everything.'},
        {t:'Differential pairs done right', d:'Route (OUT1, OUT2) as a <b>twisted/coupled pair</b> and (OUT3, OUT4) likewise; keep them short and away from phase legs. The receiver-side CM rejection is only as good as the routing symmetry.'},
        {t:'Programming through OUT3', d:'All configuration happens by <b>modulating OUT3</b> with an overcurrent pattern (2048/1536/1024/512 µs). Plan a programming header (or test points) on OUT3 + VSUP + GND from day one.'},
      ],
      play:function(container, data){
        container.appendChild(window.ENC_UI.pinout(data, 'soic8'));
        const card = window.ENC_UI.h(`<div class="card" style="margin-top:14px"><h3>SOIC-8 pad recommendation <span class="tag">Fig. 6–3 · datasheet</span></h3>
          <div class="fig-frame"><img src="assets/images/packages/soic8.png" alt="Recommended SOIC-8 solder pad layout, 2.200 × 0.600 mm pads, 5.200 mm span, 1.270 mm pitch" loading="lazy"></div>
          <p class="fig-caption">Fig. 6–3 — Pad size recommendation for SOIC8 package (DSH000237_002EN). Pads 2.200×0.600 mm, row span 5.200 mm, pitch 1.270 mm.</p></div>`);
        container.appendChild(card);
      }
    },
    as5147:{
      watch:[
        {t:'14 pins of mixed signal', d:'TSSOP-14: <b>SPI</b> (CSn/CLK/MISO/MOSI), <b>outputs</b> (A/B, U/V/W), <b>PWM</b> (pins 10 & 14 muxed), supplies (VDD, VDD3V3) and GND. Pin 5 (TEST) <b>must be GND</b> in normal operation.'},
        {t:'VDD3V3 decoupling is mandatory', d:'Pin 12 is the <b>internal 3.3 V rail output</b> in 5 V mode — decouple with <b>1 µF</b> to GND, close to the pin. In 3.3 V mode it becomes the supply input. Follow the datasheet application circuit exactly.'},
        {t:'Two PWM-capable pins', d:'Pins 10 (W/PWM) and 14 (I/PWM) are function-muxed. Select in SETTINGS2 whether you get UVW-commutation or PWM on each. PWM frame = <b>4119 clock periods</b>, duty ∝ angle.'},
        {t:'Daisy-chains & addressing', d:'MISO is tri-statable for daisy-chaining multiple AS5147s; there is no address pin — CSn is the frame select. Keep SPI traces short, solid ground return, mode 1, ≤ 10 MHz.'},
      ],
      play:function(container, data){
        container.appendChild(window.ENC_UI.pinout(data, 'tssop14'));
        const card = window.ENC_UI.h(`<div class="card" style="margin-top:14px"><h3>TSSOP-14 pin assignment <span class="tag">Figure 3 · datasheet</span></h3>
          <div class="fig-frame"><img src="assets/images/datasheet-figs/as5147-pinout.png" alt="AS5147 TSSOP-14 pin assignment drawing" loading="lazy"></div>
          <div class="fig-caption">Figure 3 — TSSOP-14 Pin Assignment (DS000307 v2-00). Pin 1 marker top-left; U/V/W(+PWM) right side.</div></div>`);
        container.appendChild(card);
      }
    },
    as5116:{
      watch:[
        {t:'8 pins, differential by design', d:'AS5116 is SOIC-8 like the HAL 302x but every output is <b>differential</b>: SINP/SINN + COSP/COSN, plus <b>CM_SIN/CM_COS</b> common-mode senses. Only pin 6 is digital — <b>UART/DIAG</b>.'},
        {t:'VDD3 is an output', d:'Pin 5 (VDD3) is the internal 3.3 V rail — decouple per datasheet, do <b>not</b> load it. VDD5 abs-max is 7 V; IDD ≤ 17 mA — biggest supply consumer of the three.'},
        {t:'Common-mode taps', d:'CM_SIN/CM_COS let the ADC reference its sampling exactly at the output common mode (defaults VCM1 = 1.375 V, VCM2 = 2.125 V), killing differential-to-single-ended conversion error.'},
        {t:'Routing rules', d:'Length-match SINP/SINN and COSP/COSN; terminate with CLOAD ≤ 10 nF (datasheet drive spec); keep IOUT ≤ ±1 mA per driver. Route the UART/DIAG line away from the analog pairs.'},
      ],
      play:function(container, data){
        container.appendChild(window.ENC_UI.pinout(data, 'soic8'));
        const card = window.ENC_UI.h(`<div class="card" style="margin-top:14px"><h3>Package & pin diagram <span class="tag">Figure 3 · datasheet</span></h3>
          <div class="fig-frame"><img src="assets/images/datasheet-figs/as5116-pinout.png" alt="AS5116 pin diagram in SOIC8 package" loading="lazy"></div>
          <div class="fig-caption">Figure 3 — Pin Diagram of AS5116 in SOIC8 package (DS000686 v2-00).</div></div>`);
        container.appendChild(card);
      }
    },
    compare:{
      watch:[
        {t:'Pin count is a system cost', d:'8 pins (HAL 302x, AS5116) vs 14 (AS5147). The extra 6 pins buy you SPI + ABI/UVW/PWM: fewer external components, more firmware. Analog outputs need ADC channels but zero protocol.'},
        {t:'Common footprint trap', d:'HAL 302x and AS5116 are <b>both SOIC-8 but NOT pin-compatible</b>: HAL pin 4 = OUT3/+COS (analog) vs AS5116 pin 4 = VDD5 (power!). Never drop-in swap them; always re-check the pin table.'},
        {t:'Programming access', d:'HAL: OUT3 overcurrent (test points suffice). AS5147: SPI bus (direct). AS5116: UART/DIAG pin 6 (3-wire service) — plan a 6-pin service header: VDD, GND, UART, SINP/SINN sense, VDD3 monitor.'},
      ],
      play:function(container, data){
        window.ENC_UI.matrix(container, [
          {name:'Package & pins', rows:[
            {param:'Package', hal:'SOIC-8', as5147:'TSSOP-14', as5116:'SOIC-8', diff:true},
            {param:'Output pins', hal:'4 analog (OUT1–4)', as5147:'6 digital (A,B,U,V,W,I/PWM)', as5116:'4 analog diff + 2 CM + 1 UART', diff:true},
            {param:'Power pins', hal:'VSUP, GND (+2 NC→GND)', as5147:'VDD, VDD3V3, GND', as5116:'VDD5, VDD3, VSS', diff:true},
            {param:'Debug/service entry', hal:'OUT3 overcurrent pattern', as5147:'SPI (CSn/CLK/MISO/MOSI)', as5116:'UART/DIAG (pin 6)', diff:true},
            {param:'Pin-compatible drop-in?', hal:'No — analog COS/SIN ordering', as5147:'No — unique digital map', as5116:'No — pin 4 is VDD5', diff:true},
          ]}
        ], {compact:true, filterable:false});
      }
    },
  }
});
