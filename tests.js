/* 執行：node tests.js。使用獨立分組組合公式交叉核對逐注枚舉引擎。 */
const assert=require('node:assert/strict');const M=require('./dist/engine.js');
let checks=0;function eq(a,b){assert.deepEqual(a,b);checks++;}function bad(fn){assert.throws(fn);checks++;}
const p=(d,f)=>({type:d?'banker':f===6?'single':'multiple',d,f});
async function run(){
 for(const [d,f,n] of [[1,8,56],[1,9,126],[1,10,252],[3,8,56],[3,15,455],[5,22,22],[0,11,462]]){eq(M.validate(p(d,f)),n);const r=await M.enumerate(M.hypothetical(p(d,f),{bd:0,ff:0,bs:false,fs:false}));eq(r.total,n);eq(r.counts.reduce((a,b)=>a+b),n);}
 const example=await M.enumerate(M.hypothetical(p(1,10),{bd:1,ff:5,bs:false,fs:true}));eq(example.counts,[26,1,5,20,40,60,60,40]);
 const wrong=await M.enumerate(M.hypothetical(p(1,10),{bd:0,ff:6,bs:false,fs:false}));eq(wrong.counts[1],0);eq(wrong.counts[3],6);
 const five=await M.enumerate(M.hypothetical(p(5,22),{bd:3,ff:3,bs:false,fs:false}));eq(five.counts[1],0);eq(five.counts[5],3);eq(five.counts[7],19);
 const real=await M.enumerate(M.actual(p(3,8),[5,14,21],[1,3,7,10,18,25,31,38],[5,7,14,18,31,38],21));eq(real.counts,[4,0,4,0,24,0,24,0]);
 // 窮盡小型票的所有可行中獎分佈，以獨立超幾何公式驗證每一獎項。
 for(let d=0;d<=5;d++)for(let f=Math.max(6-d,d?0:6);f<=10;f++)for(let bd=0;bd<=d;bd++)for(let ff=0;ff<=Math.min(f,6-bd);ff++)for(let sp=0;sp<3;sp++){
  const bs=sp===1,fs=sp===2;if(bd+bs>d||ff+fs>f)continue;
  const h={bd,ff,bs,fs},expected=Array(8).fill(0),k=6-d,miss=f-ff-Number(fs);
  for(let m=0;m<=ff;m++)for(let s=0;s<=Number(fs);s++){const ways=M.choose(ff,m)*M.choose(Number(fs),s)*M.choose(miss,k-m-s);expected[M.tier(bd+m,bs||Boolean(s))]+=ways;}
  const r=await M.enumerate(M.hypothetical(p(d,f),h));eq(r.counts,expected);
 }
 eq(M.choose(49,6),13983816);eq(M.validate(p(0,49)),13983816);
 const largest=await M.enumerate(M.hypothetical(p(0,49),{bd:0,ff:6,bs:false,fs:true}));
 eq(largest.total,13983816);eq(largest.counts[1],1);eq(largest.counts[2],6);eq(largest.counts[3],252);eq(largest.counts.reduce((a,b)=>a+b),13983816);
 await assert.rejects(()=>M.enumerate(M.hypothetical(p(0,49),{bd:0,ff:6,bs:false,fs:true}),{cancelled:()=>true}),/取消/);checks++;
 for(const [m,s,t]of [[6,false,1],[5,true,2],[5,false,3],[4,true,4],[4,false,5],[3,true,6],[3,false,7],[2,true,0]])eq(M.tier(m,s),t);
 const prices=[8000000,100000,20000,9600,640,320,40],full=M.finance(example,prices,10),half=M.finance(example,prices,5);eq(half.cost,full.cost/2);eq(half.payout,full.payout/2);eq(half.roi,full.roi);
 const roi=M.finance({total:56,counts:[25,0,0,0,0,0,0,31]},[0,0,0,9600,640,320,40],10);eq(roi.net,680);eq(roi.roi.toFixed(2),'121.43');
 bad(()=>M.validate(p(5,45)));bad(()=>M.validate(p(1,4)));bad(()=>M.validate(p(1.5,8)));bad(()=>M.parse('1、1','號碼'));bad(()=>M.parse('50','號碼'));bad(()=>M.parse('1e1','號碼'));
 bad(()=>M.hypothetical(p(1,8),{bd:1,ff:3,bs:true,fs:false}));bad(()=>M.hypothetical(p(3,8),{bd:1,ff:3,bs:true,fs:true}));bad(()=>M.hypothetical(p(0,49),{bd:0,ff:5,bs:false,fs:true}));
 bad(()=>M.actual(p(1,5),[1],[1,2,3,4,5],[1,2,3,4,5,6],7));bad(()=>M.actual(p(0,6),[],[1,2,3,4,5,6],[1,2,3,4,5,6],6));
 eq(M.parse('01、2，3 4;5；6','號碼'),[1,2,3,4,5,6]);
 console.log(`PASS: ${checks} checks, including exhaustive scenario cross-checks.`);
}
run().catch(e=>{console.error(e);process.exitCode=1;});
