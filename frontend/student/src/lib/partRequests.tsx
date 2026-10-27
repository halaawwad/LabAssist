import { createContext, useContext, useState, type ReactNode } from "react";
export type RequestStatus =
  "Draft" | "Pending" | "Approved" | "Ready for Pickup" | "Completed" | "Rejected" | "Cancelled";
export type PartRequest = {
  id: string;
  partId: string;
  quantity: number;
  purpose: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  note?: string;
  sample?: boolean;
};
const Context = createContext<{
  requests: PartRequest[];
  setRequests: React.Dispatch<React.SetStateAction<PartRequest[]>>;
} | null>(null);
function examples(): PartRequest[] {
  const now = new Date();
  const date = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();
  return [
    {
      id: "example-ready",
      partId: "ultrasonic",
      quantity: 1,
      purpose: "Obstacle detection tests for the prototype.",
      status: "Ready for Pickup",
      createdAt: date(4),
      submittedAt: date(4),
      updatedAt: date(1),
      note: "Example assistant note: collect from sensor drawer B03 during workshop hours.",
      sample: true,
    },
    {
      id: "example-approved",
      partId: "resale-uno",
      quantity: 1,
      purpose: "Replace the prototype controller.",
      status: "Approved",
      createdAt: date(2),
      submittedAt: date(2),
      updatedAt: date(1),
      note: "Example assistant note: student resale board approved. Inspection and handover will be coordinated at the workshop.",
      sample: true,
    },
    {
      id: "example-rejected",
      partId: "servo",
      quantity: 1,
      purpose: "Test the steering mechanism.",
      status: "Rejected",
      createdAt: date(6),
      submittedAt: date(6),
      updatedAt: date(5),
      note: "Example assistant note: no units available. Check local stores or request an alternative.",
      sample: true,
    },
  ];
}
export function PartRequestsProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<PartRequest[]>(examples);
  return <Context.Provider value={{ requests, setRequests }}>{children}</Context.Provider>;
}
export function usePartRequests() {
  const state = useContext(Context);
  if (!state) throw new Error("PartRequestsProvider is required");
  return state;
}
