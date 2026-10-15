import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, CircuitBoard, Radar, Route, Wrench, Flag } from "lucide-react";

export function ProgressRing({ value, size = 96, children, label = "Progress" }: { value: number; size?: number; children?: ReactNode; label?: string }) {
  const progress = Math.max(0, Math.min(100, value));
  const element=useRef<HTMLDivElement>(null),[visible,setVisible]=useState(false);
  useEffect(()=>{if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){setVisible(true);return;}const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}},{threshold:.2});if(element.current)observer.observe(element.current);return()=>observer.disconnect();},[]);
  const circumference = 2 * Math.PI * 42;
  return <div ref={element} className="visual-progress-ring" style={{ width: size, height: size }} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
    <svg viewBox="0 0 100 100" aria-hidden="true"><circle className="visual-ring-track" cx="50" cy="50" r="42"/><circle className="visual-ring-fill" cx="50" cy="50" r="42" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - (visible?progress:0) / 100)}/></svg>
    <div className="visual-ring-center">{children ?? <strong>{Math.round(progress)}<small>%</small></strong>}</div>
  </div>;
}

const milestones = [
  { name: "Idea", icon: Flag, detail: "Project goals and abstract defined." },
  { name: "Design", icon: CircuitBoard, detail: "Circuit design and component selection completed." },
  { name: "Prototype", icon: Wrench, detail: "Current milestone: build, calibrate and test the prototype." },
  { name: "Testing", icon: Radar, detail: "Next: check navigation, sensor accuracy and power consumption." },
  { name: "Demo", icon: Route, detail: "Final demonstration and project presentation." },
];
export function MilestonePath() {
  const [selected, setSelected] = useState(2);
  return <div className="milestone-visual"><div className="flex items-center justify-between gap-2"><h3 className="text-xs font-bold">The journey to a working prototype</h3><span className="project-badge">3 / 5</span></div><ol className="milestone-path">{milestones.map((stage,index)=><li key={stage.name} data-complete={index<2} data-current={index===2}><button onClick={()=>setSelected(index)} aria-pressed={selected===index} aria-label={`${stage.name}: ${index<2?"completed":index===2?"current":"upcoming"}`}><span className="milestone-node">{index<2?<Check size={15}/>:<stage.icon size={16}/>}</span><span>{stage.name}</span></button></li>)}</ol><div className={`milestone-selected-detail phase-${selected}`} key={selected}><span className="milestone-detail-icon">{selected<2?<Check size={22}/>:selected===2?<Wrench size={22}/>:selected===3?<Radar size={22}/>:<Flag size={22}/>}</span><div><small>{selected<2?"COMPLETED PHASE":selected===2?"CURRENT PHASE":"NEXT ON THE JOURNEY"}</small><h4>{milestones[selected]!.name}</h4><p className="milestone-description" role="status">{milestones[selected]!.detail}</p></div><span className="milestone-phase-number">0{selected+1}</span></div></div>;
}
