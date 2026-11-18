/* Minimal Verilog/C highlighter + line-numbered code viewer (window.ENC_UI.codeViewer) */
window.ENC_UI = window.ENC_UI || {};
window.ENC_UI.codeViewer = function(code, lang){
  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const KW = /\b(module|endmodule|input|output|inout|wire|reg|logic|assign|always|always_ff|always_comb|begin|end|if|else|case|casex|endcase|localparam|parameter|posedge|negedge|or|and|not|default|function|endfunction|initial|generate|endgenerate|typedef|enum|struct|return|for|while|do)\b/g;
  const SYS = /\$(display|write|time|finish|signed|unsigned)\b/g;
  const NUM = /(0x[0-9a-fA-F]+|\d+'[bodh][0-9a-fA-Fxz?_]+|\b\d[\d_]*\b)/g;
  const STR = /("[^"\n]*")/g;
  const CMT = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g;
  const PRE = /(#\w+[^\n]*)/g;

  let src = esc(code.replace(/\n+$/,''));
  const stash = [];
  const protect = (re, cls) => { src = src.replace(re, m => { stash.push(`<span class="${cls}">${m}</span>`); return `\x00s${stash.length-1}\x00`; }); };
  protect(CMT, 'tok-c');
  if(lang === 'c') protect(PRE, 'tok-p');
  protect(STR, 'tok-s');
  src = src.replace(KW, '<span class="tok-k">$1</span>').replace(SYS, '<span class="tok-p">$&</span>').replace(NUM, '<span class="tok-n">$1</span>');
  src = src.replace(/\x00s(\d+)\x00/g, (_, i) => stash[+i]);

  const lines = src.split('\n');
  const viewer = document.createElement('div');
  viewer.className = 'code-viewer';
  viewer.innerHTML = `<pre><div class="code-gutter">${lines.map((_, i) => i + 1).join('\n')}</div><code class="code-body">${lines.join('\n')}</code></pre>`;
  return viewer;
};
