/* Section 08 — Digital & programming interfaces */
window.ENC_SECTIONS = window.ENC_SECTIONS || [];

/* --- AS5147 SPI frame builder + waveform --- */
function spiFrameBuilder(container){
  const UI = window.ENC_UI;
  const regs = [
    ['DIAAGC', 0x3FFC, 'Diagnostics + AGC status'],
    ['MAG',    0x3FFD, 'Field strength (AGC feedback)'],
    ['ANGLE',  0x3FFE, 'Raw angle, 14-bit'],
    ['ANGLECOM', 0x3FFF, 'Compensated angle (use this)'],
    ['SETTINGS2', 0x0019, 'NOISESET / 3V150°C / DAECDIS …'],
  ];
  let bits = 0x3FFF << 1; // payload ANGLECOM, parity appended
  const card = UI.h(`<div class="card"><h3>SPI mode-1 frame builder — even parity on lower 15 bits <span class="tag">interactive</span></h3>
    <p style="color:var(--muted);font-size:12px;margin:2px 0 10px">Toggle bits (15 MSB → 0 LSB=PARC). Frame is legal iff the popcount of bits 15:1 is even and bit 0 completes it. Mode 1 · ≤ 10 MHz · CSn frames every transaction.</p></div>`);
  const bitRow = UI.h(`<div class="seg" style="gap:4px"></div>`);
  const buttons = [];
  for(let i = 15; i >= 0; i--){
    const b = UI.el('button', 'seg-btn', i === 0 ? 'P' : String(i));
    b.type = 'button';
    b.style.minWidth = '38px';
    b.title = i === 0 ? 'bit 0 = PARC (parity)' : 'bit ' + i;
    b.addEventListener('click', () => { bits ^= (1 << i); sync(); });
    bitRow.appendChild(b); buttons[i] = b;
  }
  const status = UI.h(`<div class="banner banner-info" style="margin-top:10px"></div>`);
  const readout = UI.h(`<div class="readout"></div>`);
  const canvas = document.createElement('canvas');
  canvas.width = 680; canvas.height = 150; canvas.className = 'sim-canvas';
  const regRow = UI.h(`<div class="seg" style="margin-top:10px;flex-wrap:wrap"></div>`);
  regs.forEach(([name, addr]) => {
    const b = UI.el('button', 'seg-btn', 'Load ' + name + ' (0x' + addr.toString(16).toUpperCase() + ')');
    b.type = 'button';
    b.addEventListener('click', () => { bits = (addr << 1) | parity15(addr); sync(); });
    regRow.appendChild(b);
  });
  const autoP = UI.el('button', 'btn btn-primary', 'Auto-set PARC');
  autoP.type = 'button';
  autoP.addEventListener('click', () => { bits = (bits & ~1) | parity15(bits >> 1); sync(); });

  function parity15(payload){ let p = 0; for(let i = 0; i < 15; i++) p ^= (payload >> i) & 1; return p; }
  function sync(){
    for(let i = 0; i <= 15; i++){
      buttons[i].classList.toggle('active', !!((bits >> i) & 1));
      buttons[i].textContent = (i === 0 ? 'P' : i) + '\n' + ((bits >> i) & 1);
      buttons[i].style.whiteSpace = 'pre'; buttons[i].style.lineHeight = '1.25'; buttons[i].style.textAlign = 'center';
    }
    const payload = bits >> 1, parc = bits & 1, computed = parity15(payload);
    const ok = computed === parc;
    status.className = 'banner ' + (ok ? 'banner-info' : 'banner-bad');
    status.innerHTML = ok
      ? '<b>Frame legal.</b> Even parity satisfied — receiver accepts; PARD = 0.'
      : '<b>PARITY ERROR.</b> Popcount(bits 15:1) is ' + ((popcnt(payload) & 1) ? 'odd' : 'even') + ' — PARC should be <b>' + computed + '</b>, you set <b>' + parc + '</b>. Receiver raises PARERR (0x0019 bit class).';
    readout.innerHTML = `<div class="readout-item"><div class="ro-label">Frame hex</div><div class="ro-value" style="font-size:16px">0x${(bits & 0xFFFF).toString(16).toUpperCase().padStart(4,'0')}</div></div>
      <div class="readout-item"><div class="ro-label">Payload (15b)</div><div class="ro-value" style="font-size:16px">0x${payload.toString(16).toUpperCase().padStart(4,'0')}</div></div>
      <div class="readout-item"><div class="ro-label">popcount(payload)</div><div class="ro-value">${popcnt(payload)}</div></div>
      <div class="readout-item"><div class="ro-label">Register match</div><div class="ro-value" style="font-size:12px">${(regs.find(r => r[1] === payload) || ['—'])[0]}</div></div>`;
    drawFrame();
  }
  function popcnt(v){ let c = 0; while(v){ c += v & 1; v >>= 1; } return c; }
  function drawFrame(){
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const lanes = [{n:'CSn', y:30}, {n:'CLK', y:70}, {n:'MOSI', y:110}];
    ctx.font = '11px ui-monospace,monospace';
    lanes.forEach(l => { ctx.fillStyle = '#8B97AB'; ctx.fillText(l.n, 6, l.y + 4); });
    const x0 = 44, x1 = W - 12, bitW = (x1 - x0) / 17;
    const hi = 18, lo = 12;
    const laneY = y => y;
    // CSn: high before frame, LOW for the whole 16-clock frame, high after
    ctx.strokeStyle = '#34D399'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(x0, laneY(30) - hi);
    ctx.lineTo(x0 + bitW * 0.25, laneY(30) - hi);
    ctx.lineTo(x0 + bitW * 0.25, laneY(30) + lo);
    ctx.lineTo(x1 - bitW * 0.25, laneY(30) + lo);
    ctx.lineTo(x1 - bitW * 0.25, laneY(30) - hi);
    ctx.lineTo(x1, laneY(30) - hi);
    ctx.stroke();
    // CLK: 16 mode-1 pulses
    ctx.strokeStyle = '#22D3EE';
    ctx.beginPath();
    let y = laneY(70) + lo; ctx.moveTo(x0, y);
    for(let i = 0; i < 16; i++){
      const bx = x0 + bitW + i * bitW;
      ctx.lineTo(bx, y); ctx.lineTo(bx, y - hi); ctx.lineTo(bx + bitW/2, y - hi); ctx.lineTo(bx + bitW/2, y); y = laneY(70) + lo;
    }
    ctx.lineTo(x1, y); ctx.stroke();
    // MOSI: data MSB first, changes on falling edge (CPHA=1)
    ctx.strokeStyle = '#FBBF24'; ctx.lineWidth = 2; ctx.beginPath();
    let prev = 0; ctx.moveTo(x0, laneY(110) + lo);
    for(let i = 0; i < 16; i++){
      const bit = (bits >> (15 - i)) & 1;
      const bx = x0 + bitW + i * bitW;
      const yy = bit ? laneY(110) - hi : laneY(110) + lo;
      if(bit !== prev){ ctx.lineTo(bx, prev ? laneY(110) - hi : laneY(110) + lo); ctx.lineTo(bx, yy); }
      ctx.lineTo(bx + bitW/2, yy);
      prev = bit;
    }
    ctx.lineTo(x1, prev ? laneY(110) - hi : laneY(110) + lo); ctx.stroke();
  }
  card.appendChild(bitRow); card.appendChild(regRow); card.appendChild(autoP);
  card.appendChild(readout); card.appendChild(status); card.appendChild(canvas);
  container.appendChild(card);
  sync();
}

/* --- HAL OUT3 programming pattern animation --- */
function progPatternSim(container){
  const UI = window.ENC_UI;
  const card = UI.h(`<div class="card"><h3>OUT3 programming pattern — 2048/1536/1024/512 µs <span class="tag">interactive</span></h3>
    <p style="color:var(--muted);font-size:12px;margin:2px 0 10px">The HAL 302x has no digital pins. Entry into programming / BiPhase mode = an overcurrent pattern on OUT3: 2048 µs LOW → 1536 µs HIGH → 1024 µs LOW → 512 µs HIGH (complex). Simple variant: 2048/2048. NPRG = 100 guaranteed cycles, 0 °C &lt; TA &lt; 55 °C.</p></div>`);
  const canvas = document.createElement('canvas');
  canvas.width = 680; canvas.height = 170; canvas.className = 'sim-canvas';
  const btn = UI.el('button', 'btn btn-primary', '▶ Fire overcurrent pattern');
  btn.type = 'button';
  const note = UI.h(`<div class="spec-note">After entry, bits are clocked in by further modulation of OUT3 (documented in the HAL/HAC 302x User Manual). Never run the pattern in application — it forces max output current.</div>`);
  const seg = UI.segButtons(['Complex (2048/1536/1024/512)', 'Simple (2048/2048)'], 0, () => draw(0));
  let raf = null;
  function draw(progress){
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const complex = !seg.querySelectorAll('.seg-btn')[1].classList.contains('active');
    const segs = complex ? [[2048,0],[1536,1],[1024,0],[512,1]] : [[2048,0],[2048,1]];
    const total = segs.reduce((a,s) => a + s[0], 0);
    const t = progress * total;
    ctx.fillStyle = '#8B97AB'; ctx.font = '10px ui-monospace,monospace';
    ctx.fillText('OUT3 voltage · total ' + total + ' µs · t = ' + t.toFixed(0) + ' µs', 10, 16);
    const x0 = 12, x1 = W - 12, yHi = 46, yLo = 128;
    ctx.strokeStyle = '#253041'; ctx.strokeRect(x0, 30, x1-x0, 110);
    let acc = 0;
    ctx.lineWidth = 2.4; ctx.strokeStyle = '#FBBF24'; ctx.shadowColor = '#FBBF24'; ctx.shadowBlur = 6;
    ctx.beginPath();
    for(const [dur, lvl] of segs){
      const sx = x0 + (acc/total) * (x1-x0);
      const ex = x0 + ((acc+dur)/total) * (x1-x0);
      const y = lvl ? yHi : yLo;
      if(acc === 0) ctx.moveTo(sx, y); else ctx.lineTo(sx, y);
      const curX = x0 + (Math.min(t, acc+dur)/total) * (x1-x0);
      if(t > acc){ ctx.lineTo(Math.min(curX, ex), y); }
      acc += dur;
      if(t <= acc) break;
    }
    ctx.stroke(); ctx.shadowBlur = 0;
    // moving cursor
    if(progress > 0 && progress < 1){
      const cx = x0 + progress * (x1 - x0);
      ctx.strokeStyle = 'rgba(226,232,240,.5)'; ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(cx, 30); ctx.lineTo(cx, 140); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  btn.addEventListener('click', () => {
    cancelAnimationFrame(raf);
    const t0 = performance.now();
    const tick = now => {
      const p = Math.min(1, (now - t0) / 2400);
      draw(p);
      if(p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
  card.appendChild(seg); card.appendChild(btn); card.appendChild(canvas); card.appendChild(note);
  container.appendChild(card);
  draw(0);
}

/* --- AS5116 UART frame + ECC_STATUS query demo --- */
function uartSim(container){
  const UI = window.ENC_UI;
  const card = UI.h(`<div class="card"><h3>UART service port — 0x55 sync & ECC_STATUS query <span class="tag">interactive</span></h3></div>`);
  const canvas = document.createElement('canvas');
  canvas.width = 680; canvas.height = 150; canvas.className = 'sim-canvas';
  const term = UI.h(`<div class="code-viewer" style="margin-top:10px"><pre style="padding:12px 14px;font-size:12px"><code class="code-body">// terminal — 19200 8N1 (1.1–70 kbit/s), sync byte 0x55
idle</code></pre></div>`);
  const codeEl = term.querySelector('.code-body');
  let inject = false;
  const t1 = UI.toggle('Inject double-bit ECC fault before read', false, v => { inject = v; });
  const bSync = UI.el('button', 'btn', 'Send 0x55 sync'); bSync.type = 'button';
  const bRead = UI.el('button', 'btn btn-primary', 'Read ECC_STATUS (0x1C)'); bRead.type = 'button';
  function drawByte(byte, label){
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#8B97AB'; ctx.font = '10px ui-monospace,monospace';
    ctx.fillText((label || 'byte') + ' = 0x' + byte.toString(16).toUpperCase().padStart(2,'0') + ' · LSB first · 8N1', 10, 16);
    const bits = [0]; // start
    for(let i = 0; i < 8; i++) bits.push((byte >> i) & 1);
    bits.push(1); // stop
    const x0 = 14, x1 = W - 14, cell = (x1 - x0) / bits.length, yHi = 44, yLo = 108;
    ctx.strokeStyle = '#253041'; ctx.strokeRect(x0, 30, x1 - x0, 96);
    ctx.strokeStyle = '#34D399'; ctx.lineWidth = 2.2; ctx.shadowColor = '#34D399'; ctx.shadowBlur = 5;
    ctx.beginPath();
    bits.forEach((b, i) => {
      const y = b ? yHi : yLo;
      const sx = x0 + i * cell;
      if(i === 0) ctx.moveTo(sx, y); else ctx.lineTo(sx, y);
      ctx.lineTo(sx + cell, y);
    });
    ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#5C6879'; ctx.font = '8px ui-monospace,monospace';
    ['ST','0','1','2','3','4','5','6','7','SP'].forEach((s, i) => ctx.fillText(s, x0 + i * cell + cell/2 - 4, 142));
  }
  bSync.addEventListener('click', () => { drawByte(0x55, 'SYNC'); codeEl.textContent = '> TX 0x55\n< ACK — port synchronized, safe to query registers'; });
  bRead.addEventListener('click', () => {
    drawByte(inject ? 0x52 : 0x01, inject ? 'ECC_STATUS (corrupt)' : 'ECC_STATUS');
    codeEl.textContent = inject
      ? '> TX 0x55 0x1C\n< 0x02 — MAJOR SYSTEM ERROR (double-bit, uncorrectable)\n  → outputs enter defined safe state; schedule re-burn + RMA analysis'
      : '> TX 0x55 0x1C\n< 0x00 — OK (no corrections this cycle)\n  0x01 would mean single-bit corrected (informative)';
  });
  const legend = UI.h(`<div class="spec-note">UART_ERROR (reg 0x01) flags: SYNC / PARITY / FRAME. Sync frame is always 0x55. Bit rate 1.1–70 kbit/s. ECC reg 0x1B: Chsum bits 0:6 + EN bit 7 (Hamming SEC).</div>`);
  card.appendChild(canvas);
  const row = UI.h(`<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"></div>`);
  row.appendChild(bSync); row.appendChild(bRead);
  card.appendChild(row); card.appendChild(t1); card.appendChild(term); card.appendChild(legend);
  container.appendChild(card);
  drawByte(0x55, 'SYNC');
}

window.ENC_SECTIONS.push({
  id:'interfaces', num:'08',
  title:'Digital & Programming Interfaces',
  sub:'SPI mode 1 (AS5147) · UART service port (AS5116) · OUT3 overcurrent modulation (HAL 302x) — frame builders, parity checkers and waveform painters, all live.',
  refs:['§“SPI Interface” · DS000307','§“UART” · DS000686','§“Programming” · DSH000237'],
  tabs:{
    hal:{
      watch:[
        {t:'No pins, no problem', d:'HAL 302x speaks current: <b>OUT3 modulation</b> is the entire digital interface. Frame = VSUP levels of defined µs widths. The receiver is the die itself; the “protocol decoder” is an overcurrent detector on OUT3.'},
        {t:'Entry pattern first', d:'Before any bits: <b>2048 µs LOW → 1536 µs HIGH → 1024 µs LOW → 512 µs HIGH</b> (complex) or 2048/2048 (simple). Only then do register writes/reads proceed by further OUT3 modulation. NPRG = 100 — do not waste cycles in end-of-line testing.'},
        {t:'Reading back', d:'Verification reads also ride OUT3 (analog sensed by the programmer). Production line: (1) VSUP ramp, (2) entry pattern, (3) write mag_range/FINE_GAIN_CUST/bw_filt, (4) readback verify, (5) power-cycle, (6) angle sanity check on the bench.'},
        {t:'ESD on the prog line', d:'OUT3 is analog + high-current in prog mode → protect it: series 1 kΩ + BAT54S to rails, TVS if it leaves the PCB. A zapped OUT3 = dead sine half + dead programming.'},
      ],
      play:progPatternSim
    },
    as5147:{
      watch:[
        {t:'SPI mode 1, hard rules', d:'<b>CPOL = 0, CPHA = 1</b> — data changes on falling edge, sampled on rising. ≤ <b>10 MHz</b>. MSB first. CSn frames each transaction; MISO tri-states between frames for daisy-chains. Everything else is negotiable; these are not.'},
        {t:'Parity: even, always', d:'Lower 15 bits carry data + the frame is closed by <b>PARC</b> (bit 0): popcount(bits 15:1) + PARC must be even. Violations set <b>PARERR</b> (in 0x0019 class settings); <b>PARD</b> = the parity bit read back. Your driver must verify PARC on every read — SPI has no CRC, parity is all you get.'},
        {t:'Register map that matters', d:'<b>DIAAGC 0x3FFC</b> (diags+AGC) · <b>MAG 0x3FFD</b> (field) · <b>ANGLE 0x3FFE</b> (raw) · <b>ANGLECOM 0x3FFF</b> (compensated — command from this) · <b>SETTINGS2 0x0019</b> (config). Reads return 16 bits: 14 data + parity + frame status.'},
        {t:'Speed budget', d:'10 MHz × 32 bits (write+readback) = ~3.2 µs per transaction — comparable to one control-loop cycle at 10 kHz. Burst-read ANGLE+DIAAGC on every loop tick; 100 kHz SPI leaves 90 % bus headroom.'},
      ],
      play:spiFrameBuilder
    },
    as5116:{
      watch:[
        {t:'UART, but tiny', d:'<b>1.1 – 70 kbit/s</b>, sync frame <b>0x55</b>, 8N1. Lives on pin 6, multiplexed with DIAG. It exists for <b>service</b>: OTP burn, register read/write, ECC_STATUS. Not for control loops — analog outputs do that job.'},
        {t:'0x55 is not magic', d:'0x55 = 0b01010101 — alternating bits, perfect for baud lock on a self-clocked line. Send it, wait for the echo/ack, then your frames are legal. UART_ERROR (0x01) reports SYNC / PARITY / FRAME errors.'},
        {t:'ECC_STATUS — read it after burn', d:'<b>0 = OK</b> · <b>1 = single-bit corrected</b> (note it, continue) · <b>2 = double-bit → major system error</b>: outputs to defined safe state, re-burn or scrap. Log this code per unit in EOL; it is your OTP quality metric.'},
        {t:'Physical layer', d:'Push-pull, 3.3 V levels, short traces. Two wires + GND is enough. ESD: the UART pin is a known latch-up path — 100 Ω series + diode array mandatory if exposed to pogo pins in EOL fixtures.'},
      ],
      play:uartSim
    },
    compare:{
      watch:[
        {t:'Interface philosophy', d:'HAL: <b>zero</b> interface (pure analog, one-time prog) · AS5147: <b>rich</b> interface (SPI + ABI + UVW + PWM — a sensor that is also a commutation controller) · AS5116: <b>service</b> interface (UART for burn/diag, silent in run mode).'},
        {t:'MCU cost ranking', d:'AS5116 (ADC channels only) ≈ HAL (ADC + prog fixture) < AS5147 (SPI driver + parity check + framing logic — small, but firmware you must write and verify).'},
        {t:'Determinism', d:'Analog interfaces are inherently deterministic (wire = delay). SPI is deterministic within a frame but shares the MCU bus — use a dedicated peripheral + DMA, never bit-bang in an ISR.'},
      ],
      play:function(container, data){ window.ENC_UI.comparePane(container, ['Outputs & interfaces','Programming & trim']); }
    },
  }
});
