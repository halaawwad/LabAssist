import { CATALOG_MAP } from "./catalog";
import { WIRE_TYPES, type CircuitData, type PinRef, type WireType } from "./types";
export type ConnectorKind="socket"|"header"|"terminal"|"solder"|"unknown";
const maleHeaders=new Set(["arduino-nano","esp32","esp8266","raspberry-pi-4","hc-sr04","pir","mpu6050","bmp280","ir-obstacle","flame","mq2","soil","water-level","ldr","lcd-i2c","lcd-1602","oled","uln2003","esp8266-module","rfid-rc522","hc05","nrf24l01"]);
const solderLeads=new Set(["dht11","dht22","ldr-bare","lm35","push-button","dc-motor","buzzer","seven-seg","led-red","led-green","led-rgb","resistor-220","resistor-10k","resistor-variable","potentiometer","water-pump"]);
/** Physical interfaces of the variants represented by the lab models, not every retail variant. */
export function connectorFor(type:string,pin:number):ConnectorKind{
 const def=CATALOG_MAP[type],name=def?.pins[pin]?.name;if(!name)return "unknown";
 if(["arduino-uno","arduino-mega","breadboard","breadboard-400","sg90","mg995","stepper"].includes(type))return "socket";
 if(["power-source","power-switch","xl4015","s-60-12","tb6600"].includes(type))return "terminal";
 if(type==="l298n")return /^OUT/.test(name)||["VS","GND","5V_LOGIC"].includes(name)?"terminal":"header";
 if(type.startsWith("relay"))return /^(COM|NO|NC)\d*$/.test(name)?"terminal":"header";
 if(maleHeaders.has(type))return "header";
 if(solderLeads.has(type))return "solder";
 return "unknown";
}
export const connectorLabels:Record<ConnectorKind,string>={socket:"female socket",header:"male header pin",terminal:"wire terminal",solder:"bare lead / solder contact",unknown:"unverified connector"};
type CableEnd="male"|"female"|"stripped";
const ends:Record<WireType,[CableEnd,CableEnd]>={"jumper-mm":["male","male"],"jumper-mf":["male","female"],"jumper-fm":["female","male"],"jumper-ff":["female","female"],power:["stripped","stripped"]};
const fits=(connector:ConnectorKind,end:CableEnd)=>connector==="socket"?end==="male":connector==="header"?end==="female":connector==="terminal"||connector==="solder"?end==="stripped":false;
export type WireFit={ok:boolean;title:string;message:string;from:string;to:string;suggested?:WireType;arabic?:{title:string;message:string}};
export type AssistantLanguage="ar"|"en"|"mixed";
export function translatedWireFit(notice:WireFit,language:AssistantLanguage){
 if(language==="en")return notice;
 const mixed=language==="mixed";
 const term=(arabic:string,english:string)=>mixed?`${arabic} (${english})`:arabic;
 const translate=(text:string)=>text.replace(/female socket/g,term("مدخل أنثى","Female socket")).replace(/male header pin/g,term("دبوس ذكر","Male header")).replace(/wire terminal/g,term("طرف تثبيت سلك","Terminal")).replace(/bare lead \/ solder contact/g,term("طرف مكشوف يحتاج لحام","Solder contact")).replace(/unverified connector/g,"مدخل غير محدد");
 const from=translate(notice.from),to=translate(notice.to);
 if(notice.arabic)return {...notice,title:notice.arabic.title,message:language==="mixed"?`${notice.arabic.message} (${notice.title})`:notice.arabic.message,from,to};
 let title="هذا السلك لا يناسب المدخل",message="";
 if(notice.title==="Connector needs checking"){
  title="نوع المدخل غير محدد";message="لا توجد بيانات كافية عن مدخل هذه القطعة، لذلك مُنعت التوصيلة.";
 }else if(notice.title==="DC cable on an AC terminal"){
  title="سلك تيار مستمر على مدخل تيار متردد";message=`سلك ${term("التيار المستمر","DC")} لا يناسب مدخل ${term("التيار المتردد","AC")} في مزوّد الطاقة. مُنعت التوصيلة.`;
 }else if(notice.ok){
  title="أطراف السلك مناسبة";message=notice.message.includes("soldered")?`هذه التوصيلة تمثّل نقطة ${term("لحام","Solder joint")} على دبوس أو نقطة معدنية مكشوفة، وليس داخل فتحة مدخل أنثى. تأكّد أيضًا من توافق الجهد والتوصيل الكهربائي.`:"طرفا السلك مناسبان لنوع المدخلين في النموذج.";
 }else{
  const first=notice.message.startsWith("The first"),source=first?from:to;
  const end=notice.message.includes("is female,")?term("أنثى","Female"):notice.message.includes("is male,")?term("ذكر","Male"):term("مكشوف","Stripped");
  message=`طرف السلك ${first?"الأول":"الثاني"} ${end} ولا يناسب ${source}. ${notice.suggested?"اختَر السلك المقترح ثم أعد التوصيل.":`تحتاج محوّلًا مناسبًا أو توصيلًا عبر ${term("لوحة التجارب","Breadboard")}؛ هذا السلك لا يربط المدخلين مباشرة.`}`;
 }
 return {...notice,title,message,from,to};
}
export function translatedWireName(type:WireType,language:AssistantLanguage){
 if(language==="en")return WIRE_TYPES.find(wire=>wire.value===type)?.label||type;
 const label=type==="power"?"سلك طاقة":({"jumper-mm":"ذكر — ذكر","jumper-mf":"ذكر — أنثى","jumper-fm":"أنثى — ذكر","jumper-ff":"أنثى — أنثى"})[type];
 return language==="mixed"?`${label} (${type==="power"?"DC power":type.replace("jumper-","").toUpperCase()})`:label;
}
export function checkWireFit(data:CircuitData,from:PinRef,to:PinRef,type:WireType):WireFit{
 const a=data.parts.find(part=>part.id===from.partId),b=data.parts.find(part=>part.id===to.partId),aDef=a&&CATALOG_MAP[a.type],bDef=b&&CATALOG_MAP[b.type];
 const aPin=aDef?.pins[from.pin],bPin=bDef?.pins[to.pin];
 const aKind=a?connectorFor(a.type,from.pin):"unknown",bKind=b?connectorFor(b.type,to.pin):"unknown";
 const aLabel=`${aDef?.name||"Part"} · ${aPin?.name||"Unknown pin"} (${connectorLabels[aKind]})`,bLabel=`${bDef?.name||"Part"} · ${bPin?.name||"Unknown pin"} (${connectorLabels[bKind]})`;
 const base={from:aLabel,to:bLabel};
 if(!aPin||!bPin||aKind==="unknown"||bKind==="unknown")return {...base,ok:false,title:"Connector needs checking",message:"This connector is not defined for the modeled part. The connection was not added."};
 if(type==="power"&&((a?.type==="s-60-12"&&["L","N","PE"].includes(aPin.name))||(b?.type==="s-60-12"&&["L","N","PE"].includes(bPin.name))))return {...base,ok:false,title:"DC cable on an AC terminal",message:"The lab’s DC power wire is not supported on the supply’s AC input terminals. No connection was added."};
 if(type==="power")return {...base,ok:true,title:"Connector fit checked",message:aKind==="terminal"&&bKind==="terminal"?"The stripped cable ends fit the wire terminals.":"This connection represents a soldered joint; solder to an exposed conductive pin or pad, not inside a female socket. Electrical compatibility must still be checked."};
 if(fits(aKind,ends[type][0])&&fits(bKind,ends[type][1]))return {...base,ok:true,title:"Connector fit checked",message:aKind==="solder"||bKind==="solder"?"This connection represents a soldered joint; the bare leads must be soldered in a physical build.":"The cable ends match the modeled connectors."};
 const suggested=WIRE_TYPES.find(wire=>fits(aKind,ends[wire.value][0])&&fits(bKind,ends[wire.value][1]))?.value;
 const mismatch=!fits(aKind,ends[type][0])?`The first end is ${ends[type][0]}, but ${aLabel} needs ${aKind==="socket"?"a male plug":aKind==="header"?"a female plug":"a stripped wire"}.`:`The second end is ${ends[type][1]}, but ${bLabel} needs ${bKind==="socket"?"a male plug":bKind==="header"?"a female plug":"a stripped wire"}.`;
 return {...base,ok:false,title:"This wire does not fit",message:`${mismatch} ${suggested?"Choose the suggested cable and try again.":"Use an appropriate adapter or breadboard connection; one cable cannot directly join these ends."}`,...(suggested?{suggested}:{})};
}
