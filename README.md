# Harness

A small command-line AI agent written in TypeScript. Give it a prompt and a provider; it streams the model's answer to your terminal and lets the model call local tools (currently: reading a file).

```bash
mypi -p "What is in the .gitignore file?" -x groq
```

## Features

- **Multiple providers behind one interface:** Groq, Anthropic (native API) and Anthropic through its OpenAI-compatible endpoint.
- **Streaming output:** text appears as the model produces it.
- **Tool calling agent loop:** the model can request a tool, the result is sent back, and the loop repeats until the model answers (max 20 turns).
- **`read` tool:** reads a text file relative to the current folder.
- **Token usage:** prints provider, input/output tokens and stop reason after each model turn.

## Setup

Requires Node.js 18.3+.

```bash
npm install
cp .env.example .env     # then fill in your keys
```

`.env`:

```
GROQ_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
```

(`GEMINI_API_KEY` is listed in `.env.example` but no Gemini provider is wired up yet.)

## Usage

```bash
# run directly
npm run dev -- -p "your prompt" -x groq

# or install the `mypi` command globally from this folder
npm link
mypi -p "your prompt" -x anthropic
```

| Flag | Short | Description |
|---|---|---|
| `--prompt` | `-p` | The prompt to send (required) |
| `--provider` | `-x` | Provider name (required): `groq`, `anthropic`, `anthropic-openai` |
| `--model` | `-m` | Parsed, but **not used yet** (each provider uses its default model) |

If `-p` or `-x` is missing, the program exits with code 1.

## How it works

```
mypi -p "..." -x groq
   → src/main.ts            parse args, create provider, build messages
   → src/providers/*        turn messages into the provider's API format and stream the reply
   → src/agent/loop.ts      model → run requested tools → model → ... until done
   → src/tools/*            tools the model can call
```

For the full line-by-line walkthrough, see [FLOW.md](./FLOW.md).

### Project structure

```
bin/mypi.js                     CLI entry point (registers tsx, loads src/main.ts)
src/main.ts                     args, wiring, terminal output
src/types.ts                    shared types (Message, Provider, Tool, ...)
src/providers/mainProvider.ts   provider registry + getProvider()
src/providers/openai.ts         OpenAI-compatible provider (Groq, Anthropic-compat)
src/providers/anthropic.ts      native Anthropic provider
src/agent/loop.ts               runAgent() agent loop
src/tools/mainTools.ts          list of enabled tools
src/tools/readTool.ts           the `read` tool
```

### Adding a provider

Add one entry to the `Providers` map in `src/providers/mainProvider.ts`. For any OpenAI-compatible API:

```ts
"myprovider": () => createOpenAICompat("myprovider", "https://api.example.com/v1", process.env.MY_KEY!, "model-id"),
```

### Adding a tool

Create an object with `name`, `description`, JSON-schema `parameters` and an async `execute(args)` (see `src/tools/readTool.ts`), then add it to the `tools` array in `src/tools/mainTools.ts`.

## Current limitations

- One-shot only: no interactive chat and no saved sessions.
- Only the `read` tool is enabled, and it is not restricted to the project folder.
- The `-m` flag is ignored.
- No tests, retries or cost tracking.
