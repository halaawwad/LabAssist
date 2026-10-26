import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Settings } from "lucide-react";
import { useStudentSettings } from "@/lib/studentSettings";

const size=64;
export function SettingsWanderer(){
 const {settings}=useStudentSettings();
 const [position,setPosition]=useState<{x:number;y:number}|null>(null),[visible,setVisible]=useState(false),[dragging,setDragging]=useState(false);
 const draggingRef=useRef(false),lastInteraction=useRef(0),positionRef=useRef(position),dragOffset=useRef({x:0,y:0});
 const place=(value:{x:number;y:number})=>{positionRef.current=value;setPosition(value);};
 useEffect(()=>{
  const media=matchMedia("(prefers-reduced-motion: reduce)");let reduced=media.matches,timer:ReturnType<typeof setTimeout>|undefined;
  const blocked=(x:number,y:number)=>{const targets=document.querySelectorAll('aside.workspace-sidebar, [role="dialog"], main button, main a, main input, main select, main textarea, main h1, main h2, main h3, main p, main label, .settings-hero>div:first-child');return Array.from(targets).some(element=>{const r=element.getBoundingClientRect();return r.width>0&&r.height>0&&x<r.right+7&&x+size>r.left-7&&y<r.bottom+7&&y+size>r.top-7;});};
  const choose=()=>{if(draggingRef.current||Date.now()-lastInteraction.current<10000)return;const main=document.querySelector('main.settings-main')?.getBoundingClientRect();if(!main)return;const left=Math.max(12,main.left+9),right=Math.min(innerWidth-size-12,main.right-size-9),bottom=innerHeight-size-16;if(right<left||bottom<50)return;const options=[];for(let y=70;y<bottom;y+=38)for(let x=left;x<=right;x+=36)if(!blocked(x,y))options.push({x,y});const distant=options.filter(value=>!positionRef.current||Math.hypot(value.x-positionRef.current.x,value.y-positionRef.current.y)>150);const choices=distant.length?distant:options;if(!choices.length){setVisible(false);return;}setVisible(false);clearTimeout(timer);timer=setTimeout(()=>{if(draggingRef.current)return;place(choices[Math.floor(Math.random()*choices.length)]!);setVisible(true);},300);};
  const relocate=()=>{if(draggingRef.current)return;setVisible(false);clearTimeout(timer);timer=setTimeout(choose,180);};
  const updateReduced=()=>{reduced=media.matches;};media.addEventListener("change",updateReduced);
  choose();const interval=setInterval(()=>{if(settings.motion&&!reduced&&!document.hidden)choose();},6500);
  addEventListener("scroll",relocate,{passive:true});addEventListener("resize",relocate);
  return()=>{clearInterval(interval);clearTimeout(timer);removeEventListener("scroll",relocate);removeEventListener("resize",relocate);media.removeEventListener("change",updateReduced);};
 },[settings.motion]);
 if(!position)return null;
 return createPortal(<div className={`settings-wanderer ${visible?"wanderer-visible":""} ${dragging?"wanderer-dragging":""}`} style={{left:position.x,top:position.y}}><button type="button" aria-label="Move the settings ornament" title="Drag me to a new spot" onPointerDown={event=>{draggingRef.current=true;setDragging(true);lastInteraction.current=Date.now();dragOffset.current={x:event.clientX-position.x,y:event.clientY-position.y};event.currentTarget.setPointerCapture(event.pointerId);}} onPointerMove={event=>{if(!draggingRef.current)return;place({x:Math.max(6,Math.min(innerWidth-size-6,event.clientX-dragOffset.current.x)),y:Math.max(6,Math.min(innerHeight-size-6,event.clientY-dragOffset.current.y))});}} onPointerUp={()=>{draggingRef.current=false;setDragging(false);lastInteraction.current=Date.now();}} onPointerCancel={()=>{draggingRef.current=false;setDragging(false);lastInteraction.current=Date.now();}} onKeyDown={event=>{const delta=event.shiftKey?30:12;const moves:Record<string,[number,number]>={ArrowLeft:[-delta,0],ArrowRight:[delta,0],ArrowUp:[0,-delta],ArrowDown:[0,delta]};const move=moves[event.key];if(move){event.preventDefault();lastInteraction.current=Date.now();place({x:Math.max(6,Math.min(innerWidth-size-6,position.x+move[0])),y:Math.max(6,Math.min(innerHeight-size-6,position.y+move[1]))});}}}><span className="settings-wanderer-orbit"/><Settings size={35} strokeWidth={1.4}/><span className="settings-wanderer-tick"><Check size={10}/></span></button></div>,document.body);
}
