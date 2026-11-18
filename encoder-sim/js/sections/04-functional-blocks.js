/* Section 04 — Functional block diagrams (real datasheet figures + SVG hotspot overlays) */
window.ENC_SECTIONS = window.ENC_SECTIONS || [];
window.ENC_SECTIONS.push({
  id:'blocks', num:'04',
  title:'Functional Block Diagrams',
  sub:'The signal path from Hall plate to pin — annotated on the actual datasheet figures. Click the numbered markers; each explains the block as drawn by the manufacturer.',
  refs:['Fig. 3–2 · DSH000237','Figure 2 · DS000307','Figure 2 · DS000686'],
  tabs:{
    hal:{
      watch:[
        {t:'One glance, whole chain', d:'HAL 302x: <b>Hall plates → coordinate transformation → crossbar → conditioning (offset/gain/phase/0-angle) → filter → analog drivers</b>. Everything else — bandgap, regulators, clock, FuSa, EEPROM — serves those two analog rails (SIN, COS).'},
        {t:'Why a crossbar?', d:'Stray-field robustness starts here. The <b>coordinate-transformation matrix + programmable crossbar</b> re-picks how plate signals combine; residual stray flux that couples into all plates coherently cancels in the differential domain. This is the circuit behind the 0.06°/0.1° ΔEθ specs.'},
        {t:'Signal conditioning is calibration', d:'Four trims stored in EEPROM: <b>Offset · Gain · Phase · 0-Angle</b> (+ FINE_GAIN_CUST 1.25–1.5). They are applied <u>before</u> the output filter — i.e., before noise & delay accumulate. This is why the analog chain can be ratiometric yet accurate.'},
        {t:'Flux-less self test', d:'An internal oscillator block injects a known current pattern into the plate frontend (64/32 µs steps). The analog chain responds as if a magnet moved through defined angles — verified without any magnetic field: the essence of “flux-less”.'},
      ],
      play:function(container, data){
        container.appendChild(window.ENC_UI.hotspotStage(data.figures.block, data.hotspots, 'Fig. 3–2 — HAL 3021 block diagram (DSH000237_002EN)', 'HAL 3021 block diagram with Hall plates, coordinate transformation, crossbar, calibration, filter and analog output stages'));
      }
    },
    as5147:{
      watch:[
        {t:'One glance, whole chain', d:'AS5147: <b>Hall cross → analog frontend → A/D → ATAN(CORDIC) → INTERPOLATOR → Dynamic Angle Error Compensation → (ANGLE/ANGLECOM)</b>, plus output drivers for ABI/UVW/PWM and an SPI slave with OTP + volatile memory.'},
        {t:'CORDIC in one paragraph', d:'CORDIC computes atan(By/Bx) using only <b>shifts and adds</b>: 16 iterations rotate a unit vector onto the x-axis; the accumulated angles form the result. No multiplier ⇒ small area, radiation-robust, deterministic latency. Resolution 14 bit.'},
        {t:'Why DAEC is the secret sauce', d:'Any real sensor lags. <b>Dynamic Angle Error Compensation</b> measures ω from the angle stream and adds ω·t<sub>delay</sub> ahead — cancelling the error at 14 500 rpm down to 0.18°, at only 1.5–1.9 µs effective added delay.'},
        {t:'AGC & Mag register', d:'The <b>AGC loop</b> normalizes front-end gain against the actual Bz. The <b>MAG</b> register (0x3FFD) reports field strength — read it during assembly to validate magnet distance and flag magnet-loss, the #1 field failure mode.'},
      ],
      play:function(container, data){
        container.appendChild(window.ENC_UI.hotspotStage(data.figures.block, data.hotspots, 'Figure 2 — AS5147 Block Diagram (DS000307 v2-00)', 'AS5147 block diagram: hall sensors, analog frontend, ADC, CORDIC, interpolator, DAEC, ABI, UVW, PWM and SPI'));
      }
    },
    as5116:{
      watch:[
        {t:'One glance, whole chain', d:'AS5116: <b>Hall cross → Hall FE → DMOD → PGA → DRV</b> — twice, one for SIN, one for COS — fed by LDO, biasing, and a small <b>digital part</b>: timing generator, oscillator, POR and ECC-protected OTP.'},
        {t:'DMOD — demodulator', d:'The plates are chopped, and the returning signal is <b>synchronously demodulated</b> (DMOD). 1/f noise, thermoelectric offsets and chopping artifacts are rejected at the carrier; the result is DC-clean SIN/COS ready for the PGA.'},
        {t:'Why differential end to end', d:'From plate bridge to line driver everything is balanced differential. Common-mode interference (inverter dV/dt!) cancels at the far-end receiver. VCM1/VCM2 (1.375/2.125 V) pin the common mode so the ADC sees maximum swing.'},
        {t:'Digital part is minimal on purpose', d:'No angle math on-die: just timing, OTP (trims, ECC), POR (10 ms to valid) and the UART/DIAG service port. All accuracy comes from the analog chain — that is the entire design philosophy.'},
      ],
      play:function(container, data){
        container.appendChild(window.ENC_UI.hotspotStage(data.figures.block, data.hotspots, 'Figure 2 — Functional Blocks of AS5116 (DS000686 v2-00)', 'AS5116 functional blocks: LDO, hall biasing, hall sensor array, hall FE, DMOD, PGA, DRV for SIN and COS chains, OTP digital part'));
      }
    },
    compare:{
      watch:[
        {t:'Same molecules, different organs', d:'All three share: <b>plates → FE → conditioning → output driver</b>. Differentiators: HAL = crossbar + EEPROM analog trims; AS5147 = CORDIC + DAEC digital core; AS5116 = DMOD analog core with tiny OTP digital part.'},
        {t:'Where accuracy lives', d:'HAL: EEPROM calibration + crossbar (analog domain) · AS5147: 14-bit CORDIC + interpolation + DAEC (digital domain) · AS5116: chopping + DMOD (frequency domain). Three philosophies, three failure signatures.'},
        {t:'Failure signature cheat-sheet', d:'HAL → gain/offset drift with temperature (watch EEPROM trims) · AS5147 → torn/stale reads or parity errors (watch SPI + DIAAGC) · AS5116 → common-mode shift or GAIN_CODE misburn (watch VCM and ECC_STATUS).'},
      ],
      play:function(container, data){
        const grid = window.ENC_UI.h(`<div class="panel-grid cols-3"></div>`);
        const chips = [
          ['HAL 302x', 'assets/images/blocks/hal302x-block.png', 'Analog chain + FuSa', '#FBBF24'],
          ['AS5147', 'assets/images/blocks/as5147-block.png', 'CORDIC + DAEC digital core', '#22D3EE'],
          ['AS5116', 'assets/images/blocks/as5116-block.png', 'DMOD analog core, diff outputs', '#34D399'],
        ];
        chips.forEach(([name, src, tag, color]) => {
          grid.appendChild(window.ENC_UI.h(`<div class="card" style="border-top:3px solid ${color}"><h3>${name}</h3>
            <div class="fig-frame"><img src="${src}" alt="${name} block diagram" loading="lazy"></div>
            <p style="color:var(--muted);font-size:12px;margin:8px 0 0">${tag}</p></div>`));
        });
        container.appendChild(grid);
      }
    },
  }
});
