import type { DiffResult } from "./diff-core.js";
import { VERSION } from "./render.js";

// Inline viewer for a diff report. Kept as strings so the output HTML has zero
// external requests (no CDN, no fonts, no network) — same invariant as the main
// dataloupe explorer.

const DIFF_CSS = `
:root{--bg:#fff;--fg:#1f2328;--muted:#656d76;--line:#d0d7de;--add-bg:#e6ffec;--add-fg:#1a7f37;--del-bg:#ffebe9;--del-fg:#cf222e;--chg-bg:#fff8c5;--chg-fg:#9a6700;--cell-old:#ffebe9;--cell-new:#e6ffec;--head:#f6f8fa}
*{box-sizing:border-box}
body{margin:0;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:var(--fg);background:var(--bg)}
header{padding:16px 20px;border-bottom:1px solid var(--line)}
h1{font-size:18px;margin:0 0 4px}
h1 .v{color:var(--muted);font-weight:400;font-size:13px}
.sub{color:var(--muted);font-size:13px}
.sub code{background:var(--head);padding:1px 5px;border-radius:5px}
.bar{display:flex;gap:8px;flex-wrap:wrap;padding:12px 20px;border-bottom:1px solid var(--line);align-items:center}
.badge{border:1px solid var(--line);border-radius:999px;padding:4px 12px;font-size:13px;cursor:pointer;user-select:none;background:var(--bg)}
.badge b{font-variant-numeric:tabular-nums}
.badge.off{opacity:.4}
.badge.added{border-color:var(--add-fg);color:var(--add-fg)}
.badge.removed{border-color:var(--del-fg);color:var(--del-fg)}
.badge.changed{border-color:var(--chg-fg);color:var(--chg-fg)}
.badge.unchanged{color:var(--muted)}
.wrap{overflow:auto;max-height:calc(100vh - 150px)}
table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}
th,td{border-bottom:1px solid var(--line);padding:6px 10px;text-align:left;white-space:nowrap;vertical-align:top}
th{position:sticky;top:0;background:var(--head);z-index:1;font-weight:600}
td.status{font-weight:600;text-align:center;width:1%}
tr.added td{background:var(--add-bg)} tr.added td.status{color:var(--add-fg)}
tr.removed td{background:var(--del-bg)} tr.removed td.status{color:var(--del-fg)}
tr.changed td.status{color:var(--chg-fg)}
.old{background:var(--cell-old);text-decoration:line-through;color:var(--del-fg);border-radius:4px;padding:0 3px}
.new{background:var(--cell-new);color:var(--add-fg);border-radius:4px;padding:0 3px}
.cellchg{white-space:normal}
.null{color:var(--muted);font-style:italic}
.empty{padding:40px 20px;text-align:center;color:var(--muted)}
footer{padding:12px 20px;color:var(--muted);font-size:12px;border-top:1px solid var(--line)}
footer a{color:inherit}
@media (prefers-color-scheme:dark){:root{--bg:#0d1117;--fg:#e6edf3;--muted:#8b949e;--line:#30363d;--add-bg:#12261e;--add-fg:#3fb950;--del-bg:#25171c;--del-fg:#f85149;--chg-bg:#272115;--chg-fg:#d29922;--cell-old:#3c1618;--cell-new:#12331f;--head:#161b22}}
`;

const DIFF_JS = `(function(){
var D=window.__DATALOUPE_DIFF__;
var cols=D.columns, key=D.keyColumns;
var show={added:true,removed:true,changed:true,unchanged:false};
function esc(s){return String(s).replace(/[&<>]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;'}[c]})}
function cell(v){if(v===null||v===undefined||v==='')return '<span class="null">null</span>';return esc(v)}
function keyLabel(){return key.length? 'matched by '+key.map(function(k){return '<code>'+esc(k)+'</code>'}).join(', ')+(D.keyAuto?' (auto-detected)':'') : 'matched by whole row (no key column \u2014 pass --key for cell-level changes)'}
var rows=[];
D.removed.forEach(function(r){rows.push({s:'removed',v:r})});
D.added.forEach(function(r){rows.push({s:'added',v:r})});
D.changed.forEach(function(c){rows.push({s:'changed',c:c})});
function render(){
  var tb=document.getElementById('tb');
  var html='';var shown=0;
  for(var i=0;i<rows.length;i++){var row=rows[i];if(!show[row.s])continue;shown++;
    if(row.s==='changed'){
      var c=row.c, chg={};c.changed.forEach(function(n){chg[n]=1});
      html+='<tr class="changed"><td class="status">~</td>';
      for(var j=0;j<cols.length;j++){var name=cols[j];
        if(chg[name]){html+='<td class="cellchg"><span class="old">'+cell(c.before[j])+'</span> <span class="new">'+cell(c.after[j])+'</span></td>';}
        else{html+='<td>'+cell(c.after[j])+'</td>';}
      }
      html+='</tr>';
    } else {
      var sym=row.s==='added'?'+':'\u2212';
      html+='<tr class="'+row.s+'"><td class="status">'+sym+'</td>';
      for(var k=0;k<cols.length;k++)html+='<td>'+cell(row.v[k])+'</td>';
      html+='</tr>';
    }
  }
  if(shown===0)html='<tr><td class="empty" colspan="'+(cols.length+1)+'">No rows match the current filter.</td></tr>';
  tb.innerHTML=html;
  document.getElementById('keyline').innerHTML=keyLabel();
}
function badge(id){var el=document.getElementById(id);el.onclick=function(){show[id]=!show[id];el.classList.toggle('off',!show[id]);render()};el.classList.toggle('off',!show[id])}
['added','removed','changed','unchanged'].forEach(badge);
render();
})();`;

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}
function base(p: string): string {
  return p.split(/[\\/]/).pop() || p;
}

/** Build a single self-contained, offline HTML report for a {@link DiffResult}. */
export function renderDiffHtml(diff: DiffResult): string {
  const json = JSON.stringify(diff).replace(/<\//g, "<\\/");
  const bName = esc(base(diff.before.source));
  const aName = esc(base(diff.after.source));
  const c = diff.counts;
  const ths = ['<th class="status">·</th>', ...diff.columns.map((col) => `<th>${esc(col)}</th>`)].join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="dataloupe ${VERSION}">
<title>dataloupe diff · ${bName} → ${aName}</title>
<style>${DIFF_CSS}</style>
</head>
<body>
<header>
<h1>dataloupe diff <span class="v">v${VERSION}</span></h1>
<div class="sub"><code>${bName}</code> (${diff.before.rowCount.toLocaleString()} rows) → <code>${aName}</code> (${diff.after.rowCount.toLocaleString()} rows)</div>
<div class="sub" id="keyline"></div>
</header>
<div class="bar">
<span class="badge added" id="added"><b>+${c.added.toLocaleString()}</b> added</span>
<span class="badge removed" id="removed"><b>\u2212${c.removed.toLocaleString()}</b> removed</span>
<span class="badge changed" id="changed"><b>~${c.changed.toLocaleString()}</b> changed</span>
<span class="badge unchanged" id="unchanged"><b>=${c.unchanged.toLocaleString()}</b> unchanged</span>
</div>
<div class="wrap">
<table><thead><tr>${ths}</tr></thead><tbody id="tb"></tbody></table>
</div>
<footer>Generated offline by <a href="https://github.com/aurelio-nakamura/dataloupe">dataloupe</a> — no data left your machine. Built &amp; maintained by an AI agent (Aurelio Nakamura).</footer>
<script id="dataloupe-diff-data" type="application/json">${json}</script>
<script>window.__DATALOUPE_DIFF__=JSON.parse(document.getElementById("dataloupe-diff-data").textContent);</script>
<script>${DIFF_JS}</script>
</body>
</html>
`;
}
