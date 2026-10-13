import { useState } from "react";
import { Box, CalendarDays, Check, CheckCircle2, CircuitBoard, Clock3, Package, ShoppingCart, Wrench } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const inventory = [
  { id: "hc-sr04", name: "HC-SR04 Ultrasonic Sensor", stock: 12, price: 4, location: "Sensors · A2", need: 2, image: "/components/hc-sr04.jpg" },
  { id: "l298n", name: "L298N Motor Driver", stock: 8, price: 8, location: "Drivers · B1", need: 1, image: null },
  { id: "breadboard-400", name: "400-point Breadboard", stock: 18, price: 5, location: "Prototyping · C3", need: 1, image: null },
  { id: "resistor-variable", name: "Resistor Assortment", stock: 24, price: 2, location: "Passives · C1", need: 1, image: null },
];

export function WorkshopDashboard() {

  const [selected, setSelected] = useState<typeof inventory[number] | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [requests, setRequests] = useState<{ id: string; quantity: number }[]>([]);
  const [tasks, setTasks] = useState<string[]>([]);
  const pendingCost = requests.reduce((sum, request) => sum + inventory.find(item => item.id === request.id)!.price * request.quantity, 0);
  return <div className="space-y-3">
    <section className="insight-paper insight-inventory" aria-labelledby="workshop-stock-title">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="mb-1 flex items-center gap-2"><Package size={19} className="text-primary" /><h2 id="workshop-stock-title" className="text-[17px] font-bold">Available in the Workshop</h2></div><p className="text-xs leading-5 text-muted-foreground">Parts you can request for your next build.</p></div><span className="workshop-demo-badge">Sample inventory</span></div>
      <div className="workshop-assistant-note mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-[11px]"><Wrench size={14} className="shrink-0" /><span>Sample availability · confirm stock with the workshop assistant.</span></div>
      <div className="insight-inventory-strip">{inventory.map(item => {
        const request = requests.find(r => r.id === item.id), image = item.image;
        return <article key={item.id} className="glass-inset workshop-product flex min-w-0 flex-col rounded-2xl p-3.5"><div className="workshop-product-image relative mb-3 flex h-28 items-center justify-center rounded-xl">{image ? <img src={image} alt={item.name} className="h-24 w-full object-contain p-2" /> : <CircuitBoard size={42} className="text-primary" />}<span className="workshop-stock-badge absolute left-2 top-2">In stock</span></div><h3 className="text-xs font-bold leading-5">{item.name}</h3><p className="mt-1 text-[10px] text-muted-foreground">{item.location}</p><div className="mt-3 flex items-end justify-between"><p className="text-lg font-bold text-primary">${item.price}<span className="ml-1 text-[10px] font-normal text-muted-foreground">/ unit</span></p><span className="text-[11px] text-muted-foreground">{item.stock} available</span></div><div className="mt-3 border-t border-border/50 pt-3"><Button size="sm" variant={request ? "secondary" : "default"} className="w-full text-xs" onClick={() => {setSelected(item);setQuantity(request?.quantity ?? item.need);}}><ShoppingCart size={14}/>{request ? `Draft request · ${request.quantity}` : "Request to Buy"}</Button></div></article>;
      })}</div>
      {requests.length > 0 && <div role="status" className="workshop-assistant-note mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 text-xs"><span><CheckCircle2 size={14} className="mr-1 inline" />{requests.length} purchase drafts · ${pendingCost.toFixed(2)} estimated</span><span className="text-[10px]">Saved for this session · awaiting workshop integration</span></div>}
    </section>
    <Dialog open={selected!==null} onOpenChange={open=>!open&&setSelected(null)}><DialogContent className="student-dashboard-theme glass-panel glass-strong"><DialogHeader><DialogTitle>Workshop Purchase Request</DialogTitle><DialogDescription>Prepare a local draft. No purchase or stock reservation is made.</DialogDescription></DialogHeader>{selected&&<form onSubmit={e=>{e.preventDefault();if(!Number.isInteger(quantity)||quantity<1||quantity>selected.stock)return;setRequests(current=>[...current.filter(r=>r.id!==selected.id),{id:selected.id,quantity}]);setSelected(null);}} className="space-y-4"><div className="glass-inset rounded-xl p-3"><p className="text-sm font-bold">{selected.name}</p><p className="mt-1 text-xs text-muted-foreground">${selected.price} per unit · {selected.stock} available</p></div><label className="block text-xs font-semibold" htmlFor="purchase-quantity">Quantity</label><input id="purchase-quantity" type="number" min={1} max={selected.stock} step={1} value={quantity} onChange={e=>setQuantity(Number(e.target.value))} className="glass-inset h-10 w-full rounded-lg px-3 text-sm"/><div className="flex justify-between text-sm"><span>Estimated total</span><strong>${(selected.price*quantity).toFixed(2)}</strong></div><div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={()=>setSelected(null)}>Cancel</Button><Button type="submit" disabled={!Number.isInteger(quantity)||quantity<1||quantity>selected.stock}>Save Purchase Draft</Button></div></form>}</DialogContent></Dialog>
  </div>;
}