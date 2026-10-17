import type { Provider } from "../types/types.ts";
import { anthropicProvider } from "./anthropic.ts";
import { groqProvider } from "./groq.ts";
import { openaiCompatProvider } from "./openai-comaptible.ts";


const providers: Record<string, () => Provider> = {
  anthropic: anthropicProvider,
  groq: groqProvider,
  openai: ()=> openaiCompatProvider(
    "gemini",
    "https://generativelanguage.googleapis.com/v1beta/openai/",
    process.env.GEMINI_API_KEY!,
    "gemini-2.5-flash",
  ),
};


export function getProvider(name: string): Provider {
  const create = providers[name];
  if (!create) {
    throw new Error(`Unknown provider: ${name}`);
  }
  return create();
}