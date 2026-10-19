import { Provider } from "../types.ts";
import { createAnthropic } from "./anthropic.ts";
import { createOpenAICompat } from "./openai.ts";




const Providers: Record<string, () => Provider> = {
  "anthropic": createAnthropic,

  "anthropic-openai": () => createOpenAICompat("anthropic-openai", "https://api.anthropic.com/v1/", process.env.ANTHROPIC_API_KEY!, "claude-sonnet-5"),
  
  "groq": () => createOpenAICompat("groq", "https://api.groq.com/openai/v1", process.env.GROQ_API_KEY!, "openai/gpt-oss-120b"),
  
  "gemini": () => createOpenAICompat(
    "gemini",
    "https://generativelanguage.googleapis.com/v1beta/openai/",
    process.env.GEMINI_API_KEY!,
    "gemini-3.8-flash",
  )
}



export function getProvider(providerName: string): Provider {
  const provider = Providers[providerName]
  if (!provider) {
    throw new Error("Provider NOT FOUND")
  }
  return provider()
}