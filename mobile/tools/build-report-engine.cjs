const fs=require('node:fs');const path=require('node:path');const esbuild=require('esbuild');
const root=path.resolve(__dirname,'..');const web=path.resolve(root,'../frontend/student');
const data=(file,mime)=>`data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
(async()=>{
 const result=await esbuild.build({stdin:{contents:`import {Buffer} from 'buffer/';import {buildReportPdf} from './src/lib/reportPdf';globalThis.Buffer=Buffer;
const send=data=>window.ReactNativeWebView?window.ReactNativeWebView.postMessage(JSON.stringify(data)):parent.postMessage({channel:'labassist-report',...data},'*');
let working=false;async function receive(raw){let request;try{request=typeof raw==='string'?JSON.parse(raw):raw;if(request?.type!=='generate'||working)return;working=true;const result=await buildReportPdf(request.document.meta,request.document.sections);const reader=new FileReader();reader.onload=()=>{send({type:'result',id:request.id,data:String(reader.result),positions:result.positions,abstractPages:result.abstractPages});working=false};reader.onerror=()=>{working=false;send({type:'error',id:request.id,message:'Could not read generated PDF'})};reader.readAsDataURL(result.blob)}catch(error){working=false;send({type:'error',id:request?.id,message:error.message})}}
window.addEventListener('message',e=>receive(e.data));document.addEventListener('message',e=>receive(e.data));send({type:'ready'});`,resolveDir:web,loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',minify:true,jsx:'automatic',nodePaths:[path.join(web,'node_modules')],plugins:[{name:'report-assets',setup(build){
 build.onResolve({filter:/^@\/lib\/reports$/},()=>({path:path.join(root,'src/domain/finalReport.ts')}));
 build.onResolve({filter:/^@\/assets\/report-page-background.jpg$/},()=>({path:path.join(web,'src/assets/report-page-background.jpg')}));
 build.onLoad({filter:/reportPdf\.tsx$/},args=>({loader:'tsx',contents:fs.readFileSync(args.path,'utf8').replace('"/report-fonts/amiri-regular.ttf"',JSON.stringify(data(path.join(web,'public/report-fonts/amiri-regular.ttf'),'font/ttf'))).replace('"/report-fonts/amiri-bold.ttf"',JSON.stringify(data(path.join(web,'public/report-fonts/amiri-bold.ttf'),'font/ttf')))}));
 } }],loader:{'.jpg':'dataurl'},define:{'import.meta.url':'"https://report.labassist.local/renderer.js"','process.env.NODE_ENV':'"production"'}});
 const script=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
 fs.writeFileSync(path.join(root,'src/native/reports/reportEngine.generated.ts'),`// Generated from the existing web PDF renderer by tools/build-report-engine.cjs.\nexport const reportEngineHTML=${JSON.stringify('<!doctype html><html><head><meta charset="utf-8"></head><body><script>'+script+'</script></body></html>')};\n`);
 console.log('Bundled original A4 report renderer, university stationery and Arabic fonts.');
})().catch(e=>{console.error(e);process.exit(1)});
