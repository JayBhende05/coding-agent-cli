import { config } from "dotenv";
import Groq from "groq-sdk";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { getProvider } from "./providers/main.ts";
import { ChatMessage } from "./types/types.ts";

// Load .env from the parent folder of this script
config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
  quiet: true,
});

const { values } = parseArgs({
  options: {
    prompt: { type: "string", short: "p" },
    model: {
      type: "string",
      default: "openai/gpt-oss-20b",
    },
    provider : {type : "string" , default : "groq"},
  },
});

if (!values.prompt) {
  console.log("NO PROMPT SIR");
  process.exit(1);
}

if(!values.provider){
  console.log("Please pass Provider")
  process.exit(1)
}

const provider = getProvider(values.provider);
const messages: ChatMessage[] = [{ role: "user", content: values.prompt }];
const model = values.model ?? provider.defaultModel;

console.log("Provider return" , provider)

for await(const event of provider.stream({messages ,model} )){
  if(event.type === 'done'){
      console.log("CHUNK" , event)

  }
      
}








async function tryGroq( values : { prompt : string , model : string }){
  
if (!process.env.GROQ_API_KEY) {
  console.error("GROQ_API_KEY is missing from your .env file");
  process.exit(1);
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const stream = await groq.chat.completions.create({
  messages: [
    {
      role: "user",
      content: values.prompt,
    },
  ],
  model: values.model,
  stream : true
});


  let text = ""  
  let input_token;
  let output_token;
 for await (const chunk of stream) {
  
  if(chunk.choices[0].delta.content){
        text+=chunk.choices[0].delta.content
      }
      if(chunk.choices[0].finish_reason){
        input_token = chunk.x_groq?.usage?.prompt_tokens
        output_token = chunk.x_groq?.usage?.completion_tokens
        
      }
      console.log("Chunk is" , chunk.choices[0].delta.content)
      
  }

  console.log("The text is " , text);

}

// tryGroq({prompt : values.prompt , model : values.model})

