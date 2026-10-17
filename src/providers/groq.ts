
import Groq from "groq-sdk";
import { Provider, ProviderEvent } from "../types/types.ts";

export function groqProvider(): Provider {
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  return {
    name: "groq",
    defaultModel: "openai/gpt-oss-20b",

    async *stream({ messages, model }):AsyncGenerator<ProviderEvent> {
      const stream = await groq.chat.completions.create({
        messages,
        model: model ?? "openai/gpt-oss-20b",
        stream: true,
      });

      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        const delta = choice?.delta;
        const usage = chunk?.x_groq?.usage

        if (delta?.reasoning) {
          yield {
            type: "reasoning",
            text: delta.reasoning,
          };
        }

        if (delta?.content) {
          yield {
            type: "text",
            text: delta.content,
          };
        }

        if (choice?.finish_reason) {
          yield { type: "done", usage : {
            input_token : usage?.prompt_tokens || 0,
            outPut_token : usage?.completion_tokens || 0
          } };
        }
      }
    },
  };
}
