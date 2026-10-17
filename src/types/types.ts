
export type toolcall = {
        "id": string,
        "type": "function",
        "function": {
          "name": string,
          "arguments": string
        }
      }

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: toolcall[] }
  | { role: "tool"; content: string; tool_call_id: string };


export type StreamOptions = {
  messages: ChatMessage[];
  model?: string;
  system? : string
};

export type ProviderEvent =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "done" ; response : string ; usage : { 
    input_token : number,
            outPut_token :number
  } };

export interface Provider {
  name: string;
  defaultModel: string;
  stream(options: StreamOptions): AsyncIterable<ProviderEvent>;
}
