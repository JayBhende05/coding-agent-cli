import { config } from "dotenv";
import Groq from "groq-sdk";
import { fileURLToPath } from "node:url";

// import { toolsSchema } from "./tools/toolsSchema.ts";

// Load .env from the parent folder of this script
config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
  quiet: true,
});


