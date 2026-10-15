import { useEffect, useRef, useState } from "react";
import { ProgressRing } from "@/components/ProjectVisuals";

export function TeamPersonalProgress({value,label}:{value:number;label:string}){
 const [visible,setVisible]=useState(false),element=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){setVisible(true);return;}
  const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}},{threshold:.3});
  if(element.current)observer.observe(element.current);
  return()=>observer.disconnect();
 },[]);
 return <div ref={element} className="team-animated-personal-ring"><ProgressRing value={visible?value:0} size={105} label={label}><strong>{value}<small>%</small></strong></ProgressRing></div>;
}
