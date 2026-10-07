import { Cpu, LayoutDashboard, FolderKanban, Box, CircuitBoard, Package, Users, BookOpen, MessageSquare, FileText, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  {label:"Dashboard",icon:LayoutDashboard},{label:"My Project",icon:FolderKanban},{label:"3D Lab",icon:Box},
  {label:"Component Catalog",icon:Cpu},{label:"My Circuits",icon:CircuitBoard},{label:"Inventory",icon:Package},
  {label:"Team",icon:Users},{label:"Learning Hub",icon:BookOpen},{label:"Messages",icon:MessageSquare},
  {label:"Reports",icon:FileText},{label:"Settings",icon:Settings},
];
export function WorkspaceSidebar({active,open,onClose,onSelect,className=""}:{active:string;open:boolean;onClose:()=>void;onSelect:(label:string)=>void;className?:string}) {
  return <aside className={`glass-panel glass-strong workspace-sidebar fixed inset-y-2.5 left-2.5 z-40 flex w-[220px] shrink-0 flex-col rounded-[18px] px-2.5 py-3 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-[110%]"} ${className}`}>
    <div className="flex items-center justify-between px-3 pb-5 pt-2 lg:pb-6"><div className="flex items-center gap-2.5"><div className="flex size-9 items-center justify-center text-primary"><Cpu size={33} strokeWidth={2.2}/></div><div><div className="text-[16px] font-extrabold leading-tight">HardwareMate</div><div className="text-[10px] font-medium text-muted-foreground">Build · Simulate · Learn</div></div></div><Button variant="ghost" size="icon" className="size-7 lg:hidden" aria-label="Close menu" onClick={onClose}><X/></Button></div>
    <nav className="flex flex-col gap-1 overflow-y-auto" aria-label="Main navigation">{navigation.map(({label,icon:Icon})=><Button key={label} variant="ghost" onClick={()=>{onClose();onSelect(label)}} className={`h-10 w-full justify-start gap-3 rounded-[11px] px-3 text-[13px] font-medium shadow-none ${active===label ? "bg-mint text-mint-foreground hover:bg-mint" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}><Icon className="!size-[18px]" strokeWidth={2.2}/>{label}</Button>)}</nav>
    <div className="mt-auto px-3 pt-4"><div className="border-t soft-divider pt-4 text-[10px] font-medium text-muted-foreground">HardwareMate AI <span className="float-right">v2.4</span></div></div>
  </aside>;
}
