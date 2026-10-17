
import OpenAI from "openai";
import { Provider } from "../types/types.ts";

export function openaiCompatProvider(
  name: string,
  baseURL: string,
  apiKey: string,
  defaultModel: string,
): Provider {
  const client = new OpenAI({ baseURL, apiKey });

  return {
    name,
    defaultModel,

    async *stream({ messages, model, system }) {
      const chat: OpenAI.ChatCompletionMessageParam[] =
        messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const stream = await client.chat.completions.create({
        model: model ?? defaultModel,
        stream: true,
        stream_options: { include_usage: true },
        messages: system
          ? [{ role: "system", content: system }, ...chat]
          : chat,
      });

      let inputTokens = 0;
      let outputTokens = 0;

      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        const delta = choice?.delta;

        if (delta?.content) {
          yield {
            type: "text",
            text: delta.content,
          };
        }

        // Optional reasoning support for compatible models.
        const reasoning = (
          delta as typeof delta & { reasoning?: string }
        )?.reasoning;

        if (reasoning) {
          yield {
            type: "reasoning",
            text: reasoning,
          };
        }

        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens;
          outputTokens = chunk.usage.completion_tokens;
        }
      }

      yield {
        type: "done",
        usage: {
          input_token: inputTokens,
          outPut_token: outputTokens,
        },
      };
    },
  };
}
