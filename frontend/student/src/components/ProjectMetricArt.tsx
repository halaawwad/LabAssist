import { Check, Cpu, Package, Wallet } from "lucide-react";
import { ProgressRing } from "@/components/ProjectVisuals";

export function ProjectMetricArt({value,label,detail,tone="build"}:{value:number;label:string;detail:string;tone?:"build"|"budget"|"parts"}){
 const Icon=tone==="budget"?Wallet:tone==="parts"?Package:Cpu;
 return <div className={`project-metric-art metric-art-${tone}`}><span className="metric-art-kicker">{tone==="budget"?"RESOURCE TRACKER":tone==="parts"?"BUILDING BLOCKS":"BUILD IN MOTION"}</span><div className="metric-art-board"><svg viewBox="0 0 180 138" aria-hidden="true"><g className="metric-art-tracks"><path d="M12 29h21l17 17M167 28h-20l-17 18M12 107h22l16-17M168 109h-22l-16-19M90 5v17M90 134v-17"/></g><g className="metric-art-signal"><path d="M12 29h21l17 17M167 28h-20l-17 18M12 107h22l16-17M168 109h-22l-16-19"/></g></svg><div className="metric-art-core"><ProgressRing value={value} size={90} label={label}><strong>{Math.round(value)}<small>%</small></strong></ProgressRing></div><span className="metric-art-device"><Icon size={14}/></span><span className="metric-art-check"><Check size={12}/></span></div><span className="metric-art-detail">{detail}</span><div className="metric-art-capacity" aria-hidden="true">{Array.from({length:8},(_,index)=><i key={index} className={value>=((index+1)/8)*100?"is-filled":""}/>)}</div></div>;
}
