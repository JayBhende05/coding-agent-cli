# Harness – Code Flow & Execution Walkthrough

This document traces what happens, line by line, when you run:

```bash
mypi -p "What is in gitignore file" -x "groq"
```

- `-p` → prompt (`values.prompt`)
- `-x` → provider (`values.provider`)
- `-m` → model (parsed, but currently **not used**, see [Known issues](#known-issues))

---

## 0. File map

```
bin/mypi.js                  entry point of the CLI command `mypi`
src/main.ts                  parses args, builds provider + messages, starts the agent
src/types.ts                 shared types (Message, Provider, Tool, StreamEvent ...)
src/providers/mainProvider.ts   registry: provider name -> factory, exports getProvider()
src/providers/openai.ts      OpenAI-compatible provider (used for groq, anthropic-openai)
src/providers/anthropic.ts   native Anthropic provider
src/agent/loop.ts            runAgent(): the agent loop (model -> tools -> model ...)
src/tools/mainTools.ts       exports the `tools` array
src/tools/readTool.ts        the `read` tool (reads a file)
```

---

## 1. Big picture

```
mypi -p "..." -x groq
   │
   ▼
bin/mypi.js ──► registers tsx, imports src/main.ts
   │
   ▼
main.ts
   ├─ dotenv loads .env (GROQ_API_KEY ...)
   ├─ parseArgs  → { prompt, provider }
   ├─ getProvider("groq") ──► mainProvider.ts ──► createOpenAICompat(...) ──► openai.ts
   │                                                   returns { name, defaultModel, stream() }
   ├─ messages = [{ role:"user", content: prompt }]
   └─ runAgent({ provider, model, tools, messages, onEvent })   ──► agent/loop.ts
                         │
                         ▼
        ┌──────────────── LOOP (max 20 turns) ────────────────┐
        │ provider.stream(...)  → text_delta events + done     │
        │ push assistant message into messages                 │
        │ stopReason !== "toolUse" ?  ──► return (finished)    │
        │ else run each tool call (tools.find().execute())     │
        │ push toolResult messages  ──► next turn              │
        └──────────────────────────────────────────────────────┘
```

---

## 2. Step-by-step execution

### Step 1 – `bin/mypi.js` (the command)

```js
import { register } from "tsx/esm/api";   // lets Node run .ts files directly
register();
await import("../src/main.ts");           // starts the program
```

`package.json` maps the command name to this file:

```json
"bin": { "mypi": "./bin/mypi.js" }
```

So typing `mypi ...` runs `bin/mypi.js`, which loads `src/main.ts`.
(`npm run dev` does the same thing with `tsx src/main.ts`.)

---

### Step 2 – `src/main.ts`: imports and env loading

```ts
import { getProvider } from "./providers/mainProvider.ts";
import { runAgent } from "./agent/loop.ts";
import { tools } from './tools/mainTools.ts'
```

Imports pull in the whole graph: `mainProvider.ts` imports `anthropic.ts` and `openai.ts`; `mainTools.ts` imports `readTool.ts`.

```ts
config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
  quiet: true,
});
```

`dotenv` reads `.env` from the project root (one folder above `src/`) and puts the keys (`GROQ_API_KEY`, `ANTHROPIC_API_KEY`) into `process.env`. This must happen **before** `getProvider` runs, because the provider registry reads `process.env.GROQ_API_KEY`.

---

### Step 3 – `parseArgs` reads the CLI flags (`main.ts:17`)

```ts
const { values } = parseArgs({
  options: {
    prompt:   { type: "string", short: 'p' },
    provider: { type: "string", short: 'x' },
    model:    { type: "string", short: 'm' }
  }
})
```

For `mypi -p "What is in gitignore file" -x "groq"` the result is:

```ts
values = { prompt: "What is in gitignore file", provider: "groq" }
```

Guard (`main.ts:25`):

```ts
if (!values.prompt || !values.provider) process.exit(1)
```

If either flag is missing the program exits silently with code 1.

---

### Step 4 – `getProvider(values.provider)` (`main.ts:31`)

```ts
const provider = getProvider(values.provider)   // getProvider("groq")
```

Jumps to **`src/providers/mainProvider.ts`**.

#### 4a. The registry (`mainProvider.ts:8`)

```ts
const Providers: Record<string, () => Provider> = {
  "anthropic":        createAnthropic,
  "anthropic-openai": () => createOpenAICompat("anthropic-openai", "https://api.anthropic.com/v1/", process.env.ANTHROPIC_API_KEY!, "claude-sonnet-5"),
  "groq":             () => createOpenAICompat("groq", "https://api.groq.com/openai/v1", process.env.GROQ_API_KEY!, "qwen/qwen3.8-27b")
}
```

It maps a name to a **factory function** (a function that builds a provider). Nothing is built yet – only the functions are stored.

#### 4b. The lookup (`mainProvider.ts:16`)

```ts
export function getProvider(providerName: string): Provider {
  const provider = Providers[providerName]       // the factory for "groq"
  if (!provider) throw new Error("Provider NOT FOUND")
  return provider()                              // CALL the factory
}
```

`provider()` for `"groq"` runs the arrow function, which calls:

```ts
createOpenAICompat(
  "groq",
  "https://api.groq.com/openai/v1",
  process.env.GROQ_API_KEY,
  "qwen/qwen3.8-27b"
)
```

---

### Step 5 – `createOpenAICompat` in `src/providers/openai.ts:28`

```ts
export function createOpenAICompat(name, baseURL, apiKey, defaultModel): Provider {
  const client = new OpenAI({ baseURL, apiKey });
  return {
    name,            // "groq"
    defaultModel,    // "qwen/qwen3.8-27b"
    async *stream({ messages, model, system, tools }) { ... }
  };
}
```

What happens here:

1. `new OpenAI({ baseURL, apiKey })` – the official OpenAI SDK is pointed at **Groq's** URL. Groq speaks the OpenAI protocol, so the same code works for any "OpenAI-compatible" service.
2. It returns a plain object that satisfies the `Provider` interface (`types.ts:37`):
   - `name` – `"groq"`
   - `defaultModel` – `"qwen/qwen3.8-27b"`
   - `stream` – an **async generator function** (`async *stream`). It is not run yet; it only runs when someone iterates it with `for await`.

That object travels back: `createOpenAICompat → Providers["groq"] → getProvider → main.ts` and is stored in the `provider` constant.

---

### Step 6 – `main.ts` builds the initial state

```ts
const messages: Message[] = [{ role: "user", content: values.prompt }]
const model = ""
if (!tools) process.exit(1)
```

- `messages` is the conversation history. It starts with one entry:
  `[{ role: "user", content: "What is in gitignore file" }]`
- `model` is an empty string (see [Known issues](#known-issues)).
- `tools` is imported from `mainTools.ts`:

```ts
export const tools: Tool[] = [ readTool ];
```

`readTool` (`readTool.ts`) is an object with:
- `name: "read"`, `description`, and a JSON-schema `parameters` (needs a `path` string) – this part is **sent to the model** so it knows the tool exists.
- `execute(args)` – this part runs **locally**: `readFile(resolve(process.cwd(), String(args.path)), "utf8")`.

(`callModel1()` at `main.ts:38` is an older single-shot version; it is defined but never called – `// callModel1()` is commented out.)

---

### Step 7 – `runAgent(...)` starts (`main.ts:57` → `agent/loop.ts:26`)

```ts
await runAgent({ provider, model, tools, messages, onEvent(event) { ... } });
```

`onEvent` is the callback `main.ts` passes so the loop can report progress for printing to the terminal.

Inside `runAgent`:

```ts
const maxTurns = opts.maxTurns ?? 20;
const push = (message) => { messages.push(message); onEvent({ type: "message", message }); };
```

`push` adds a message to the shared `messages` array (the same array created in `main.ts`) and emits a `"message"` event.

---

### Step 8 – The agent loop, turn 1: ask the model

```ts
for (let turn = 1; turn <= maxTurns; ++turn) {
  let assistant: AssistantMessage | undefined
  for await (const event of provider.stream({ messages, model, system, tools })) {
    if (event.type === "text_delta") onEvent({ type: "text", delta: event.delta })
    else assistant = event.message
  }
```

`provider.stream(...)` now **actually runs** the generator from `openai.ts:33`:

1. **Convert messages** – `toOpenAI(messages)` (`openai.ts:5`) turns our internal format into OpenAI's:
   - `user` → `{ role:"user", content }`
   - `assistant` → `{ role:"assistant", content: text|null, tool_calls: [...] }` (arguments are `JSON.stringify`-ed)
   - `toolResult` → `{ role:"tool", tool_call_id, content }`
2. **Send request** – `client.chat.completions.create({ model: defaultModel, stream: true, stream_options: { include_usage: true }, messages, tools })`.
   Each tool is mapped to `{ type:"function", function:{ name, description, parameters } }`, so Groq is told about the `read` tool.
3. **Read the stream chunk by chunk** (`for await (const chunk of stream)`):
   - `delta.content` → append to `text` and `yield { type:"text_delta", delta }` (this is what makes text appear live).
   - `delta.tool_calls` → tool calls arrive in pieces. The first piece carries `id` + `name`, later pieces only add to `arguments`, so they are accumulated in `calls[index].args` as a string.
   - `finish_reason` → `"tool_calls"` ⇒ `stopReason = "toolUse"`, `"length"` ⇒ `"length"`, otherwise stays `"stop"`.
   - `chunk.usage` (last chunk) → token counts.
4. **Assemble the final message** (`openai.ts:81`): text block (if any) + a `toolCall` block per accumulated call (`JSON.parse(args)`), and force `stopReason = "toolUse"` if any tool call exists.
5. `yield { type:"done", message: { role:"assistant", content, usage, stopReason } }`.

Back in `loop.ts`:
- every `text_delta` → `onEvent({type:"text"})` → `main.ts` does `process.stdout.write(event.delta)` (streaming text to the screen);
- the `done` event stores the final message in `assistant`.

---

### Step 9 – Record the answer

```ts
if (!assistant) throw new Error('assistant khali h ')
push(assistant);                                    // messages now has user + assistant
onEvent({ type: "turn_end", message: assistant })   // main.ts prints provider / model / tokens / stopReason
if (assistant.stopReason !== "toolUse") return;     // normal answer → DONE
```

If the model just answered with text, `stopReason` is `"stop"` and the function returns – the program ends.

---

### Step 10 – If the model asked for a tool (`stopReason === "toolUse"`)

For a prompt like "What is in gitignore file" the model will likely respond with a tool call such as `read({ path: ".gitignore" })`.

```ts
for (const call of assistant.content) {
  if (call.type !== "toolCall") continue;           // skip text blocks
  onEvent({ type: "tool_start", call });            // main.ts prints the tool name
  try {
    const tool = tools.find((t) => t.name === call.name);   // find "read"
    if (!tool) throw new Error(`unknown tool name ${tool}`)
    result = await tool.execute(call.arguments)             // readFile(.gitignore)
  } catch (e) {
    result = `Error ${...}`; isError = true                 // errors go back to the model
  }
  onEvent({ type: "tool_end", call, result, isError })      // main.ts prints line count (or the error)
  push({ role: "toolResult", toolCallId: call.id, toolName: call.name, content: result, isError })
}
```

The file contents become a `toolResult` message appended to `messages`. The `for` loop then goes to **turn 2**.

---

### Step 11 – Turn 2 (and onward)

`messages` is now:

```
[
  { role:"user",       content:"What is in gitignore file" },
  { role:"assistant",  content:[ toolCall read {path:".gitignore"} ], stopReason:"toolUse" },
  { role:"toolResult", toolCallId, toolName:"read", content:"<file text>", isError:false }
]
```

`provider.stream(...)` is called again with the **whole history**. `toOpenAI` converts the tool result to `role:"tool"`, the model reads the file content and now writes a text answer, streamed to the terminal. `stopReason` is `"stop"` → `runAgent` returns.

If the model keeps calling tools, the loop repeats up to `maxTurns` (20), after which it throws `stopped after 20 khtm`.

---

### Step 12 – End

`await runAgent(...)` resolves, `main.ts` has nothing left to do, and Node exits.

---

## 3. How `main.ts` prints events (`onEvent`)

| Event          | Emitted by                    | What `main.ts` does                                   |
|----------------|-------------------------------|-------------------------------------------------------|
| `text`         | each `text_delta` from stream | `process.stdout.write(delta)`                         |
| `tool_start`   | before `tool.execute`         | prints the tool name                                  |
| `tool_end`     | after `tool.execute`          | prints error text, or number of lines in the result   |
| `turn_end`     | after each model response     | prints `provider ... model ... in ... out ... stopReason` |
| `message`      | every `push()`                | (not handled in `main.ts`)                            |

---

## 4. The Anthropic path (`-x anthropic`)

Same flow except at step 4/5: the registry entry is `createAnthropic` (`anthropic.ts:26`) instead of `createOpenAICompat`.

Differences inside `stream`:
- Uses `client.messages.stream(...)` from `@anthropic-ai/sdk` and `toAnthropic(messages)`.
- `toolResult` is sent as a **user** message containing a `tool_result` block (Anthropic's requirement).
- Events are different: `content_block_start` creates a text/toolCall block, `content_block_delta` yields `text_delta` or accumulates `input_json_delta` (tool arguments JSON), `content_block_stop` parses the JSON.
- `stop_reason`: `tool_use → "toolUse"`, `max_tokens → "length"`, else `"stop"`.
- It yields the same `{type:"text_delta"}` / `{type:"done"}` events, so `loop.ts` does not care which provider is used – that is the point of the `Provider` interface in `types.ts`.

---

## 5. Key types (`src/types.ts`)

| Type | Meaning |
|------|---------|
| `Message` | `UserMessage` \| `AssistantMessage` \| `ToolResultMessage` – the history format shared by everything |
| `ContentBlock` | `TextBlock` \| `ToolCallBlock` – parts of an assistant message |
| `StopReason` | `"stop"` \| `"length"` \| `"toolUse"` – why the model stopped |
| `ToolSpec` / `Tool` | what the model sees (name, description, parameters) / plus the local `execute()` |
| `StreamEvent` | `text_delta` or `done` – what `provider.stream()` yields |
| `Provider` | `{ name, defaultModel, stream(opts) }` – the contract each provider implements |

---

## Known issues

Things noticed while tracing the code (not changed):

1. **`model` is always `""`** (`main.ts:33`). The `-m` flag is parsed but never used.
   - `openai.ts:40` ignores the `model` argument and always sends `defaultModel`, so Groq works anyway.
   - `anthropic.ts:37` uses `model` directly, so `-x anthropic` would send an empty model name and fail. A fix would be `model = values.model ?? provider.defaultModel`.
2. **`console.log(values)`** (`main.ts:29`) prints the parsed args on every run (debug output).
3. **Error message bug** (`loop.ts:57`): `unknown tool name ${tool}` prints `undefined`; it should print `call.name`.
4. **Stale imports** in `main.ts`: `Groq` (`groq-sdk`) is imported but unused.
5. `process.exit(1)` when `-p`/`-x` is missing gives no message – a usage hint would help.
6. Model IDs in `mainProvider.ts` (`qwen/qwen3.8-27b`, `claude-sonnet-5`) should be verified against what each service actually offers.
