import type { FinalDocument } from "@/domain/finalReport";
export type EngineReply =
  | { type: "ready" }
  | { type: "error"; id: string; message: string }
  | {
      type: "result";
      id: string;
      data: string;
      positions: Record<string, number>;
      abstractPages: number;
    };
export type EngineProps = {
  request: { id: string; document: FinalDocument } | null;
  onResult: (result: EngineReply) => void;
};
