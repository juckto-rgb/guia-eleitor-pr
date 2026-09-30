const http=require('http'),fs=require('fs');
const F='C:/Users/juckt/AppData/Local/Temp/claude/C--Users-juckt-OneDrive--rea-de-Trabalho-Claude-Sorttie/3d9b50f0-cf0a-459e-8e5a-0c718cd4adec/scratchpad/guia-eleitor-pr.html';
const port=process.env.PORT||8899;
http.createServer((rq,rs)=>{try{rs.setHeader('Content-Type','text/html; charset=utf-8');rs.end(fs.readFileSync(F));}catch(e){rs.statusCode=500;rs.end('ERR '+e.message);}}).listen(port,()=>console.log('up on '+port));
