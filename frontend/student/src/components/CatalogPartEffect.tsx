import { catalogPartDemos, type PartDemoKind } from "@/lib/catalogPartDemos";

const paths:Partial<Record<PartDemoKind,string>>={
 board:"M20 90H68V38H145V128H225",distance:"M80 50Q130 80 80 110M110 30Q180 80 110 130M150 15Q230 80 150 145",
 wifi:"M35 70Q125-10 215 70M65 95Q125 40 185 95M95 120Q125 90 155 120",
 climate:"M55 28V98a19 19 0 1 0 26 0V28a13 13 0 0 0-26 0ZM165 35Q128 85 145 105Q165 127 185 105Q202 85 165 35Z",
 temperature:"M102 20V103a22 22 0 1 0 28 0V20a14 14 0 0 0-28 0ZM140 40H155M140 60H155M140 80H155",
 light:"M74 23V13M74 97V107M37 60H27M111 60H121M100 86L108 94M48 34L40 26M100 34L108 26M48 86L40 94",
 motion:"M25 135Q125-30 225 135M50 135Q125 10 200 135M80 135Q125 50 170 135",
 axes:"M125 80H205M125 80V15M125 80L62 128",pressure:"M40 120A85 85 0 0 1 210 120",
 beam:"M25 110L190 50L55 135M200 20V125",flame:"M130 25C145 62 188 69 167 116C145 155 85 140 89 102C90 76 119 73 109 49C124 62 128 49 130 25Z",
 gas:"M25 135H225",soil:"M30 55H220V140H30Z",level:"M70 20V140H180V20M187 40H200M187 65H200M187 90H200M187 115H200",
 sound:"M100 50Q55 80 100 110M150 50Q195 80 150 110M77 30Q3 80 77 130M173 30Q247 80 173 130",
 relay:"M25 100H92M163 100H225",button:"M25 100H92M163 100H225",display:"M50 30H200V130H50Z",
 segments:"M95 25H155M95 80H155M95 135H155M90 30V73M160 30V73M90 87V130M160 87V130",
 resistor:"M15 80H55L67 59L80 101L93 59L106 101L119 59L132 101L145 59L158 101L171 80H235",
 driver:"M25 40H225M25 67H225M25 94H225M25 121H225",rfid:"M70 60H185V140H70Z",
 bluetooth:"M123 22V138L161 105L89 55M89 105L161 55L123 22",radio:"M40 80H210",
 pump:"M15 130H65V45H180V130H235",
};
function Graphic({kind,variant}:{kind:PartDemoKind;variant:number}){
 return <>
 {paths[kind]&&<path className={`part-symbol symbol-${kind}`} d={paths[kind]}/>}
 {["board","resistor","driver","pump","beam","radio"].includes(kind)&&<path className={`part-running-line ${variant===1?"part-slow-signal":""}`} d={paths[kind]}/>}
 {kind==="board"&&[0,1,2,3,4].slice(0,variant===1?3:5).map(i=><circle key={i} className="part-sequence" style={{animationDelay:`${i*.3}s`}} cx={45+i*38} cy={i%2?38:128} r="5"/>)}
 {["temperature","climate"].includes(kind)&&<path className="part-thermo-fill" d={kind==="climate"?"M68 55V115":"M116 48V120"}/>}
 {kind==="climate"&&<path className="part-running-line" d={variant?"M105 137Q125 112 145 137T185 137T225 137":"M145 92Q165 112 185 92"}/>}
 {kind==="light"&&<><circle className="part-light-rays" cx="74" cy="60" r="20"/><path className="part-running-line" d={variant?"M104 80L184 120L210 55":"M104 80L184 120M106 65L200 90M96 97L165 139"}/></>}
 {kind==="motion"&&<g className="part-walking"><circle cx="80" cy="68" r="9"/><path d="M80 80V110L67 132M80 110L94 132M65 96L80 84L96 96"/></g>}
 {kind==="axes"&&<g className="part-axis-tilt"><path d={paths.axes}/><text x="210" y="85">X</text><text x="120" y="12">Y</text><text x="45" y="142">Z</text><circle cx="125" cy="80" r="6"/></g>}
 {kind==="pressure"&&<><path className="part-gauge-needle" d="M125 120L75 65"/><circle cx="125" cy="120" r="7"/></>}
 {kind==="flame"&&<path className="part-flame-inner" d="M130 80Q164 118 131 132Q105 125 130 80Z"/>}
 {kind==="gas"&&[0,1,2,3,4,5].map(i=><circle key={i} className="part-gas-dot" style={{animationDelay:`${i*.45}s`}} cx={45+i*31} cy={105-i%3*24} r={5+i%3*3}/>)}
 {kind==="soil"&&<>{[0,1,2].map(i=><path key={i} className="part-moisture" style={{animationDelay:`${i*.6}s`}} d={`M${65+i*60} 65V130`}/>)}<path className="part-droplet" d="M125 5Q105 30 125 38Q145 30 125 5Z"/></>}
 {kind==="level"&&<path className="part-water-level" d="M72 90Q92 80 112 90T152 90T178 90V138H72Z"/>}
 {["servo","knob","rotation","steps"].includes(kind)&&<><circle cx="125" cy="80" r="58" strokeDasharray={kind==="steps"?"2 10":"none"}/><g className={kind==="rotation"?"part-spin":kind==="steps"?"part-stepping":"part-dial-sweep"}><path d="M125 80V28"/><circle cx="125" cy="24" r="5"/>{kind==="rotation"&&<path d="M80 106L125 80L170 106"/>}</g><circle cx="125" cy="80" r="7"/></>}
 {["relay","button"].includes(kind)&&<><circle cx="92" cy="100" r="5"/><circle cx="163" cy="100" r="5"/><path className="part-contact" d="M92 100L162 58"/>{kind==="button"&&<path className="part-button-cap" d="M106 25H150M128 25V50"/>}<path className="part-switched-signal" d="M25 100H225"/></>}
 {kind==="display"&&(variant?<path className="part-running-line" d="M55 83H75L90 58L110 107L132 66L150 88H195"/>:<g className="part-display-chars"><text x="65" y="72">HELLO</text><text x="65" y="108">BUILDER_</text></g>)}
 {kind==="segments"&&<path className="part-sequence" d="M95 80H155"/>}
 {kind==="led"&&<><circle className="part-led-halo" cx="125" cy="80" r="42"/>{[0,45,90,135,180,225,270,315].map(angle=><path key={angle} className="part-sequence" transform={`rotate(${angle} 125 80)`} d="M125 25V15"/>)}</>}
 {kind==="resistor"&&<text x="93" y="135">{variant?"10 kΩ":"220 Ω"}</text>}
 {kind==="driver"&&[0,1,2,3].map(i=><circle key={i} className="part-sequence" style={{animationDelay:`${i*(variant===2?.45:.25)}s`}} cx={65+i*40} cy={40+i*27} r="5"/>)}
 {kind==="rfid"&&<><g className="part-rfid-card"><rect x="80" y="15" width="95" height="62" rx="7"/><rect x="95" y="29" width="20" height="18" rx="3"/><path d="M125 35H160M95 59H160"/></g><path className="part-sequence" d="M105 111L120 124L147 98"/></>}
 {kind==="bluetooth"&&<><circle className="part-sequence" cx="42" cy="80" r="9"/><circle className="part-sequence" style={{animationDelay:".8s"}} cx="208" cy="80" r="9"/><path className="part-running-line" d="M50 80H90M165 80H200"/></>}
 {kind==="radio"&&<><circle cx="30" cy="80" r="10"/><circle cx="220" cy="80" r="10"/>{[0,1,2].map(i=><rect key={i} className="part-data-packet" style={{animationDelay:`${i*.7}s`}} x="40" y="74" width="12" height="12" rx="3"/>)}</>}
 {kind==="pump"&&[0,1,2].map(i=><path key={i} className="part-pump-drop" style={{animationDelay:`${i*.6}s`}} d={`M${100+i*25} 60q-12 18 0 24q12-6 0-24Z`}/>)}
 </>;
}
export function CatalogPartEffect({model}:{model:string}){
 const demo=catalogPartDemos[model];if(!demo)return null;
 return <div className="catalog-part-effect" data-part-effect={model} data-kind={demo.kind} aria-hidden="true"><div className="part-demo-title"><i/>{demo.title}</div><svg className="part-demo-graphic" viewBox="0 0 250 160"><Graphic kind={demo.kind} variant={demo.variant}/></svg>{demo.kind==="distance"&&<div className="part-pointer-target"/>}<div className="part-demo-caption">{demo.caption}</div></div>;
}
