import { config } from "dotenv";
import Groq from "groq-sdk";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

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
  },
});

if (!values.prompt) {
  console.log("NO PROMPT SIR");
  process.exit(1);
}

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


