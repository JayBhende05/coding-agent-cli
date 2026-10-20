import { shutdownTracing } from "./Langfuse.ts"; // must stay first: loads .env and starts tracing
import { parseArgs } from "node:util";
import { getProvider } from "./providers/mainProvider.ts";
import { AssistantMessage, Message } from "./types.ts";
import {tools} from './tools/mainTools.ts'
import { runAgent } from "./agent/loop.ts";
import { buildSystemPrompt } from "./systemPrompt.ts";


const { values } = parseArgs({
  options: {
    prompt: { type: "string", short: 'p' },
    provider: { type: "string", short: 'x' },
    model: { type: "string", short: 'm' },
    system: { type: "string", short: 's' }
  }
})

if (!values.prompt || !values.provider) {
 console.error(
    'Usage: mypi -p "<prompt>" -x <provider> [-m <model>] [-s "<system prompt>"]'
  );
  process.exit(1);
}

console.log(values)

const provider = getProvider(values.provider)
const messages: Message[] = [{ role: "user", content: values.prompt }]
const model = values.model ?? ""
if(!tools){
  process.exit(1)
}

// async function callModel1(): Promise<AssistantMessage> {
//   for await (const event of provider.stream({ messages,model, tools })) {
//     if (event.type === "text_delta") process.stdout.write(event.delta);
//     else {
//       const { usage, stopReason } = event.message;
//       console.log(
//         `\n\n  ${provider.name} ... ${model} ... ${usage.input_token} ... ${usage.output_token} ... ${stopReason}`,
//       );

//       return event.message;
//     }
//   }
//   throw new Error("stream ended without a done event");
// }

// callModel1()



const system = await buildSystemPrompt(process.cwd(), values.system);

await runAgent({
  provider,
  model,
  system,
  tools,
  messages,
  onEvent(event) {
    if (event.type === "text") process.stdout.write(event.delta);
    else if (event.type == "tool_start") console.log(`\n ${event.call.name}`);
    else if (event.type == "tool_end") {
      const lines = event.result.split("\n").length;
      console.log(`\n ${event.isError ? event.result : lines}`);
    } else if (event.type === "turn_end") {
      const { usage, stopReason } = event.message;
      console.log(
        `\n\n"Provider":${provider.name}  \n "Input Tokens":${usage.input_token} \n Output Tokens:${usage.output_token} \n "Stop Reason:"${stopReason}`,
      );
    }
  },
});

await shutdownTracing();
