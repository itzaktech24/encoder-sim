/* UI framework — shared helpers, tabs, watch player, widgets (window.ENC_UI) */
window.ENC_UI = window.ENC_UI || {};
(function(UI){
'use strict';

/* ---------- tiny DOM helpers ---------- */
UI.h = function(html){ const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
UI.el = function(tag, cls, text){ const e = document.createElement(tag); if(cls) e.className = cls; if(text!=null) e.textContent = text; return e; };
UI.clamp = (v,a,b)=>Math.min(b,Math.max(a,v));
UI.deg = r => (r*180/Math.PI);
UI.fmt = (v,d)=>Number(v).toFixed(d==null?2:d);

/* ---------- spec table ---------- */
UI.specTable = function(rows, caption){
  const t = document.createElement('table');
  t.className = 'spec-table';
  let html = '';
  if(caption) html += `<caption>${caption}</caption>`;
  html += '<tbody>' + rows.map(r =>
    `<tr><td>${r[0]}</td><td class="num">${r[1]}${r[2]?` <span class="unit">${r[2]}</span>`:''}</td></tr>`
  ).join('') + '</tbody>';
  t.innerHTML = html;
  return t;
};

/* ---------- metric gauge ---------- */
UI.gauge = function(label, value, min, max, unit, note){
  const pct = UI.clamp((value - min)/(max - min)*100, 0, 100);
  const g = UI.h(`<div class="gauge">
    <div class="gauge-top"><span>${label}</span><b>${value}${unit?' '+unit:''}</b></div>
    <div class="gauge-track"><div class="gauge-fill" style="width:${pct}%"></div></div>
    ${note?`<div class="spec-note">${note}</div>`:''}
  </div>`);
  return g;
};

/* ---------- watch-mode narration player ---------- */
/* cards: [{t:'Title', d:'HTML body'}] — auto-advances every 6.5 s */
UI.watchPlayer = function(cards, accent){
  let idx = 0, timer = null, progressTimer = null, autoplay = true, elapsed = 0;
  const DUR = 6500;
  const root = UI.h(`<div class="watch-player" role="region" aria-label="Narrated explanation">
    <div class="wp-eyebrow">
      <span class="wp-card-label">Watch mode · narrated</span>
      <span class="wp-counter"><span class="wp-idx">1</span> / ${cards.length}</span>
    </div>
    <h3 class="wp-title"></h3>
    <p class="wp-body"></p>
    <div class="wp-foot">
      <button class="wp-btn wp-prev" aria-label="Previous card"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <div class="wp-progress" role="progressbar" aria-label="Card progress"><div class="wp-progress-fill"></div></div>
      <button class="wp-btn wp-next" aria-label="Next card"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <div class="wp-dots"></div>
      <label class="wp-auto"><input type="checkbox" ${autoplay?'checked':''} class="wp-auto-toggle"> Auto-play</label>
    </div>
  </div>`);
  const titleEl = root.querySelector('.wp-title'), bodyEl = root.querySelector('.wp-body'),
        idxEl = root.querySelector('.wp-idx'), fill = root.querySelector('.wp-progress-fill'),
        dotsWrap = root.querySelector('.wp-dots');
  const dots = cards.map((_, i) => {
    const d = UI.el('button', 'wp-dot'); d.setAttribute('aria-label', 'Card ' + (i+1));
    d.addEventListener('click', () => { go(i); }); dotsWrap.appendChild(d); return d;
  });
  function render(){
    titleEl.textContent = cards[idx].t;
    bodyEl.innerHTML = cards[idx].d;
    idxEl.textContent = idx + 1;
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  }
  function stopTimers(){ clearInterval(timer); clearInterval(progressTimer); }
  function startTimers(){
    stopTimers(); elapsed = 0; fill.style.width = '0%';
    if(!autoplay) return;
    progressTimer = setInterval(() => {
      elapsed += 50;
      fill.style.width = UI.clamp(elapsed / DUR * 100, 0, 100) + '%';
      if(elapsed >= DUR){ go((idx + 1) % cards.length, true); }
    }, 50);
  }
  function go(i, keep){
    idx = ((i % cards.length) + cards.length) % cards.length;
    render(); startTimers();
  }
  root.querySelector('.wp-prev').addEventListener('click', () => go(idx - 1));
  root.querySelector('.wp-next').addEventListener('click', () => go(idx + 1));
  root.querySelector('.wp-progress').addEventListener('click', e => {
    const r = e.currentTarget.getBoundingClientRect();
    go(Math.floor(((e.clientX - r.left) / r.width) * cards.length));
  });
  root.querySelector('.wp-auto-toggle').addEventListener('change', e => { autoplay = e.target.checked; startTimers(); });
  document.addEventListener('visibilitychange', () => { if(document.hidden) stopTimers(); else startTimers(); });
  render(); startTimers();
  return root;
};

/* ---------- hotspot figure (datasheet image + SVG % overlay) ---------- */
UI.hotspotStage = function(imgSrc, hotspots, caption, altText){
  const wrap = UI.h(`<div class="hotspot-stage" style="position:relative"></div>`);
  const img = document.createElement('img');
  img.src = imgSrc; img.alt = altText || caption || 'Datasheet figure';
  img.loading = 'lazy';
  wrap.appendChild(img);
  const detail = UI.h(`<div class="pin-detail" style="margin-top:12px"><h4>Tap a marker ①…</h4><p>Each numbered marker on the figure maps to an explanation of that functional block, exactly as drawn in the official datasheet figure.</p></div>`);
  hotspots.forEach((hs, i) => {
    const b = UI.el('button', 'hotspot', String(i + 1));
    b.style.left = hs.x + '%'; b.style.top = hs.y + '%';
    b.setAttribute('aria-label', hs.label);
    b.addEventListener('click', () => {
      wrap.querySelectorAll('.hotspot').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      detail.innerHTML = `<h4>${i + 1} · ${hs.label}</h4><p>${hs.detail}</p>`;
    });
    wrap.appendChild(b);
  });
  const col = UI.h(`<div></div>`);
  col.appendChild(wrap);
  if(caption) col.appendChild(UI.h(`<div class="fig-caption">${caption} — reproduced from official datasheet</div>`));
  col.appendChild(detail);
  return col;
};

/* ---------- interactive SVG pinout ---------- */
/* pkg: 'soic8' | 'tssop14'; pins from data file ({pin,name,dir,desc,elec}) */
UI.pinout = function(data, pkg){
  const isQfp = pkg === 'tssop14';
  const W = 340, H = isQfp ? 430 : 300;
  const bodyX = isQfp ? 105 : 95, bodyY = isQfp ? 60 : 40, bodyW = isQfp ? 130 : 150, bodyH = isQfp ? 310 : 220;
  const pinsPerSide = data.pinout.length / 2;
  const left = data.pinout.slice(0, pinsPerSide), right = data.pinout.slice(pinsPerSide).reverse();
  const gap = bodyH / pinsPerSide;
  const detail = UI.h(`<div class="pin-detail"><h4>Select a pin</h4><p>Click any pin on the package outline to inspect its function, direction and electrical notes — straight from the datasheet pin table.</p></div>`);
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'pkg-outline');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', data.name + ' package pinout');
  const mk = (tag, attrs, parent) => {
    const n = document.createElementNS(svgNS, tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    (parent || svg).appendChild(n); return n;
  };
  // package body
  mk('rect', {x:bodyX, y:bodyY, width:bodyW, height:bodyH, rx:8, fill:'#1A2230', stroke:'#33415C', 'stroke-width':2});
  mk('circle', {cx:bodyX + 22, cy:bodyY + 22, r:6, fill:'none', stroke:'#FBBF24', 'stroke-width':2}); // pin-1 dot
  const label = mk('text', {x:bodyX + bodyW/2, y:bodyY + bodyH/2, 'text-anchor':'middle', fill:'#D8E0EC', 'font-size':17, 'font-weight':700, class:'mono'});
  label.textContent = data.name;
  const sub = mk('text', {x:bodyX + bodyW/2, y:bodyY + bodyH/2 + 18, 'text-anchor':'middle', fill:'#8B97AB', 'font-size':8.5});
  sub.textContent = pkg === 'tssop14' ? 'TSSOP-14' : 'SOIC-8';
  const select = (pinDef, g) => {
    svg.querySelectorAll('.svg-pin').forEach(x => x.classList.remove('selected'));
    g.classList.add('selected');
    detail.innerHTML = `<h4>Pin ${pinDef.pin} · ${pinDef.name}</h4>
      <p>${pinDef.desc}</p>
      <div class="pin-meta">
        <span class="pin-chip">${(pinDef.type || '').toUpperCase()}</span>
        <span class="pin-chip">${pinDef.dir === 'in' ? 'INPUT' : pinDef.dir === 'out' ? 'OUTPUT' : pinDef.dir.toUpperCase()}</span>
        <span class="pin-chip">${pinDef.elec}</span>
      </div>`;
  };
  const drawSide = (pins, side) => {
    pins.forEach((p, i) => {
      const cy = bodyY + gap/2 + i * gap;
      const g = mk('g', {class:'svg-pin', tabindex:0, role:'button', 'aria-label':'Pin ' + p.pin + ' ' + p.name});
      const pinLen = 30;
      let x;
      if(side === 'left'){ x = bodyX - pinLen; } else { x = bodyX + bodyW; }
      mk('rect', {x:x, y:cy - 9, width:pinLen, height:18, rx:3, fill:'#212B3A', stroke:'#33415C', 'stroke-width':1.4}, g);
      const nameT = mk('text', {x: side === 'left' ? x - 6 : x + pinLen + 6, y: cy + 3.5, 'font-size':9.5, fill:'#B9C4D4', 'text-anchor': side === 'left' ? 'end' : 'start'}, g);
      nameT.textContent = p.name;
      const numT = mk('text', {x: side === 'left' ? x + pinLen - 8 : x + 8, y: cy + 3.5, 'font-size':10, fill:'#8B97AB', 'text-anchor':'middle'}, g);
      numT.textContent = p.pin;
      g.addEventListener('click', () => select(p, g));
      g.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); select(p, g); } });
    });
  };
  drawSide(left, 'left'); drawSide(right, 'right');
  const wrap = UI.h(`<div class="pinout-wrap"></div>`);
  wrap.appendChild(svg); wrap.appendChild(detail);
  return wrap;
};

/* ---------- compare-pane builder (delegates to ENC_UI.matrix) ---------- */
UI.comparePane = function(container, groupNames, opts){
  const groups = (window.ENC_DATA.COMPARE.groups || []).filter(g => !groupNames || groupNames.includes(g.name));
  UI.matrix(container, groups, Object.assign({compact:true, filterable:false, showDiff:true}, opts || {}));
};

/* ---------- IV. small form helpers ---------- */
UI.sliderRow = function(label, min, max, step, value, unit, oninput){
  const id = 'sl' + Math.random().toString(36).slice(2, 8);
  const row = UI.h(`<div class="control">
    <div class="control-head"><label for="${id}">${label}</label><output>${value} ${unit || ''}</output></div>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}">
  </div>`);
  const out = row.querySelector('output');
  row.querySelector('input').addEventListener('input', e => {
    out.textContent = `${e.target.value} ${unit || ''}`;
    oninput && oninput(Number(e.target.value));
  });
  return row;
};

UI.toggle = function(label, checked, onchange){
  const t = UI.h(`<label class="tgl"><input type="checkbox" ${checked ? 'checked' : ''}><span class="track"></span><span>${label}</span></label>`);
  t.querySelector('input').addEventListener('change', e => onchange && onchange(e.target.checked));
  return t;
};

UI.segButtons = function(items, activeIdx, onpick){
  const wrap = UI.h(`<div class="seg"></div>`);
  items.forEach((label, i) => {
    const b = UI.el('button', 'seg-btn' + (i === activeIdx ? ' active' : ''), label);
    b.type = 'button';
    b.addEventListener('click', () => {
      wrap.querySelectorAll('.seg-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); onpick && onpick(i, label);
    });
    wrap.appendChild(b);
  });
  return wrap;
};

})(window.ENC_UI);
