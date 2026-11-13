import type { Deck } from "@/domain/presentation/presentations";
export type DeckEngineReply={type:"ready"}|{type:"result";id:string;deck?:Deck;data?:string;extension?:string}|{type:"error";id?:string;message:string};
export type DeckEngineProps={request:{id:string;operation:"import"|"pptx"|"pdf";deck?:Deck;base64?:string;name?:string}|null;onResult:(reply:DeckEngineReply)=>void};
