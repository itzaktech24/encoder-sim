/* encoder-sim — bootstrap: nav, panels, tabs, watch/play modes, hash routing */
(function(){
'use strict';
const UI = window.ENC_UI;
const SECTIONS = window.ENC_SECTIONS || [];
const ICS = [
  {key:'hal',     label:'HAL 302x', data:() => window.ENC_DATA.HAL302X},
  {key:'as5147',  label:'AS5147',   data:() => window.ENC_DATA.AS5147},
  {key:'as5116',  label:'AS5116',   data:() => window.ENC_DATA.AS5116},
  {key:'compare', label:'Compare',  data:() => null},
];
const state = {}; // per section id: {ic, mode, playInit:{}, watchBuilt:{}}

const navList = document.getElementById('nav-list');
const root = document.getElementById('sections-root');
const select = document.getElementById('section-select');
const topbarMode = document.getElementById('topbar-mode');

function buildSection(sec){
  const panel = UI.h(`<section class="section-panel" id="sec-${sec.id}" data-ic="hal" role="region" aria-label="${sec.title}"></section>`);
  panel.innerHTML = `
    <header class="section-head">
      <div class="section-num">${sec.num}</div>
      <div>
        <h2>${sec.title}</h2>
        <p class="section-sub">${sec.sub}</p>
      </div>
      <div class="ref-chips">${(sec.refs || []).map(r => `<span class="ref-chip">${r}</span>`).join('')}</div>
    </header>
    <div class="toolbar">
      <div class="ic-tabs" role="tablist" aria-label="Device">
        ${ICS.map(i => `<button class="ic-tab" role="tab" data-tab="${i.key}" aria-selected="${i.key === 'hal'}"><i></i>${i.label}</button>`).join('')}
      </div>
      <div class="mode-toggle" role="tablist" aria-label="Interaction mode">
        <button class="mode-btn active" data-mode="watch" role="tab"><span class="dot"></span>Watch</button>
        <button class="mode-btn" data-mode="play" role="tab"><span class="dot"></span>Play</button>
      </div>
    </div>
    <div class="pane pane-watch active" role="tabpanel"></div>
    <div class="pane pane-play" role="tabpanel"></div>`;
  state[sec.id] = {ic:'hal', mode:'watch', built:{}, played:{}};
  wirePanel(panel, sec);
  return panel;
}

function paneFor(panel, sec, ic, mode){
  return panel.querySelector(mode === 'watch' ? '.pane-watch' : '.pane-play');
}

function ensureContent(panel, sec, ic, mode){
  const st = state[sec.id];
  const key = ic + ':' + mode;
  if(st.built[key]) return;
  const pane = paneFor(panel, sec, ic, mode);
  const tab = sec.tabs[ic];
  const wrap = UI.h(`<div class="tab-body" data-tab-body="${ic}"></div>`);
  if(mode === 'watch'){
    if(tab.watch && tab.watch.length){
      wrap.appendChild(UI.watchPlayer(tab.watch, ic));
      const last = UI.h(`<div class="spec-note" style="margin-top:10px">Every value cited is traceable to the datasheets listed in the header chips. Mismatch flags are collected in Section 12.</div>`);
      wrap.appendChild(last);
    } else {
      wrap.appendChild(UI.h(`<div class="banner banner-info">No narration for this tab yet.</div>`));
    }
  } else {
    try {
      tab.play(wrap, ICS.find(i => i.key === ic).data());
    } catch(err){
      console.error('play build failed', sec.id, ic, err);
      wrap.appendChild(UI.h(`<div class="banner banner-bad">Sandbox failed to initialise: ${err.message}. Open the console for details.</div>`));
    }
  }
  pane.appendChild(wrap);
  st.built[key] = true;
}

function applyState(panel, sec){
  const st = state[sec.id];
  panel.setAttribute('data-ic', st.ic);
  panel.querySelectorAll('.ic-tab').forEach(b => {
    const on = b.dataset.tab === st.ic;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
  });
  panel.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === st.mode));
  panel.querySelector('.pane-watch').classList.toggle('active', st.mode === 'watch');
  panel.querySelector('.pane-play').classList.toggle('active', st.mode === 'play');
  // show only active tab body within panes
  panel.querySelectorAll('.tab-body').forEach(b => { b.style.display = (b.dataset.tabBody === st.ic) ? '' : 'none'; });
  ensureContent(panel, sec, st.ic, st.mode);
  if(topbarMode) topbarMode.textContent = st.mode.toUpperCase();
}

function wirePanel(panel, sec){
  panel.querySelectorAll('.ic-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state[sec.id].ic = btn.dataset.tab;
      applyState(panel, sec);
    });
  });
  panel.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state[sec.id].mode = btn.dataset.mode;
      applyState(panel, sec);
    });
  });
}

/* build nav + panels */
SECTIONS.forEach(sec => {
  const item = UI.el('button', 'nav-item');
  item.innerHTML = `<span class="nav-num">${sec.num}</span><span class="nav-label">${sec.title.split('—')[0].trim()}</span>`;
  item.dataset.target = 'sec-' + sec.id;
  item.addEventListener('click', () => activate(sec.id, true));
  navList.appendChild(item);
  if(select){
    const opt = document.createElement('option');
    opt.value = sec.id; opt.textContent = sec.num + ' · ' + sec.title.split('—')[0].trim();
    select.appendChild(opt);
  }
  root.appendChild(buildSection(sec));
});
if(select) select.addEventListener('change', () => activate(select.value, true));

function activate(id, pushHash){
  SECTIONS.forEach(s => {
    const panel = document.getElementById('sec-' + s.id);
    const on = s.id === id;
    panel.classList.toggle('active', on);
    if(on) applyState(panel, s);
  });
  navList.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.target === 'sec-' + id));
  if(select) select.value = id;
  if(pushHash) history.replaceState(null, '', '#sec-' + id);
  window.scrollTo({top: 0, behavior: 'smooth'});
}

/* keyboard navigation: ← / → between sections */
document.addEventListener('keydown', e => {
  const tag = (e.target.tagName || '').toLowerCase();
  if(tag === 'input' || tag === 'select' || tag === 'textarea') return;
  if(e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const ids = SECTIONS.map(s => s.id);
  const current = (location.hash.match(/#sec-([\w-]+)/) || [null, ids[0]])[1];
  let idx = ids.indexOf(current); if(idx < 0) idx = 0;
  idx = (idx + (e.key === 'ArrowRight' ? 1 : -1) + ids.length) % ids.length;
  activate(ids[idx], true);
});

/* boot from hash or default to section 01 */
const boot = (location.hash.match(/#sec-([\w-]+)/) || [null, 'context'])[1];
activate(SECTIONS.some(s => s.id === boot) ? boot : 'context', false);
})();
