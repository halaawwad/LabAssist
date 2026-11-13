import type {Slide} from './presentations';

export const templates = [
 {id:'margin',name:'Quiet Margin',category:'Minimal',description:'Generous space, a small side rule and understated typography.'},
 {id:'editorial',name:'The Editorial',category:'Editorial',description:'Serif headlines, a magazine column and a numbered masthead.'},
 {id:'stripe',name:'Bold Statement',category:'Modern',description:'A confident vertical band and large, direct headlines.'},
 {id:'night',name:'After Hours',category:'Modern',description:'A dark stage, a floating panel and light typography.'},
 {id:'arch',name:'Open Window',category:'Creative',description:'An architectural arch beside a calm, rounded composition.'},
 {id:'gallery',name:'Gallery Wall',category:'Photo',description:'A framed image, a gallery label and a quiet caption rail.'},
 {id:'split',name:'Two Sides',category:'Minimal',description:'Two equal fields for the idea and the visual.'},
 {id:'outline',name:'Fine Frame',category:'Formal',description:'A fine inset frame, centered heading and a balanced story.'},
 {id:'cards',name:'Component Bench',category:'Electronics',description:'Stacked circuit modules, component pins and a bench-style story card.'},
 {id:'notebook',name:'Field Notes',category:'Editorial',description:'Ruled paper, a margin line and a notebook heading.'},
 {id:'circuit',name:'Circuit Board',category:'Electronics',description:'A technical grid, pin details and connected signal paths.'},
 {id:'swiss',name:'Breadboard Lab',category:'Electronics',description:'Breadboard power rails, a matrix of sockets and a clean experiment layout.'},
 {id:'timeline',name:'Signal Path',category:'Electronics',description:'Connected test points and signal blocks trace the path through your project.'},
 {id:'spotlight',name:'In the Spotlight',category:'Creative',description:'A large circular spotlight and a compact title column.'},
 {id:'academic',name:'Thesis Hall',category:'Formal',description:'A university-style title band, serif text and formal rules.'},
 {id:'dashboard',name:'Scope Studio',category:'Electronics',description:'An oscilloscope-style signal strip and framed measurement panels.'},
 {id:'mosaic',name:'Mosaic Studio',category:'Photo',description:'An asymmetric tile arrangement with a featured image.'},
 {id:'ribbon',name:'The Bookmark',category:'Formal',description:'A tall bookmark tab and a classic reading layout.'},
 {id:'type',name:'Type First',category:'Editorial',description:'Oversized typography, a narrow story column and a small visual.'},
 {id:'horizon',name:'New Horizon',category:'Minimal',description:'A sweeping lower field and a panoramic visual strip.'},
] as const;
export type TemplateId=typeof templates[number]['id'];
export type Palette={ink:string;accent:string;soft:string;paper:string;secondary:string};
export type Box={x:number;y:number;w:number;h:number};
export type Shape=Box&{kind:'rect'|'ellipse';fill:string;stroke?:string;radius?:number};
export type TextItem=Box&{text:string;size:number;color:string;bold?:boolean;font:'Arial'|'Georgia'|'Courier New';align?:'left'|'center'|'right';role:string};
export type Composition={background:string;shapes:Shape[];texts:TextItem[];image:Box;imageRadius:number};

/** Shared 960×540 drawing model for editor, player, PDF and editable PowerPoint. */
export function composeSlide(template:string|undefined,s:Slide,p:Palette,index=0,total=1,project=''):Composition{
 const id=templates.some(t=>t.id===template)?template:'circuit',dark=id==='night';
 const ink=dark?p.paper:p.ink,paper=dark?p.ink:p.paper;
 const c:Composition={background:paper,shapes:[],texts:[],image:{x:610,y:180,w:280,h:230},imageRadius:0};
 const rect=(x:number,y:number,w:number,h:number,fill:string,radius=0,stroke?:string)=>c.shapes.push({kind:'rect',x,y,w,h,fill,radius,...(stroke?{stroke}:{})});
 const circle=(x:number,y:number,w:number,fill:string,stroke?:string)=>c.shapes.push({kind:'ellipse',x,y,w,h:w,fill,...(stroke?{stroke}:{})});
 const line=(x:number,y:number,w:number,color=p.accent)=>rect(x,y,w,2,color);
 let title:Box={x:60,y:115,w:510,h:125},body:Box={x:60,y:270,w:510,h:190},kicker:Box={x:60,y:55,w:800,h:25};
 let size=46,font:TextItem['font']='Arial',align:TextItem['align']='left';
 switch(id){
 case 'margin': rect(35,52,4,410,p.accent);title={x:70,y:120,w:540,h:135};body={x:72,y:290,w:500,h:165};c.image={x:640,y:170,w:255,h:250};break;
 case 'editorial':font='Georgia';line(48,85,864);rect(603,115,1,350,p.accent);title={x:48,y:122,w:520,h:150};body={x:50,y:300,w:500,h:165};c.image={x:636,y:124,w:275,h:295};break;
 case 'stripe':rect(0,0,105,540,p.accent);rect(105,0,855,12,p.accent);kicker={x:145,y:50,w:740,h:25};title={x:145,y:112,w:440,h:155};body={x:148,y:300,w:430,h:160};c.image={x:625,y:145,w:285,h:280};size=49;break;
 case 'night':rect(595,60,310,410,p.accent,24);rect(612,78,276,374,p.ink,18);title={x:55,y:125,w:490,h:145};body={x:58,y:300,w:480,h:150};c.image={x:630,y:140,w:240,h:250};circle(840,30,18,p.paper);break;
 case 'arch':rect(600,160,300,310,p.soft);circle(600,12,300,p.soft);circle(875,70,20,p.accent);title={x:60,y:132,w:475,h:130};body={x:62,y:290,w:460,h:165};c.image={x:625,y:150,w:250,h:275};c.imageRadius=110;break;
 case 'gallery':rect(530,65,380,385,p.soft);rect(546,81,348,353,paper);title={x:50,y:160,w:425,h:130};body={x:52,y:320,w:420,h:140};kicker={x:50,y:106,w:440,h:24};c.image={x:565,y:100,w:310,h:300};line(565,417,120);font='Georgia';size=41;break;
 case 'split':rect(480,0,480,540,p.soft);title={x:45,y:120,w:390,h:145};body={x:48,y:295,w:390,h:165};c.image={x:525,y:120,w:390,h:300};kicker={x:45,y:55,w:400,h:25};break;
 case 'outline':rect(25,25,910,490,paper,0,p.accent);line(350,85,260);kicker={x:100,y:54,w:760,h:25};title={x:85,y:110,w:790,h:100};body={x:95,y:270,w:s.image?420:770,h:190};c.image={x:565,y:240,w:300,h:220};align='center';font='Georgia';break;
 case 'cards':rect(535,90,350,340,p.soft,12);rect(553,109,350,340,p.accent,12);rect(569,125,320,305,paper,10);rect(35,245,480,235,p.soft,18);title={x:55,y:110,w:440,h:115};body={x:58,y:272,w:430,h:175};c.image={x:590,y:147,w:277,h:258};size=43;break;
 case 'notebook':for(let y=110;y<500;y+=28)line(30,y,900,p.soft);rect(76,25,2,475,p.accent);[75,185,295,405].forEach(y=>circle(25,y,13,p.soft));font='Courier New';kicker={x:104,y:46,w:790,h:25};title={x:104,y:120,w:475,h:130};body={x:105,y:280,w:460,h:175};c.image={x:620,y:155,w:270,h:260};size=39;break;
 case 'circuit':for(let x=30;x<960;x+=40)rect(x,0,1,540,p.soft);for(let y=20;y<540;y+=40)line(0,y,960,p.soft);rect(625,150,260,260,paper,20,p.accent);for(let i=0;i<5;i++){rect(608,177+i*42,17,6,p.accent);rect(885,177+i*42,17,6,p.accent);}line(560,150,47);rect(558,150,2,125,p.accent);circle(552,270,14,p.accent);c.image={x:645,y:170,w:220,h:220};title={x:55,y:115,w:470,h:135};body={x:58,y:290,w:455,h:165};font='Courier New';size=40;break;
 case 'swiss':rect(580,55,335,415,p.soft,18);line(600,76,295);line(600,448,295);for(let col=0;col<14;col++)for(let row=0;row<4;row++){circle(604+col*21,92+row*13,3,p.accent);circle(604+col*21,380+row*13,3,p.accent);}rect(738,138,2,230,paper);title={x:45,y:125,w:480,h:140};body={x:48,y:295,w:475,h:160};c.image={x:605,y:160,w:285,h:205};break;
 case 'timeline':rect(55,115,3,310,p.accent);[140,270,400].forEach((y,i)=>{circle(42,y,28,p.accent);c.texts.push({x:42,y:y+4,w:28,h:22,text:String(i+1),size:15,color:p.paper,font:'Arial',align:'center',role:'stop'});});title={x:105,y:112,w:440,h:135};body={x:108,y:285,w:420,h:165};rect(595,95,310,365,p.soft,20);c.image={x:620,y:125,w:260,h:300};kicker={x:105,y:52,w:780,h:24};break;
 case 'spotlight':circle(540,42,440,p.soft);circle(590,92,340,paper);circle(855,415,38,p.accent);title={x:48,y:135,w:440,h:140};body={x:50,y:305,w:425,h:155};c.image={x:620,y:140,w:280,h:250};c.imageRadius=140;break;
 case 'academic':rect(0,0,960,85,p.accent);kicker={x:48,y:30,w:864,h:28};font='Georgia';title={x:55,y:125,w:840,h:95};line(55,235,850);body={x:58,y:270,w:s.image?480:830,h:190};c.image={x:590,y:270,w:300,h:190};size=38;break;
 case 'dashboard':rect(0,0,960,95,p.soft);rect(40,255,510,220,p.soft,14);rect(575,125,345,350,p.soft,14);kicker={x:42,y:38,w:870,h:25};title={x:42,y:130,w:500,h:100};body={x:62,y:280,w:470,h:165};c.image={x:598,y:150,w:300,h:270};size=37;break;
 case 'mosaic':rect(0,0,25,540,p.accent);rect(585,0,375,385,p.soft);rect(585,400,230,140,p.accent);rect(830,400,130,140,p.soft);title={x:65,y:125,w:470,h:140};body={x:68,y:295,w:450,h:160};c.image={x:610,y:60,w:325,h:290};break;
 case 'ribbon':rect(55,0,65,155,p.accent);rect(60,155,55,15,p.soft);kicker={x:150,y:55,w:730,h:25};title={x:150,y:130,w:690,h:115};body={x:150,y:285,w:s.image?420:680,h:180};c.image={x:615,y:275,w:275,h:190};font='Georgia';size=43;break;
 case 'type':title={x:42,y:108,w:550,h:235};body={x:635,y:130,w:275,h:180};c.image={x:640,y:335,w:265,h:130};line(42,400,540);size=66;break;
 case 'horizon':rect(0,350,960,190,p.soft);line(45,330,870);title={x:45,y:115,w:820,h:120};body={x:48,y:365,w:s.image?460:850,h:122};c.image={x:570,y:355,w:340,h:132};size=48;break;
 }
 if(id==='cards'){for(let i=0;i<6;i++){rect(540,148+i*41,28,5,p.accent);rect(888,148+i*41,28,5,p.accent);}for(let i=0;i<5;i++)circle(50+i*20,228,5,p.accent);}
 if(id==='timeline'){[140,270,400].forEach(y=>{line(70,y+14,25);rect(89,y+8,15,14,p.soft,0,p.accent);});}
 if(id==='dashboard'){for(let x=605;x<895;x+=20)rect(x,375,1,70,p.accent);for(let y=375;y<450;y+=15)line(600,y,295,p.accent);for(let i=0;i<28;i++){const y=410-Math.sin(i*.6)*22;rect(604+i*10,y,10,2,paper);}c.image.h=205;}
 // Content types remain separate from the design: five layouts for every template.
 if(s.layout==='closing'&&['margin','editorial','stripe','arch','spotlight'].includes(id!)){title.y+=15;size+=3;}
 const fit=(text:string,b:Box,start:number,min:number)=>{let f=start;while(f>min){const capacity=Math.max(1,Math.floor(b.w/(f*.55)));const lines=text.split('\n').reduce((n,l)=>n+Math.max(1,Math.ceil(l.length/capacity)),0);if(lines*f*1.3<=b.h)break;f--;}return f;};
 const text=(role:string,value:string,b:Box,start:number,color:string,bold=false,min=11)=>c.texts.push({...b,text:value,size:fit(value,b,start,min),color,bold,font,align,role});
 text('kicker',s.kicker,kicker,12,id==='academic'||dark?p.paper:p.accent,false,10);
 text('title',s.title||'Your slide title.',title,size,ink,true,22);
 text('body',s.body.split('\n').filter(Boolean).map(l=>s.layout==='bullets'?`• ${l}`:l).join('\n'),body,22,ink,false,10);
 text('footer',project||'PRESENTATION STUDIO',{x:45,y:508,w:790,h:18},9,dark?p.paper:p.accent,false,8);
 text('page',`${String(index+1).padStart(2,'0')} / ${String(total).padStart(2,'0')}`,{x:850,y:508,w:65,h:18},9,dark?p.paper:p.accent,false,8);
 if(s.image&&s.caption)text('caption',s.caption,{x:c.image.x,y:c.image.y+c.image.h+5,w:c.image.w,h:23},10,dark?p.paper:p.accent,false,8);
 return c;
}
