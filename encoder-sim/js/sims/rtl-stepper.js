/* RTL stepper — cycle-by-cycle walk through the angle pipeline.
   Model of the AS5147-style chain: SAMPLE → CORDIC → DAEC → LATCH → SPI out. */
window.ENC_SIMS = window.ENC_SIMS || {};
window.ENC_SIMS.rtlStepper = function(container, opts){
  const UI = window.ENC_UI;
  const stages = [
    { name:'SAMPLE', desc:'Bx/By sampled & held from A/D (synchronized to hall clock)' },
    { name:'CORDIC', desc:'Vectoring CORDIC: 16 iterations of shift-add → angle code' },
    { name:'DAEC',   desc:'Dynamic Angle Error Compensation: + ω·t_delay' },
    { name:'LATCH',  desc:'ANGLECOM register updated; parity (PARC) regenerated' },
    { name:'OUTPUT', desc:'ANGLE 0x3FFE / ANGLECOM 0x3FFF readable over SPI mode 1' },
  ];
  const state = { stage:-1, angle: 138.4, speed: 4000 /* rpm */, running:false, timer:null };

  const ctl = UI.h(`<div class="control"><div class="control-head"><label>Rotor electrical angle</label><output>${state.angle}°</output></div>
    <input type="range" min="0" max="360" step="0.5" value="${state.angle}" aria-label="Rotor angle"></div>`);
  const ctl2 = UI.h(`<div class="control"><div class="control-head"><label>Rotor speed</label><output>${state.speed} rpm</output></div>
    <input type="range" min="0" max="14500" step="50" value="${state.speed}" aria-label="Rotor speed"></div>`);
  const angleOut = ctl.querySelector('output'), speedOut = ctl2.querySelector('output');
  ctl.querySelector('input').addEventListener('input', e => { state.angle = +e.target.value; angleOut.textContent = state.angle.toFixed(1) + '°'; updateRegs(); });
  ctl2.querySelector('input').addEventListener('input', e => { state.speed = +e.target.value; speedOut.textContent = state.speed + ' rpm'; updateRegs(); });

  const btnRow = UI.h(`<div style="display:flex;gap:8px;margin:10px 0;flex-wrap:wrap">
    <button class="btn btn-primary" type="button" data-act="step">Step cycle ⏭</button>
    <button class="btn" type="button" data-act="auto">▶ Auto-run</button>
    <button class="btn" type="button" data-act="reset">Reset</button>
  </div>`);

  const stageRow = UI.h(`<div class="rtl-stage">${stages.map((s,i) => `<div class="stage" data-stage="${i}"><div class="stage-name">${i+1}. ${s.name}</div><div class="stage-val">····</div></div>`).join('')}</div>`);
  const descLine = UI.h(`<div class="banner banner-info" style="margin:8px 0">Idle — press <b>Step cycle</b>. Each step advances the pipeline by one state (this models one result latency, not wall-clock ns).</div>`);
  const regFile = UI.h(`<div class="reg-file"></div>`);

  function comps(){
    const rad = state.angle * Math.PI/180;
    const bz = 52;                       // mT, arbitrary nominal field
    const bx = bz * Math.cos(rad), by = bz * Math.sin(rad);
    const cordic = ((state.angle % 360) + 360) % 360;
    const omega = state.speed * 2 * Math.PI / 60;       // rad/s
    const tdelay = 100e-6;                              // s (datasheet 90–110 µs)
    const dae = (omega * tdelay) * 180/Math.PI;         // deg
    const comp = (cordic + dae) % 360;
    const code = Math.round(cordic/360*16384) & 0x3FFF;
    const codeC = Math.round(comp/360*16384) & 0x3FFF;
    return { bx, by, cordic, dae, comp, code, codeC };
  }
  function hex14(v){ return '0x' + v.toString(16).toUpperCase().padStart(4,'0'); }
  function updateRegs(){
    const c = comps();
    const cells = [
      ['Bx', c.bx.toFixed(1) + ' mT', 'input'], ['By', c.by.toFixed(1) + ' mT', 'input'],
      ['ANGLE 0x3FFE', hex14(c.code), '14-bit'], ['ANGLECOM 0x3FFF', hex14(c.codeC), '14-bit + DAEC'],
      ['DAE', '+' + c.dae.toFixed(3) + '°', 'ω·t_delay'], ['PARC', parity15(c.codeC) ? '1 (odd)' : '0 (even)', 'even parity bit'],
    ];
    regFile.innerHTML = cells.map(([a,v,d]) => `<div class="reg-cell"><div class="reg-addr">${a}</div><div class="reg-val">${v}</div><div class="reg-name">${d}</div></div>`).join('');
  }
  function parity15(v){ let p = 0; for(let i = 0; i < 15; i++){ p ^= (v >> i) & 1; } return p; }
  function setStage(i){
    stageRow.querySelectorAll('.stage').forEach((sEl, j) => {
      sEl.classList.toggle('active', j === i);
      const c = comps();
      const vals = [c.bx.toFixed(1), Math.round(c.code).toString(16).toUpperCase(), (Math.abs(c.dae)).toFixed(2) + '°', hex14(c.codeC), String(c.codeC)];
      sEl.querySelector('.stage-val').textContent = j < i ? 'done' : (j === i ? vals[j] : '····');
    });
    if(i >= 0) descLine.innerHTML = `<b>${stages[i].name}</b> — ${stages[i].desc}`;
  }
  function step(){
    state.stage = (state.stage + 1) % (stages.length + 1);
    if(state.stage >= stages.length){ state.stage = -1; descLine.innerHTML = 'Cycle complete — ANGLE/ANGLECOM hold until the next conversion. Press again to restart.'; setStage(-1); updateRegs(); return; }
    setStage(state.stage); updateRegs();
  }
  btnRow.querySelector('[data-act=step]').addEventListener('click', step);
  btnRow.querySelector('[data-act=reset]').addEventListener('click', () => { state.stage = -1; clearInterval(state.timer); state.running = false; btnRow.querySelector('[data-act=auto]').textContent = '▶ Auto-run'; setStage(-1); updateRegs(); });
  btnRow.querySelector('[data-act=auto]').addEventListener('click', e => {
    state.running = !state.running;
    e.target.textContent = state.running ? '⏸ Pause' : '▶ Auto-run';
    clearInterval(state.timer);
    if(state.running) state.timer = setInterval(step, 900);
  });

  container.appendChild(ctl); container.appendChild(ctl2); container.appendChild(btnRow);
  container.appendChild(stageRow); container.appendChild(descLine); container.appendChild(regFile);
  updateRegs();
};
