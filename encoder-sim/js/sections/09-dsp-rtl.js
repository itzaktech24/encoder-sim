/* Section 09 — DSP internals, RTL view & latency budgeting */
window.ENC_SECTIONS = window.ENC_SECTIONS || [];

const CORDIC_CODE = `// Illustrative teaching model — vectoring CORDIC (not vendor RTL)
// Computes angle = atan2(By, Bx) using only shifts and adds.
module cordic_vec #(parameter W = 18) (
  input  wire               clk,
  input  wire               start,
  input  wire signed [W-1:0] x_in,   // Bx
  input  wire signed [W-1:0] y_in,   // By
  output reg  signed [W-1:0] ang,    // angle code (binary)
  output reg                done
);
  reg signed [W-1:0] x, y, z;
  reg [4:0] i;                        // 16 iterations
  localparam K = 40'h0000_9A82;       // approx (1/K) gain, Q1.39

  localparam signed [W-1:0] ATAN [0:15] = '{
    18'sd103782, 18'sd61178, 18'sd32536, 18'sd16678,
    18'sd8388, 18'sd4201, 18'sd2102, 18'sd1051,
    18'sd525, 18'sd263, 18'sd131, 18'sd66,
    18'sd33, 18'sd16, 18'sd8, 18'sd4 };

  always @(posedge clk) begin
    if (start) begin
      x <= x_in * K[W-1:0];           // K pre-compensated
      y <= y_in * K[W-1:0];
      z <= 0; i <= 0; done <= 1'b0;
    end else if (i < 16) begin
      if (y[W-1]) begin               // y < 0 -> rotate CCW
        x <= x + (y >>> i); y <= y - (x >>> i); z <= z - ATAN[i];
      end else begin                  // y >= 0 -> rotate CW
        x <= x - (y >>> i); y <= y + (x >>> i); z <= z + ATAN[i];
      end
      i <= i + 1'b1;
      if (i == 15) done <= 1'b1;
    end
    ang <= z;
  end
endmodule`;

window.ENC_SECTIONS.push({
  id:'dsp', num:'09',
  title:'DSP Internals, RTL & Latency Budget',
  sub:'How Bx/By become a trusted angle — CORDIC iterations, DAEC, parity — seen from register-transfer level. Step the pipeline; read the teaching RTL.',
  refs:['HAL302x User Manual (MMIC302x)','DS000307 §“Dynamic Angle Error”','DS000686 §“DMOD”'],
  tabs:{
    hal:{
      watch:[
        {t:'No DSP — deliberately', d:'The HAL 302x computes nothing digitally on the signal path: plates → chopper FE → coordinate matrix → analog crossbar → filters → drivers. Accuracy = analog discipline (layout, trims, benchmark). Latency = the bw_filt RC delay — nothing else.'},
        {t:'Signal path figure', d:'Fig. 3–3 of the datasheet isolates the two channels: <b>SIN+ / SIN−</b> and <b>COS+ / COS−</b> rails, each with offset/gain/phase/0-angle trim and matched filters. Match between chains is the whole game — the parts are laser-trimmed, you adjust with calibration.'},
        {t:'Why analog wins for jitter', d:'Jitter spec <b>2 ns RMS</b>. Any clock-domain crossing, ADC aperture or SPI frame adds orders of magnitude more. For PWM-inverter torque ripple at 20 kHz, the analog chain is effectively noiseless.'},
        {t:'Calibration math', d:'0-angle (φ₀), gain (g), phase (θ), offset (Vos) are applied as: V<sub>out,new</sub> = ((V<sub>in</sub> − V<sub>os</sub>) × g) rotated by θ, referenced to φ₀. Stored in EEPROM; FINE_GAIN_CUST scales g by 1.25–1.5 remaining range.'},
      ],
      play:function(container, data){
        const fig = window.ENC_UI.h(`<div class="card"><h3>Fig. 3–3 — signal path per channel <span class="tag">datasheet</span></h3>
          <div class="fig-frame"><img src="${data.figures.signalPath}" alt="HAL 302x signal path with offset, gain, phase, 0-angle trims and filters for SIN and COS channels" loading="lazy"></div>
          <p class="fig-caption">Fig. 3–3 — Signal path of HAL 302x (DSH000237_002EN): per-channel Offset → Gain → Phase → 0-Angle → Filter.</p></div>`);
        const tabs = window.ENC_UI.h(`<div class="card" style="margin-top:14px"><h3>Latency budget</h3></div>`);
        tabs.appendChild(window.ENC_UI.specTable([
          ['Analog chain delay (bw_filt=10, typ)', '10.16', 'µs'],
          ['Jitter (RMS)', '2', 'ns'],
          ['Digital contribution', '0', 'n/a'],
          ['Total angle noise @ 5 kHz loop BW', 'function of bw_filt', 'see §07'],
        ], 'HAL302x end-to-end latency'));
        container.appendChild(fig); container.appendChild(tabs);
      }
    },
    as5147:{
      watch:[
        {t:'The pipeline, end to end', d:'<b>A/D → ATAN(CORDIC, 16 iter) → INTERPOLATOR → DAEC → ANGLECOM latch → SPI/ABI/UVW/PWM</b>. t_delay 90–110 µs dominated by CORDIC + filters; DAEC hides it for moving rotors.'},
        {t:'CORDIC convergence', d:'Each iteration rotates by atan(2^-i) — 16 iterations → ~0.006° angular resolution, finer than the 14-bit LSB (0.022°). Shift-add only ⇒ constant timing, trivial to verify in silicon, radiation-hard by construction.'},
        {t:'Interpolator & noise', d:'The interpolator reconstructs sub-division steps between CORDIC results; without it, ABI edges would dither at low speed. NOISESET picks the noise/3.3 V-range class. DAECDIS exists for static accuracy characterization.'},
        {t:'Parity closes the loop', d:'Every SPI read returns lower-15-bit + even PARC. PARD lets you read the parity back; PARERR flags violations. Parity is the only integrity check on the serial link — your driver must enforce it (Section 08 builder).'},
      ],
      play:function(container, data){
        const card = window.ENC_UI.h(`<div class="card"><h3>ANGLECOM pipeline stepper <span class="tag">canvas sim</span></h3></div>`);
        window.ENC_SIMS.rtlStepper(card, {});
        container.appendChild(card);
        const mathCard = window.ENC_UI.h(`<div class="card" style="margin-top:14px"><h3>What atan2 actually gets <span class="tag">vector-math.svg</span>
          <div class="fig-frame" style="background:#05070B;margin-top:10px"><img src="svg/vector-math.svg" alt="Bx and By vector decomposition; theta = atan2(By, Bx)" loading="lazy" style="background:#05070B"></div>
          <p class="fig-caption">θ = atan2(By, Bx) — the single primitive both the CORDIC and your MCU software evaluate</p></div>`);
        container.appendChild(mathCard);
        const codeCard = window.ENC_UI.h(`<div class="card" style="margin-top:14px"><h3>Vectoring CORDIC — teaching model RTL <span class="tag">verilog</span></h3></div>`);
        codeCard.appendChild(window.ENC_UI.codeViewer(CORDIC_CODE, 'verilog'));
        container.appendChild(codeCard);
      }
    },
    as5116:{
      watch:[
        {t:'Frequency-domain DSP', d:'The AS5116’s “DSP” is <b>chopping + synchronous DMOD</b>: the Hall bias is alternated at the carrier; the DMOD only passes signal correlated with the chop sign. 1/f noise (below ~1 kHz) never reaches the PGA. This is DSP executed in the analog domain.'},
        {t:'Why not CORDIC?', d:'Angle math needs a time reference. AS5116 ships raw SIN/COS amplitude — no sampling clock, no latency chain, no DAE term. Your MCU computes atan2 (or a LUT) with its own deterministic schedule: the latency is <u>your</u> ADC + DMA + ISR, fully visible.'},
        {t:'OTP trims are the calibration', d:'GAIN_CODE (PGA), TD (DMOD delay), VCM1/VCM2 (common-mode), ECC (Hamming over all trim bits). Burn once via UART/P2RAM — after that the chain is fixed metal. There is no field recalibration path: get it right at EOL.'},
        {t:'DIAG &amp; error flow', d:'POR → DMOD runs → ECC verifies OTP at startup → SIN/COS valid (T_POWER_ON ≈ 10 ms). Any failure → pin 6 asserts DIAG; MCU reads ECC_STATUS/UART_ERROR over pin 6 to classify. Section 10 walks the flow.'},
      ],
      play:function(container, data){
        const card = window.ENC_UI.h(`<div class="card"><h3>Latency &amp; determinism ledger <span class="tag">AS5116</span></h3></div>`);
        card.appendChild(window.ENC_UI.specTable([
          ['TD (programmable)', '12 / 16 / 20', 'µs'],
          ['On-die latency contribution', '≈ TD + DMOD settling', 'µs'],
          ['MCU-added latency (ADC 2 Msps + ISR)', '5–20', 'µs typical'],
          ['Jitter', 'not clocked — analog', 'n/a'],
          ['t_power-on to valid outputs', '10', 'ms'],
          ['Compensation required', 'none', 'analog path'],
        ], 'AS5116 end-to-end latency'));
        container.appendChild(card);
      }
    },
    compare:{
      watch:[
        {t:'Latency is a system number', d:'HAL: 10 µs class analog + 0 digital · AS5147: 100 µs raw / 1.5–1.9 µs compensated · AS5116: 12–20 µs + MCU software. Compare <u>total loop</u>, not datasheet lines: ADC, DMA, ISR jitter and filter orders belong in the same spreadsheet.'},
        {t:'Verification angle', d:'HAL/AS5116: verify analog chain by sine-fit error over angle (Lissajous). AS5147: verify digital path by register readback + parity + DAE at speed. Different DV plans entirely — budget accordingly.'},
      ],
      play:function(container, data){ window.ENC_UI.comparePane(container, ['Accuracy & dynamics']); }
    },
  }
});
