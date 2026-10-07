'use strict';
const M=MarkSix,$=id=>document.getElementById(id), fmt=n=>n.toLocaleString('zh-HK'), money=n=>'$'+n.toLocaleString('en-HK',{minimumFractionDigits:2,maximumFractionDigits:2});
const plans=[{type:'banker',d:3,f:8},{type:'multiple',d:0,f:11}];
const selected=new Set([0,1]); const jobs={}; const saved={};
// 所有動態 HTML 只插入由程式產生的標籤及已驗證數字；錯誤訊息使用 textContent。
function fmtInput(n){return n.toLocaleString('en-HK',{maximumFractionDigits:2});}
function parseMoneyInput(v){const s=v.replace(/,/g,'').trim();if(!/^\d+(\.\d{1,2})?$/.test(s))return null;return Number(s);}
function prices(){return Array.from({length:7},(_,i)=>{const n=parseMoneyInput($('price-'+i).value);if(n===null)throw Error('請完整輸入七個非負派彩金額，可用逗號分隔（例如 18,000,000），最多兩位小數。');return n;});}
function structure(p){return p.d?`${p.d}膽 + ${6-p.d}腳`:'任選 6 個號碼';}
function comparisons(){
  renderComparisonEditor();
}
function controls(prefix,bd,ff,bs=false,fs=false){const bdVal=bs?bd+0.5:bd,ffVal=fs?ff+0.5:ff;return `<div class="fields"><label>中正選的膽數<input id="${prefix}-bd" type="number" min="0" max="5.5" step="0.5" value="${bdVal}"></label><label>中正選的腳／號碼數<input id="${prefix}-ff" type="number" min="0" max="6.5" step="0.5" value="${ffVal}"></label></div><p class="hint">輸入 .5 代表連特別號都中埋（例如 5.5 = 5 個正選 + 特別號）；只可以喺膽或腳其中一邊輸入 .5。</p>`;}
function splitHit(v,label){const n=Number(v);if(!Number.isFinite(n)||n<0)throw Error(`請輸入${label}中獎數目。`);const whole=Math.floor(n+1e-9);const frac=Math.round((n-whole)*10)/10;if(frac!==0&&frac!==0.5)throw Error(`${label}數目只可以是整數，或以 .5 表示連中特別號（例如 5.5）。`);return {n:whole,special:frac===0.5};}
function hits(prefix){for(const s of ['bd','ff'])if($(prefix+'-'+s).value==='')throw Error('請輸入中正選數目。');const b=splitHit($(prefix+'-bd').value,'膽'),f=splitHit($(prefix+'-ff').value,'腳／號碼');if(b.special&&f.special)throw Error('只有 1 個特別號，膽同腳唔可以同時中特別號。');return {bd:b.n,ff:f.n,bs:b.special,fs:f.special};}
function bounds(prefix,p){$(prefix+'-bd').max=p.d+0.5;$(prefix+'-bd').disabled=!p.d;if(!p.d)$(prefix+'-bd').value=0;$(prefix+'-ff').max=Math.min(6,p.f)+0.5;}
function render(r,p,s,title){const fin=M.finance(r,prices(),s),max=Math.max(1,...r.counts.slice(1)),won=r.total-r.counts[0];
  return `${r.counts.slice(1).some((n,i)=>n>0&&prices()[i]===0)?'<p class="notice">有中獎獎項的派彩仍為 $0；下列收入尚未包含這些獎金，請補填派彩。</p>':''}${title?`<h3>${title}</h3>`:''}<p class="hint">${M.label(p)} · ${structure(p)} · ${s===5?'半注':'全注'} · ${fmt(won)} 注中獎</p><div class="metrics"><div class="metric"><span>投注成本</span><b>${money(fin.cost)}</b></div><div class="metric"><span>總派彩</span><b>${money(fin.payout)}</b></div><div class="metric"><span>${fin.net>=0?'淨盈利':'淨虧損'}</span><b class="${fin.net>=0?'positive':'negative'}">${fin.net>=0?'+':'−'}${money(Math.abs(fin.net))}</b></div><div class="metric"><span>回報率 ROI</span><b class="${fin.net>=0?'positive':'negative'}">${fin.roi>=0?'+':''}${fin.roi.toFixed(2)}%</b></div></div><div class="bars">${r.counts.slice(1).map((n,i)=>`<div class="bar-row"><span>${M.names[i+1]}</span><div class="track"><div class="fill" style="width:${n/max*100}%"></div></div><span>${fmt(n)} 注</span></div>`).join('')}</div><div class="result-foot">沒有中獎：<b>${fmt(r.counts[0])} 注</b> · 核對總數：${fmt(r.total)} 注</div><details open><summary>查看各獎項收入及計算方法</summary><div class="table-scroll"><table><thead><tr><th>獎項</th><th>要求</th><th>注數</th><th>收入</th></tr></thead><tbody>${['6 正選','5 正選 + 特別號','5 正選','4 正選 + 特別號','4 正選','3 正選 + 特別號','3 正選'].map((t,i)=>`<tr><td>${M.names[i+1]}${i<3?' <span class="badge">需自行輸入派彩</span>':''}</td><td>${t}</td><td>${fmt(r.counts[i+1])}</td><td>${money(fin.incomes[i])}</td></tr>`).join('')}</tbody><tfoot><tr><td colspan="3"><strong>總派彩（各獎項收入加埋）</strong></td><td><strong>${money(fin.payout)}</strong></td></tr></tfoot></table></div><p class="hint">收入 = 中獎注數 × 每全注派彩 × ${s/10}。淨收益 = 總派彩 − 投注成本；ROI = 淨收益 ÷ 投注成本 × 100%。每注收入四捨五入至仙。</p></details>`;
}
function error(id,e){$(id).replaceChildren();const el=document.createElement('p');el.className='error';el.setAttribute('role','alert');el.textContent=e.message;$(id).append(el);}
// 修改相關輸入即取消舊工作，清除舊結果，以免將舊數字誤當新結果。
function invalidate(id){jobs[id]=(jobs[id]||0)+1;delete saved[id];$(id).textContent='設定已更新，請重新計算。';}
async function calculate(id,tickets){const token=(jobs[id]||0)+1;jobs[id]=token;delete saved[id];
  try{prices();$(id).innerHTML='<p>正在逐注核對…</p><progress max="1" value="0"></progress>';
    const results=[];
    for(let i=0;i<tickets.length;i++){const t=tickets[i];const r=await M.enumerate(t.ticket,{cancelled:()=>jobs[id]!==token,progress:v=>{if(jobs[id]===token)$(id).querySelector('progress').value=(i+v)/tickets.length;}});results.push({...t,r});}
    if(jobs[id]!==token)return;saved[id]=results;display(id);
  }catch(e){if(jobs[id]===token)error(id,e);}
}
function display(id){try{$(id).innerHTML=saved[id].map(t=>{const html=render(t.r,t.ticket.p,t.s,t.title);return html;}).join('');}catch(e){error(id,e);}if(id.startsWith('compare-'))comparisonTable();}
$('prices').innerHTML=[8000000,0,0,9600,640,320,40].map((v,i)=>`<label>${M.names[i+1]} ($)${i<3?' <span class="badge">需自行輸入</span>':''}<input id="price-${i}" type="text" inputmode="decimal" value="${fmtInput(v)}"></label>`).join('');
$('prices').addEventListener('blur',e=>{if(e.target.tagName!=='INPUT')return;const n=parseMoneyInput(e.target.value);if(n!==null)e.target.value=fmtInput(n);},true);
comparisons();
$('prices').oninput=()=>{$('prices-error').textContent='';Object.keys(saved).forEach(display);comparisonTable();};
$('refresh-prices').onclick=()=>{try{prices();$('prices-error').textContent='';Object.keys(saved).forEach(display);comparisonTable();}catch(e){$('prices-error').textContent=e.message;}};
bindComparisonEditor();



