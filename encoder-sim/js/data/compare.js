/* Master comparison matrix — all cells verified against the three datasheets.
   diff = true when the row is a genuine differentiator (used by "highlight differences"). */
window.ENC_DATA = window.ENC_DATA || {};
window.ENC_DATA.COMPARE = {
  groups:[
    {name:'Identity & class', rows:[
      {param:'Manufacturer', hal:'TDK-Micronas', as5147:'ams', as5116:'ams', diff:true},
      {param:'Sensor type', hal:'2D Hall array, analog SIN/COS', as5147:'2D Hall array + CORDIC, digital', as5116:'2D Hall array + DMOD, analog differential', diff:true},
      {param:'Output principle', hal:'Ratiometric analog (VSUP-referenced)', as5147:'Digital ANGLE/ANGLECOM + ABI/UVW/PWM + SPI', as5116:'Differential analog (current-driver SIN±/COS±)', diff:true},
      {param:'Package', hal:'SOIC8', as5147:'TSSOP-14', as5116:'SOIC8', diff:true},
      {param:'Datasheet / doc no.', hal:'DSH000237_002EN (Jul 2025)', as5147:'DS000307 v2-00', as5116:'DS000686 v2-00', diff:true},
    ]},
    {name:'Supply & thermal', rows:[
      {param:'Supply voltage', unit:'V', hal:'3.0 / 5.0 / 5.5', as5147:'VDD 4.5/5.0/5.5 · VDD3V3 3.0–3.6', as5116:'VDD5 4.5/5.0/5.5 (VDD3 internal)', diff:true},
      {param:'Quiescent current', unit:'mA', hal:'10.5 typ/12 max (3020) · 13/15 (3021)', as5147:'IDD ≤ 15', as5116:'IDD ≤ 17', diff:true},
      {param:'Abs-max supply', unit:'V', hal:'TJ −40…+190 (op. TA −40…+150)', as5147:'VDD −0.3…7.0 · VDD3V3 −0.3…5.0', as5116:'VDD5 −0.3…7.0 · VREG ≤ 5.0', diff:true},
      {param:'Power dissipation (abs-max)', unit:'mW', hal:'typ self-heat 53 mW (3020) / 65 mW (3021) @5 V — no Ptot abs-max line', as5147:'Pt = 150 mW', as5116:'— (see thermal design)', diff:true},
      {param:'Operating temp', unit:'°C', hal:'−40…+150', as5147:'−40…+150 (5 V) · −40…+125 (3.3 V)', as5116:'−40…+150 (TJ ≤ 165)', diff:true},
      {param:'Storage temp', unit:'°C', hal:'—', as5147:'−55…+150', as5116:'−55…+150', diff:true},
      {param:'OTP programming temp', unit:'°C', hal:'0…55 (NPRG=100)', as5147:'5…45 (TaProg)', as5116:'0…45 (TA_PROG)', diff:true},
      {param:'ESD (HBM)', hal:'±4 kV (AEC-Q100-002)', as5147:'±2 kV (AEC-Q100-002)', as5116:'AEC-Q100-002 class (see datasheet)', diff:true},
      {param:'ISO 10605 gun', hal:'±8 kV (with PCB protection)', as5147:'—', as5116:'—', diff:true},
      {param:'EMC — ISO 11452-8', hal:'characterized', as5147:'not claimed', as5116:'characterized', diff:true},
    ]},
    {name:'Magnetic input', rows:[
      {param:'Full-scale field', unit:'mT', hal:'±250…±5 (mag_range, 5-bit)', as5147:'35–70 (optimal Bz, R = 1.1 mm)', as5116:'10–100 (peak Bz target)', diff:true},
      {param:'Hall geometry', hal:'3 plates @120° (3020) / 6 @60° (3021)', as5147:'4 plates @90°', as5116:'4 plates @90° + DMOD', diff:true},
      {param:'Plate circle radius', unit:'mm', hal:'Ø1.9 mm', as5147:'R = 1.1 mm', as5116:'R = 1.1 mm', diff:true},
      {param:'Max rotation speed', unit:'rpm', hal:'60000 (bandwidth-limited)', as5147:'no single line; DAEmax spec @14500', as5116:'±30000', diff:true},
      {param:'Stray-field robustness', hal:'ΔEθ ≤ 0.10° (3020) / ≤ 0.06° (3021)', as5147:'DAE-based; 0.016° rms (DAECDIS)', as5116:'DMOD rejection; no single figure', diff:true},
    ]},
    {name:'Accuracy & dynamics', rows:[
      {param:'Sensitivity', hal:'31.5 / 33 / 36 %VSUP per mag_range; e.g. 0.022 V/mT @5 V, 75 mT', as5147:'14-bit ANGLE (0x3FFE); ABI 2048/1024 steps', as5116:'M = 8–60 mV/mT (Gain_Code 0–24)', diff:true},
      {param:'Bandwidth / delay', hal:'bw_filt: 70.5 / 32.1 / 16.1 / 4.6 kHz', as5147:'n/a digital; latency 90–110 µs (DAEC → 1.5–1.9 µs eff.)', as5116:'TD = 12 / 16 / 20 µs', diff:true},
      {param:'tDelay (typ @500 Hz)', unit:'µs', hal:'4.59 (max-bw) → 40.4 (low-bw, min/typ/max 37.55/40.40/42.69)', as5147:'90–110', as5116:'12 / 16 / 20', diff:true},
      {param:'Jitter (typ)', unit:'ns', hal:'2 (max, RMS)', as5147:'— (deterministic CORDIC)', as5116:'—', diff:true},
      {param:'Noise RMS', unit:'°', hal:'bw_filt-dependent (see Table 5-3)', as5147:'0.068° (NOISESET=0) · 0.082° (NOISESET=1)', as5116:'analog — set by TD & GAIN_CODE', diff:true},
      {param:'Dynamic angle error', hal:'tDelay-limited (see above)', as5147:'DAEmax 0.18° @14500 rpm · DAEacc 0.175° @25 krad/s² · DAE1700 = 0.02°', as5116:'TD-limited (static offset only)', diff:true},
      {param:'Gain tolerance', unit:'%', hal:'36 % max over range; FINE_GAIN_CUST 1.25–1.5 trim', as5147:'n/a (digital, AGC-normalized)', as5116:'GV ±16 %', diff:true},
    ]},
    {name:'Outputs & interfaces', rows:[
      {param:'Primary outputs', hal:'OUT1–4: +SIN, −SIN, +COS, −COS (OUT3 = prog pin)', as5147:'A/B(I), U/V/W, PWM — muxed', as5116:'SINP/SINN, COSP/COSN, CM_SIN/CM_COS', diff:true},
      {param:'Digital interface', hal:'none (programming via OUT3 modulation)', as5147:'SPI ≤10 MHz, mode 1, 8/16-bit + even parity (PARC/PARD/PARERR)', as5116:'UART 1.1–70 kbit/s, sync 0x55, parity', diff:true},
      {param:'ABI resolution', unit:'steps', hal:'n/a', as5147:'2048 / 1024 (11/10 bit, ABIRES)', as5116:'n/a', diff:true},
      {param:'UVW pole pairs', hal:'n/a', as5147:'1–7 programmable', as5116:'n/a', diff:true},
      {param:'PWM output', hal:'n/a', as5147:'duty ∝ angle; frame = 4119 clk periods', as5116:'n/a', diff:true},
      {param:'Common-mode / reference', hal:'ratiometric to VSUP (10–90 %)', as5147:'push-pull digital', as5116:'VCM1 1.375 V · VCM2 2.125 V (defaults)', diff:true},
    ]},
    {name:'Diagnostics & safety', rows:[
      {param:'Safe-state outputs', hal:'error bands 90/96/50/10/4 %VSUP · high-Z (en_outx=0)', as5147:'ABI=111 · UVW=000 · PWM low 13–16 of first 16 (≈0.3 %) or all 4096 low', as5116:'DIAG via pin 6 + UART_ERROR (SYNC/PARITY/FRAME)', diff:true},
      {param:'ECC on non-volatile memory', hal:'EEPROM + FuSa Diagnostic core', as5147:'OTP ECC (parity on SPI frames)', as5116:'Hamming SEC (reg 0x1B): 0=OK · 1=single-bit corr. · 2=double-bit → major error', diff:true},
      {param:'Self test', hal:'flux-less self-test (64/32 µs steps, 16× high-Z/angle/error-band)', as5147:'AMC/AGC flags, DAECDIS check', as5116:'DMOD + ECC + P2RAM GLOAD guard-band check', diff:true},
      {param:'Under/overvoltage detection', hal:'yes (with hysteresis, xVDD_SUVI_BAND / xVDD_SOVI_BAND)', as5147:'yes (VDD monitoring)', as5116:'POR (pin-level)', diff:true},
      {param:'Functional-safety fit', hal:'FuSa Diagnostic core, error bands — motor-commutation ASIL designs', as5147:'built-in angle error diagnostics; motor commutation focus', as5116:'transmission/speed designs; ECC + guard-band', diff:true},
    ]},
    {name:'Programming & trim', rows:[
      {param:'Memory type', hal:'EEPROM (≥100 cycles)', as5147:'OTP (one-time)', as5116:'OTP (one-time)', diff:true},
      {param:'Programming method', hal:'OUT3 overcurrent pattern (2048/1536/1024/512 µs; simple 2048/2048)', as5147:'SPI + PROG register (PROGVERIFY/PROGOTP/OTPREF/OTPBURN) · VDD_Burn 3.3–3.5 V', as5116:'UART or P2RAM_CONTROL (0x03): state / load-latch-fuse / GLOAD / burn', diff:true},
      {param:'Programming cycles', unit:'cycles', hal:'NPRG = 100', as5147:'1 (OTP)', as5116:'1 (OTP)', diff:true},
      {param:'Fine gain trim', hal:'FINE_GAIN_CUST 1.25–1.5 ×', as5147:'via OTP sensitivity trim', as5116:'GAIN_CODE 0–24 (8–60 mV/mT)', diff:true},
      {param:'Bandwidth trim', hal:'bw_filt (00/01/10/11)', as5147:'NOISESET (SETTINGS2 0x0019)', as5116:'TD (12/16/20 µs)', diff:true},
    ]},
    {name:'Key registers / frames', rows:[
      {param:'Angle readout', hal:'analog — sample OUT1/OUT2/OUT3/OUT4', as5147:'ANGLE 0x3FFE · ANGLECOM 0x3FFF (use COM for control)', as5116:'analog — sample SIN±/COS±', diff:true},
      {param:'Diagnostics readout', hal:'error band level on OUTx', as5147:'DIAAGC 0x3FFC · MAG 0x3FFD', as5116:'ECC_STATUS · UART_ERROR 0x01', diff:true},
      {param:'Configuration', hal:'CONFIG / OUT_DRV_CONFIG / mag_range / en_outx', as5147:'SETTINGS2 0x0019', as5116:'GAIN_CODE · TD · P2RAM_CONTROL 0x03', diff:true},
      {param:'Frame / protocol', hal:'— (analog)', as5147:'16-bit SPI + even parity (lower 15 bits)', as5116:'UART 8N1 + sync byte 0x55', diff:true},
    ]},
  ]
};
