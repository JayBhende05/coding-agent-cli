
import Groq from "groq-sdk";
import { Provider, ProviderEvent } from "../types/types.ts";
import { toolsSchema } from "../tools/toolsSchema.ts";
import getAvaliableTools from "../tools/toolsRegistry.ts";

export function groqProvider(): Provider {
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  return {
    name: "groq",
    defaultModel: "openai/gpt-oss-20b",

    async *stream({ messages, model }): AsyncGenerator<ProviderEvent> {
      const response = await groq.chat.completions.create({
        messages,
        model: model ?? "openai/gpt-oss-20b",
        // stream: true,
        tools: toolsSchema,
        tool_choice: "auto"
      });

      const responseMessage = response.choices[0].message
      const toolCalls = responseMessage.tool_calls

      if (toolCalls) {
        messages.push(responseMessage);

        for (const toolCall of toolCalls) {
          const functionName = toolCall.function.name;
          const functionToCall = getAvaliableTools(functionName);
          const functionArgs = JSON.parse(toolCall.function.arguments);
          const functionResponse = functionToCall(functionArgs.expression)


          messages.push({ role: "tool", tool_call_id: toolCall.id, content: String(functionResponse) });

        }

        const secondResponse = await groq.chat.completions.create({
            model: model ?? "openai/gpt-oss-20b",
            messages: messages,
          });
          
          console.log("TOOL CALL" ,JSON.stringify( secondResponse.choices[0].message.content))
      }
 console.log("NO TOOL CALL" , response.choices[0].message.content)

      // let finalText = ""
      // for await (const chunk of stream) {
      //   const choice = chunk.choices[0];
      //   const delta = choice?.delta;
      //   const usage = chunk?.x_groq?.usage

      //   if (delta?.reasoning) {
      //     yield {
      //       type: "reasoning",
      //       text: delta.reasoning,
      //     };
      //   }

      //   if (delta?.content) {
      //     finalText += delta.content
      //     yield {
      //       type: "text",
      //       text: delta.content,
      //     };
      //   }

      //   if (choice?.finish_reason) {
      //     yield {
      //       type: "done", response: finalText, usage: {
      //         input_token: usage?.prompt_tokens || 0,
      //         outPut_token: usage?.completion_tokens || 0
      //       }
      //     };
      //   }
      // }
    },
  };
}
