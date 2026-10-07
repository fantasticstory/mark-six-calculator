/* 純計算核心：瀏覽器與 Node 測試共用，沒有網絡或資料庫。 */
(function (root) {
  'use strict';
  const names = ['沒有中獎', '頭獎', '二獎', '三獎', '四獎', '五獎', '六獎', '七獎'];
  function choose(n, k) {
    if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || n < k) return 0;
    k = Math.min(k, n - k); let v = 1;
    for (let i = 1; i <= k; i++) v = v * (n - k + i) / i;
    return Math.round(v);
  }
  function validate(p) {
    if (!['single','multiple','banker'].includes(p.type)) throw Error('請選擇投注類型。');
    if (![p.d,p.f].every(Number.isInteger)) throw Error('號碼數必須是整數。');
    if (p.type === 'banker' && (p.d < 1 || p.d > 5)) throw Error('膽數必須是 1 至 5。');
    if (p.type !== 'banker' && p.d !== 0) throw Error('單式／複式不設膽。');
    if (p.f < 6-p.d || p.d+p.f > 49) throw Error('總號碼須為 6 至 49 個，腳數須足夠組成每注 6 個號碼。');
    if (p.type === 'single' && p.f !== 6) throw Error('單式必須有 6 個號碼。');
    if (p.type === 'multiple' && p.f < 7) throw Error('複式至少選 7 個號碼；6 個請選單式。');
    return choose(p.f, 6-p.d);
  }
  function label(p) { return p.type==='banker' ? `${p.d}膽${p.f}腳` : p.type==='single' ? '6號碼單式' : `${p.f}號碼複式`; }
  function tier(m, s) { return m===6 ? 1 : m===5 ? (s?2:3) : m===4 ? (s?4:5) : m===3 ? (s?6:7) : 0; }
  function parse(text, title) {
    const tokens=text.trim().split(/[\s,，、;；]+/).filter(Boolean);
    if (tokens.some(t=>!/^\d{1,2}$/.test(t))) throw Error(`${title}：請用空格或逗號分隔 1 至 49 的整數。`);
    const a=tokens.map(Number);
    if(a.some(n=>n<1||n>49)||new Set(a).size!==a.length) throw Error(`${title}：號碼必須在 1 至 49 之間，而且不可重複。`);
    return a;
  }
  function actual(p,b,f,draw,extra) {
    validate(p);
    if(b.length!==p.d||f.length!==p.f) throw Error('輸入的膽／腳數目與方案不符。');
    const all=[...b,...f];
    if(all.some(n=>!Number.isInteger(n)||n<1||n>49)||new Set(all).size!==all.length) throw Error('膽與腳不可重複，且必須為 1 至 49 的整數。');
    if(draw.length!==6||new Set(draw).size!==6||draw.some(n=>!Number.isInteger(n)||n<1||n>49)||!Number.isInteger(extra)||extra<1||extra>49||draw.includes(extra)) throw Error('開彩結果須為 6 個不同正選及 1 個不重複的特別號（1 至 49）。');
    return {p,b,f,draw,extra};
  }
  function hypothetical(p,h) {
    validate(p); const {bd,ff,bs,fs}=h;
    if(![bd,ff].every(Number.isInteger)||bd<0||ff<0||bd>p.d||ff>p.f||bd+ff>6) throw Error('中正選的膽／腳不可超出所選數目，合共最多 6 個。');
    if((bs&&fs)||bd+Number(bs)>p.d||ff+Number(fs)>p.f) throw Error('只有 1 個特別號；它不可同時是正選，亦不可同時在膽及腳。');
    if(7-bd-ff-Number(bs)-Number(fs)>49-p.d-p.f) throw Error('其餘號碼不足以容納未選中的正選及特別號，這個開彩情境不可能發生。');
    const b=Array.from({length:p.d},(_,i)=>i+1), f=Array.from({length:p.f},(_,i)=>p.d+i+1);
    let next=p.d+p.f+1; const draw=[...b.slice(0,bd),...f.slice(0,ff)];
    while(draw.length<6) draw.push(next++);
    const extra=bs?b[bd]:fs?f[ff]:next;
    return actual(p,b,f,draw,extra);
  }
  // 逐注枚舉索引，不儲存全部組合；每 40,000 注讓出主執行緒，避免大型複式卡住介面。
  async function enumerate(ticket, options={}) {
    const {p,b,f,draw,extra}=ticket, total=validate(p), k=6-p.d;
    const hit=new Set(draw), base=b.reduce((s,n)=>s+Number(hit.has(n)),0), special=b.includes(extra);
    const fm=f.map(n=>Number(hit.has(n))), fs=f.map(n=>n===extra);
    const ix=Array.from({length:k},(_,i)=>i), counts=Array(8).fill(0); let done=0;
    while(true) {
      let m=base,s=special;
      for(let j=0;j<k;j++){m+=fm[ix[j]];s=s||fs[ix[j]];}
      counts[tier(m,s)]++; done++;
      let pos=k-1; while(pos>=0&&ix[pos]===f.length-k+pos) pos--;
      if(pos<0) break;
      ix[pos]++; for(let j=pos+1;j<k;j++) ix[j]=ix[j-1]+1;
      if(done%40000===0){
        if(options.cancelled?.()) throw Error('計算已取消。');
        options.progress?.(done/total);
        await new Promise(resolve=>setTimeout(resolve,0));
      }
    }
    if(counts.reduce((a,v)=>a+v,0)!==total) throw Error('組合總數核對失敗。');
    return {counts,total};
  }
  function finance(result,prices,stake) {
    if(![5,10].includes(stake)||prices.length!==7||prices.some(n=>!Number.isFinite(n)||n<0)) throw Error('派彩必須是非負數。');
    const incomes=prices.map((v,i)=>Math.round(v*100*stake/10)*result.counts[i+1]/100);
    const payout=incomes.reduce((a,v)=>a+v,0),cost=result.total*stake,net=payout-cost;
    return {incomes,payout,cost,net,roi:net/cost*100};
  }
  const api={names,choose,validate,label,tier,parse,actual,hypothetical,enumerate,finance};
  if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.MarkSix=api;
})(typeof globalThis!=='undefined'?globalThis:this);
