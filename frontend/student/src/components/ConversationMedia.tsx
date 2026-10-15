import { useState } from "react";
import { Download, ExternalLink, FileText } from "lucide-react";
import type { Conversation } from "@/lib/messages";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ConversationMedia({conversation}:{conversation:Conversation}) {
 const [tab,setTab]=useState("Media"),[preview,setPreview]=useState<{url:string;name:string}|null>(null);
 const files=conversation.messages.flatMap(message=>message.attachment?[{...message.attachment,id:message.id}]:[]);
 const links=conversation.messages.flatMap(message=>(message.text.match(/https?:\/\/[^\s<>]+/g)||[]).map((url,index)=>({url,id:`${message.id}-${index}`})));
 const selected=files.filter(file=>tab==="Media"?file.image:!file.image);
 return <section className="conversation-shared-media"><h3>Media, files & links</h3><p>Shared in {conversation.name}</p><div className="messages-people-filters" aria-label="Shared content filters">{["Media","Files","Links"].map(value=><button key={value} aria-pressed={tab===value} onClick={()=>setTab(value)}>{value}<small>{value==="Links"?links.length:files.filter(file=>value==="Media"?file.image:!file.image).length}</small></button>)}</div>
 {tab==="Links"?<div className="message-files-list">{links.map(link=><a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/><span>{link.url}</span></a>)}{!links.length&&<p className="messages-no-results">No links shared yet.</p>}</div>:<div className={tab==="Media"?"message-media-grid":"message-files-list"}>{selected.map(file=>file.image?<button key={file.id} onClick={()=>setPreview(file)}><img src={file.url} alt={file.name}/><span>{file.name}</span></button>:<a key={file.id} href={file.url} download={file.name}><FileText size={20}/><span>{file.name}<small>Download file</small></span><Download size={14}/></a>)}{!selected.length&&<p className="messages-no-results">No {tab.toLowerCase()} shared yet.</p>}</div>}
 <Dialog open={!!preview} onOpenChange={open=>!open&&setPreview(null)}><DialogContent className="message-image-viewer"><DialogHeader><DialogTitle>{preview?.name}</DialogTitle></DialogHeader>{preview&&<><img src={preview.url} alt={preview.name}/><a href={preview.url} download={preview.name}>Download image</a></>}</DialogContent></Dialog></section>;
}
