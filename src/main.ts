import { config } from "dotenv";
import Groq from "groq-sdk";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { getProvider } from "./providers/mainProvider.ts";
import { AssistantMessage, Message } from "./types.ts";
import {tools} from './tools/mainTools.ts'
import { runAgent } from "./agent/loop.ts";

// Load .env from the parent folder of this script
config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
  quiet: true,
});


const { values } = parseArgs({
  options: {
    prompt: { type: "string", short: 'p' },
    provider: { type: "string", short: 'x' },
    model: { type: "string", short: 'm' }
  }
})

if (!values.prompt || !values.provider) {
 console.error(
    'Usage: mypi -p "<prompt>" -x <provider> [-m <model>]'
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



await runAgent({
  provider,
  model,
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
