/* Compare matrix renderer (window.ENC_UI.matrix) */
window.ENC_UI = window.ENC_UI || {};
window.ENC_UI.matrix = function(container, groups, opts){
  opts = opts || {};
  const wrap = document.createElement('div');
  let filterText = '', diffOnly = !!opts.showDiff, hlDiff = true;

  const controls = document.createElement('div');
  controls.className = 'matrix-controls';
  if(opts.filterable !== false){
    controls.innerHTML += `<input class="search-input" type="search" placeholder="Filter parameters… (e.g. latency, stray, OTP)" aria-label="Filter comparison rows">`;
  }
  if(opts.showDiff !== false){
    controls.innerHTML += `<label class="check"><input type="checkbox" class="mx-diff" ${hlDiff ? 'checked' : ''}> Highlight differences</label>`;
    if(opts.full) controls.innerHTML += `<label class="check"><input type="checkbox" class="mx-difffilter"> Show only differentiating rows</label>`;
  }
  wrap.appendChild(controls);

  const scroll = document.createElement('div');
  scroll.className = 'matrix-wrap';
  const table = document.createElement('table');
  table.className = 'matrix-table' + (hlDiff ? ' diff-hl' : '');
  table.innerHTML = `<thead><tr>
      <th>Parameter</th>
      <th data-col="hal"><span class="ds-chip"><i class="ds-hal"></i>HAL 302x</span></th>
      <th data-col="as5147"><span class="ds-chip"><i class="ds-5147"></i>AS5147</span></th>
      <th data-col="as5116"><span class="ds-chip"><i class="ds-5116"></i>AS5116</span></th>
    </tr></thead><tbody></tbody>`;
  const tbody = table.querySelector('tbody');

  function rowMatches(r){
    if(diffOnly && !r.diff) return false;
    if(!filterText) return true;
    const hay = (r.param + ' ' + r.hal + ' ' + r.as5147 + ' ' + r.as5116 + ' ' + (r.unit || '')).toLowerCase();
    return hay.includes(filterText);
  }
  function render(){
    tbody.innerHTML = '';
    let visible = 0;
    groups.forEach(g => {
      const rows = g.rows.filter(rowMatches);
      if(!rows.length) return;
      const gh = document.createElement('tr'); gh.className = 'grp';
      gh.innerHTML = `<td colspan="4">${g.name} · ${rows.length} rows</td>`;
      tbody.appendChild(gh);
      rows.forEach(r => {
        const tr = document.createElement('tr');
        if(r.diff) tr.className = 'diff';
        tr.innerHTML = `<td>${r.param}${r.unit ? ` <span class="unit">[${r.unit}]</span>` : ''}</td>
          <td data-col="hal">${r.hal}</td>
          <td data-col="as5147">${r.as5147}</td>
          <td data-col="as5116">${r.as5116}</td>`;
        tbody.appendChild(tr); visible++;
      });
    });
    if(!visible){
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="4" style="text-align:center;color:var(--faint);padding:26px">No rows match “${filterText}”. Clear the filter.</td>`;
      tbody.appendChild(tr);
    }
  }
  render();

  const search = controls.querySelector('.search-input');
  if(search) search.addEventListener('input', e => { filterText = e.target.value.trim().toLowerCase(); render(); });
  const diffToggle = controls.querySelector('.mx-diff');
  if(diffToggle) diffToggle.addEventListener('change', e => { table.classList.toggle('diff-hl', e.target.checked); });
  const diffFilter = controls.querySelector('.mx-difffilter');
  if(diffFilter) diffFilter.addEventListener('change', e => { diffOnly = e.target.checked; render(); });

  scroll.appendChild(table);
  wrap.appendChild(scroll);
  container.appendChild(wrap);
  return wrap;
};
