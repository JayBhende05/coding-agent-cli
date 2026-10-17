
import Anthropic from "@anthropic-ai/sdk";
import type { Provider, ProviderEvent } from "../types/types.js";

export function anthropicProvider(): Provider {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const defaultModel = "claude-sonnet-4-5";

  return {
    name: "anthropic",
    defaultModel,

    async *stream({ messages, system, model }): AsyncGenerator<ProviderEvent> {
      const stream = client.messages.stream({
        max_tokens: 1024,
        system,
        messages: messages.map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
        model: model ?? defaultModel,
      });

      let finalText = ""
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          finalText+=event.delta.text
          yield {
            type: "text",
            text: event.delta.text,
          };
        }
      }

      const final = await stream.finalMessage();

      yield {
        type: "done",
        response : finalText,
        usage: {
          input_token: final.usage.input_tokens,
          outPut_token: final.usage.output_tokens,
        },
      };
    },
  };
}
