import { createContext, useContext, useState, type ReactNode } from "react";
import { useMessages } from "@/lib/messages";
import { thisWeek, useReports } from "@/lib/reports";

import { useStudentSettings } from "@/lib/studentSettings";

export type WorkspaceNotification={id:string;category:"Messages"|"Reports"|"Meetings"|"Workshop";title:string;description:string;caption:string;target:"messages"|"reports"|"meetings"|"requests";chat?:string;sample?:boolean;priority?:boolean};
type NotificationState={items:WorkspaceNotification[];read:string[];dismissed:string[];markRead:(id:string)=>void;markAll:()=>void;dismiss:(id:string)=>void;open:boolean;setOpen:(value:boolean)=>void};
const Context=createContext<NotificationState|null>(null);
export function NotificationsProvider({children}:{children:ReactNode}){
 const {chats,meetings}=useMessages(),{weekly}=useReports(),{settings}=useStudentSettings();
 const [read,setRead]=useState<string[]>([]),[dismissed,setDismissed]=useState<string[]>([]),[open,setOpen]=useState(false);
 const items:WorkspaceNotification[]=[];
 for(const chat of chats.filter(chat=>chat.unread>0&&!chat.muted&&chat.kind!=="saved")){const latest=chat.messages.at(-1);items.push({id:`message-${chat.id}-${latest?.id||"unread"}`,category:"Messages",title:chat.name,description:settings.messagePreviews?(latest?.text||latest?.attachment?.name||"New message"):"Message preview hidden",caption:`${chat.unread} unread message${chat.unread===1?"":"s"}`,target:"messages",chat:chat.id,sample:["t1","t2","s1","w1"].includes(latest?.id||"")});}
 if(settings.reportReminders){const report=weekly[thisWeek()];items.push({id:`weekly-${thisWeek()}-${report?.status||"Draft"}-${report?.submittedAt||report?.savedAt||"new"}`,category:"Reports",title:report?.status==="Submitted"?"Weekly report submitted":report?.status==="Reviewed"?"Your weekly report was reviewed":"Your weekly update",description:report?.status==="Submitted"?"Your report is recorded in this session. You can edit it until supervisor review.":report?.feedback?.text||"Capture this week’s work, blockers and next steps.",caption:report?.status||"Not started",target:"reports",sample:!!report?.sample});}
 if(settings.meetingReminders){const upcoming=meetings.filter(item=>(item.status||"Scheduled")==="Scheduled"&&new Date(item.startsAt).getTime()>Date.now()).sort((a,b)=>a.startsAt.localeCompare(b.startsAt)).slice(0,2);for(const meeting of upcoming)items.push({id:`meeting-${meeting.id}-${meeting.startsAt}`,category:"Meetings",title:meeting.title,description:meeting.location||"Open meeting details to prepare.",caption:new Date(meeting.startsAt).toLocaleString("en-US",{timeZone:"Asia/Hebron",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}),target:"meetings",sample:!!meeting.sample});}
 const visible=items.filter(item=>!dismissed.includes(item.id));
 return <Context.Provider value={{items:visible,read,dismissed,markRead:id=>setRead(values=>values.includes(id)?values:[...values,id]),markAll:()=>setRead(values=>[...new Set([...values,...visible.map(item=>item.id)])]),dismiss:id=>setDismissed(values=>[...values,id]),open,setOpen}}>{children}</Context.Provider>;
}
export function useNotifications(){const state=useContext(Context);if(!state)throw new Error("NotificationsProvider is required");return state;}
