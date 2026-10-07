// 把已驗證的本機資產合併成單一 HTML，方便直接開啟及傳送。
const fs=require('node:fs');
let html=fs.readFileSync('dist/index.html','utf8');
html=html.replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+fs.readFileSync('dist/style.css','utf8')+'</style>');
for(const name of ['engine.js','comparison.js','app.js'])html=html.replace(`<script src="${name}"></script>`,()=>'<script>'+fs.readFileSync('dist/'+name,'utf8')+'</script>');
fs.writeFileSync('六合彩計算器.html',html);
console.log('Built standalone HTML.');
