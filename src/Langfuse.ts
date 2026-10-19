import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";

// Load .env here, because this module must be imported before anything that makes API calls and
// ES imports run before the code in main.ts (LangfuseSpanProcessor reads LANGFUSE_* when created).
config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
  quiet: true,
});

// tracing is optional: without Langfuse keys the app runs normally and sends nothing
const enabled = Boolean(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);

const sdk = enabled ? new NodeSDK({ spanProcessors: [new LangfuseSpanProcessor()] }) : undefined;
sdk?.start();

// spans are sent in batches in the background; call this before the process exits or they are lost
export async function shutdownTracing(): Promise<void> {
  await sdk?.shutdown();
}
