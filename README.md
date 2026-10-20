# coding-agent-cli

A command-line coding agent written from scratch in TypeScript, with no agent framework. You give it a prompt and a provider. It streams the model's answer, lets the model explore and change your project through a small set of tools, and asks you before it writes anything.

```bash
mypi -p "Find where safePath is used and explain why" -x anthropic
```

I built it to learn how agents like Claude Code work underneath: the tool-calling loop, how providers differ, and how to let a model touch files safely.

## What it does

- **Agent loop** (`src/agent/loop.ts`): stream a model turn, run any tool calls, send the results back, repeat until the model stops. Stops after 20 turns by default. A failing tool becomes an error result the model can see, so it can retry or change course.
- **Four providers behind one interface:** native Anthropic, plus Groq, Gemini and Anthropic's OpenAI-compatible endpoint through one OpenAI-style adapter. Each provider converts the shared message format to its own API shape.
- **Seven tools:** `read`, `ls`, `find`, `grep`, `write`, `edit`, `bash`.
- **System prompt with project context:** a default prompt tells the model to look with tools before answering. If the project folder has an `AGENTS.md`, it is added automatically. `--system` swaps the default text.
- **Confirmation before changes:** `write` and `edit` show a preview and wait for `y`. Without an interactive terminal they refuse.
- **Tracing:** every model call is traced to Langfuse through OpenTelemetry when keys are set. Without keys nothing is sent.
- **Tests:** 48 Vitest tests, all passing.

## Tools

| Tool | Does | Limits and guards |
|---|---|---|
| `read` | Read a file, optionally a line range (`offset`, `limit`) | inside project root; output cut to 2000 lines / 50 KB |
| `ls` | List a directory, folders end with `/` | inside project root; max 500 entries |
| `find` | Find files by glob (`*.ts`, `src/**/*.ts`) | skips `node_modules` and `.git`; max 200 results |
| `grep` | Regex search, prints `file:line: text` | skips binaries and files over 1 MB; max 100 matches |
| `write` | Create or overwrite a file | inside project root; asks first, labels overwrites `OVERWRITE` |
| `edit` | Replace one exact piece of text | inside project root; text must match exactly once; asks first |
| `bash` | Run a shell command in the current folder | 30 s default timeout, kills the process tree on timeout, keeps the last 2000 lines / 50 KB |

**Safety notes**

- `safePath` rejects any path that resolves outside the project root (`../x`, absolute paths).
- For `write` and `edit`, the path and input checks run *before* the confirmation prompt, so you are never asked to approve something that would fail. Answering anything except `y` or `yes` leaves the disk untouched.
- The prompt goes to stderr so it does not mix with the streamed model text.
- **`bash` is not confirmed or sandboxed.** The model can run any command your user can. Use it on projects you trust.

## Getting started

Requires Node.js 18.3 or newer. On Windows, `bash` needs Git for Windows (Git Bash).

```bash
git clone https://github.com/<your-username>/coding-agent-cli.git
cd coding-agent-cli
npm install
cp .env.example .env     # fill in the keys for the providers you use
```

```
GROQ_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
# optional tracing
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_BASE_URL="https://cloud.langfuse.com"
```

### Run

```bash
npm run dev -- -p "What is in the .gitignore file?" -x groq

# or install the `mypi` command from this folder
npm link
mypi -p "Add a TODO comment to src/main.ts" -x anthropic
mypi -p "Review src/tools/bash.ts" -x anthropic -s "You are a strict code reviewer. Be brief."
```

| Flag | Short | Description |
|---|---|---|
| `--prompt` | `-p` | Prompt to send (required) |
| `--provider` | `-x` | `anthropic`, `anthropic-openai`, `groq` or `gemini` (required) |
| `--model` | `-m` | Model override; each provider has a default |
| `--system` | `-s` | Replace the default system prompt (`AGENTS.md` is still added) |

After each model turn it prints the provider, input tokens, output tokens and stop reason.

### Test

```bash
npm test
```

## How it is built

```
bin/mypi.js                      registers tsx so Node runs the .ts files directly
src/main.ts                      parse args, build provider and system prompt, print events
src/Langfuse.ts                  load .env, start tracing (must be imported first)
src/systemPrompt.ts              default system prompt + AGENTS.md loading
src/types.ts                     Message, Tool, Provider, StreamEvent
src/agent/loop.ts                runAgent(): the loop
src/providers/mainProvider.ts    name -> provider registry
src/providers/anthropic.ts       native Anthropic provider
src/providers/openai.ts          OpenAI-compatible provider (Groq, Gemini, Anthropic compat)
src/tools/*.ts                   one file per tool, plus safePath, confirm, truncate, walk
tests/                           Vitest suites for paths, truncation, tools, write/edit, system prompt
```

One difference the provider layer hides: Anthropic wants a tool result inside a *user* message, while OpenAI-style APIs use a separate `tool` role. The loop and the tools only see the shared format.

For a line-by-line trace of one run, see [FLOW.md](./FLOW.md).

### Add a provider

Add one entry to the `Providers` map in `src/providers/mainProvider.ts`:

```ts
"myprovider": () => createOpenAICompat("myprovider", "https://api.example.com/v1", process.env.MY_KEY, "model-id"),
```

### Add a tool

Create an object with `name`, `description`, JSON-schema `parameters` and an async `execute(args)` (see `src/tools/readTool.ts`), then add it to the array in `src/tools/mainTools.ts`.

## Limitations

- One prompt per run: no interactive chat and no saved sessions.
- No retries, rate-limit handling or cost tracking. A provider error ends the run.
- No context-window management; long runs keep the full history.
- `bash` has no confirmation or sandbox.
- `safePath` checks the path text only and does not resolve symlinks.

## Next steps

- Interactive mode with session history
- Confirmation or an allowlist for `bash`
- Retries with backoff and friendlier errors for bad API keys
- Trimming or summarizing old turns

## Stack

TypeScript · Node.js · Anthropic SDK · OpenAI SDK · OpenTelemetry · Langfuse · Vitest · tsx
