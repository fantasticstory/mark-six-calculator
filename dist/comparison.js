/* 每張比較卡獨立保留投注設定與中獎情境；沿用逐注枚舉引擎。 */
const comparisonStates = new Map();
const comparisonTimers = new Map();
function comparisonState(i) {
  if (!comparisonStates.has(i)) {
    const p=plans[i],bd=Math.min(p.d,1);
    comparisonStates.set(i,{bd,ff:4-bd,bs:false,fs:false,amount:10});
  }
  return comparisonStates.get(i);
}
function comparisonTable() {
  $('comparison').innerHTML=[...selected].map(i=>{
    const p=plans[i],h=comparisonState(i);
    try { M.validate(p); } catch { return `<tr><td>方案 ${i+1}</td><td colspan="3">請修正呢個方案</td></tr>`; }
    const r=saved['compare-'+i]?.[0]?.r; let fin;
    try { if(r) fin=M.finance(r,prices(),h.amount); } catch {}
    return `<tr><td>${M.label(p)}</td><td>${fin?money(fin.cost):'計算中'}</td><td>${fin?money(fin.payout):'計算中'}</td><td>${fin?(fin.net>=0?'+':'−')+money(Math.abs(fin.net)):'—'}</td></tr>`;
  }).join('')||'<tr><td colspan="4">請新增方案，或勾選一個快捷方案。</td></tr>';
}
function renderComparisonEditor() {
  // 重建卡片前，取消未完成的枚舉及延遲工作。
  for(const [i,timer] of comparisonTimers){clearTimeout(timer);comparisonTimers.delete(i);}
  for(const key of Object.keys(jobs)) if(key.startsWith('compare-')) {jobs[key]++;delete saved[key];}
  $('choices').innerHTML=plans.map((p,i)=>`<label><input type="checkbox" data-plan="${i}" ${selected.has(i)?'checked':''}>${M.label(p)}</label>`).join('');
  $('comparison-cards').innerHTML=[...selected].map(i=>{
    const p=plans[i],h=comparisonState(i);
    return `<article class="comparison-card" data-card="${i}"><div class="section-title"><h3 id="card-title-${i}">${M.label(p)}</h3><button type="button" data-remove="${i}" aria-label="移除方案 ${i+1}">移除</button></div><div class="fields"><label>玩法<select id="card-type-${i}" data-setting="type"><option value="banker" ${p.type==='banker'?'selected':''}>膽拖</option><option value="multiple" ${p.type==='multiple'?'selected':''}>複式</option><option value="single" ${p.type==='single'?'selected':''}>單式</option></select></label><label>注額<select id="card-stake-${i}" data-setting="stake"><option value="10" ${h.amount===10?'selected':''}>全注 $10</option><option value="5" ${h.amount===5?'selected':''}>半注 $5</option></select></label><label>膽數<select id="card-d-${i}" data-setting="d">${[1,2,3,4,5].map(d=>`<option value="${d}" ${d===p.d?'selected':''}>${d} 膽</option>`).join('')}</select></label><label>腳／號碼數<input id="card-f-${i}" data-setting="f" type="number" step="1" value="${p.f}"></label></div><p id="card-cost-${i}" class="hint"></p><div class="card-hits"><h4>假設這張飛中了……</h4>${controls('card-'+i,h.bd,h.ff,h.bs,h.fs)}</div><div id="compare-${i}" class="result" aria-live="polite"></div></article>`;
  }).join('');
  for(const i of selected){updateComparisonCard(i);queueComparison(i);}
  comparisonTable();
}
function updateComparisonCard(i) {
  const p=plans[i],h=comparisonState(i),single=p.type==='single';
  $('card-d-'+i).disabled=p.type!=='banker';$('card-f-'+i).disabled=single;
  $('card-f-'+i).min=p.type==='multiple'?7:6-p.d;$('card-f-'+i).max=49-p.d;
  $('card-stake-'+i).options[1].disabled=single;
  if(single){h.amount=10;$('card-stake-'+i).value='10';}
  bounds('card-'+i,p);
  $('card-title-'+i).textContent=M.label(p);
  try{const n=M.validate(p);$('card-cost-'+i).textContent=`${p.d+p.f} 個號碼 · 每注 ${structure(p)} · ${fmt(n)} 注 · 成本 ${money(n*h.amount)}`;}
  catch(e){$('card-cost-'+i).textContent=e.message;}
}
function queueComparison(i) {
  const id='compare-'+i;
  clearTimeout(comparisonTimers.get(i));invalidate(id);comparisonTable();
  comparisonTimers.set(i,setTimeout(()=>{
    comparisonTimers.delete(i);
    if(!selected.has(i))return;
    try{const p={...plans[i]},h=hits('card-'+i);Object.assign(comparisonState(i),h);calculate(id,[{ticket:M.hypothetical(p,h),s:comparisonState(i).amount}]);}
    catch(e){error(id,e);comparisonTable();}
  },250));
}
function bindComparisonEditor() {
  $('new-comparison').onclick=()=>{const i=plans.length;plans.push({type:'banker',d:2,f:8});selected.add(i);comparisons();};
  $('comparison-cards').addEventListener('input',e=>{
    const card=e.target.closest('[data-card]');if(!card)return;
    const i=Number(card.dataset.card),p=plans[i],h=comparisonState(i);
    const type=$('card-type-'+i).value;
    p.type=type;p.d=type==='banker'?Number($('card-d-'+i).value):0;
    if(e.target.dataset.setting==='type'){
      if(type==='single')$('card-f-'+i).value=6;
      else if(type==='multiple'&&Number($('card-f-'+i).value)<7)$('card-f-'+i).value=7;
    }
    p.f=Number($('card-f-'+i).value);h.amount=Number($('card-stake-'+i).value);
    // 不重建正在輸入的欄位，保留焦點；空白及不可能的情境交由驗證處理。
    updateComparisonCard(i);
    try{Object.assign(h,hits('card-'+i));}catch{}
    queueComparison(i);
  });
  $('comparison-cards').addEventListener('click',e=>{
    const button=e.target.closest('[data-remove]');if(!button)return;
    selected.delete(Number(button.dataset.remove));comparisons();
  });
}
