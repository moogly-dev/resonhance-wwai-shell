# 04 — Rituals

Revision: 2026-11-24

Format of a ritual: heading `### R-n`, then Trigger, Commands (for Git Bash, with what is expected), Serves (project ritual) or Selection (Claude's automation: "trial until YYYY-MM-DD; measure: …", or "kept on YYYY-MM-DD: evidence"), Status (provisional | active). Every command the user runs or approves is recorded here and comes back at its trigger; every script and hook too, with how to remove it, otherwise `npm run check:ai` fails. A Claude automation starts on trial and stays only through measured use (`ai/claude/usage.json`): when the trial ends, or 90 days after being kept, `npm run check:ai` flags it, and Claude keeps it with its evidence or removes it.

## Project

The application's commands (database, migrations, deployment…), according to the Foundation.

## Claude's automations

### R-1

- **Trigger:** After any change to `ai/` or to a reference in the code, by Claude
- **Commands:** `npm run check:ai` (`ai/scripts/check-ai.mts`, tested by `ai/scripts/check-ai.test.mts`) — expected: `0 error(s)`; `--details` gives the full lists. Checks formats, references and indexes; isolates Claude's sources (M), which nothing in the project cites; refuses a decision resting on a rank-3 source alone; holds the fence of Claude's scripts (no network, no spawned process, no home folder, no `.env`); flags candidates for extinction, ended trials and an oversized permanent context. The checked code folders (`CODE_DIRS`, at the top of the script) follow the stack of the Foundation
- **Selection:** kept on 2026-11-18: core of the method, proven on Resonhance
- **Status:** provisional

### R-2

- **Trigger:** Automatic: each event declared by `.claude/settings.json` (session start, before each tool, end of turn)
- **Commands:** `.claude/settings.json` calls `node ai/scripts/hook.mts` (tested by `ai/scripts/hook.test.mts`) for each event, and no longer changes; the received event picks the handler (M-1). Session start: working memory created if missing, purge (R-6), removal of `ai/onboarding.md` once onboarding is finished (copy in `ai/bin/`), report of `ai/scripts/check-ai.mts`, reduced to errors after a summary, and record of the errors already there. End of turn: check only if Claude has written, block once and only on errors born during the session. Change: edit `ai/scripts/hook.mts`. Remove an event: by the user, in `.claude/settings.json`, then `/hooks`
- **Selection:** trial until 2026-12-11; measure: end-of-turn blocks (`check-ai:block`) all due to the turn, no off-topic report flagged by the user
- **Status:** provisional

### R-3

- **Trigger:** Before deleting an item or changing several files of `ai/`, by Claude
- **Commands:** `npm run ai:bin -- <subject> [paths]` (`ai/scripts/ai-bin.mts`, tested by `ai/scripts/ai-bin.test.mts`) — copies to `ai/bin/<date>-<subject>/`, all of `ai/` without a path, never replacing a copy; keeps only the 10 most recent copies; `npm run ai:bin -- --prune` tidies without copying
- **Selection:** kept on 2026-11-18: safety net proven on Resonhance
- **Status:** provisional

### R-4

- **Trigger:** Batch of changes to `ai/`, by Claude, instead of a disposable script
- **Commands:** `npm run ai:apply -- ai/tmp/claude/batch.json` (`ai/scripts/ai-apply.mts`, tested by `ai/scripts/ai-apply.test.mts`), then `npm run check:ai` — copies to `ai/bin/`, numbers sources (S, or M with `"for": "claude"`) and questions, keeps their indexes, writes nothing if a replacement fails, removes the batch once applied; the section of a new source already exists in its index
- **Selection:** kept on 2026-11-18: proven on Resonhance
- **Status:** provisional

### R-5

- **Trigger:** Automatic: before each write or command of Claude's
- **Commands:** `ai/scripts/hook.mts`, `PreToolUse` event, through `ai/scripts/guard-paths.mts` (tested by `ai/scripts/guard-paths.test.mts`): refuses any path in AppData; Claude's working folder is `ai/tmp/claude/`, out of git. Also refuses to run through `node` an `ai/` script, disposable ones included, that crosses the fence of R-1. Finally refuses what raises a permission prompt at every call: the PowerShell tool (permissions are written for Bash) and `node -e` code (which also escapes the fence); the refusal says what to do instead. Remove: take the call out of `hook.mts` and update this ritual
- **Selection:** kept on 2026-11-18: the user's rule; measure: refusals (`guard-paths:refused`); prompts avoided (`guard-paths:prompt`) on trial until 2026-12-24, user feedback of 2026-11-24 on the prompts of resonhance-web-extension
- **Status:** provisional

### R-6

- **Trigger:** Automatic: session start
- **Commands:** `ai/scripts/hook.mts`, `SessionStart` event, through `ai/scripts/ai-tmp.mts` (tested by `ai/scripts/ai-tmp.test.mts`): removes from `ai/tmp/claude/`, Claude's disposable files (trial scripts, captures, hook state), what is older than 24 h; the root of `ai/tmp/` belongs to the user and is never purged; `npm run ai:tmp -- --all` empties the folder without waiting. Remove: take the call out of `hook.mts` and update this ritual
- **Selection:** kept on 2026-11-18: proven on Resonhance
- **Status:** provisional

### R-7

- **Trigger:** After any change to a script of `ai/scripts/`, by Claude
- **Commands:** `npm run lint:ai` (types of the scripts, through `ai/scripts/tsconfig.json`), then `cd /D/<project path> && npm run test:ai` (through `ai/scripts/vitest.config.mts`, apart from the application's tests) — no type error; the scripts' tests (`ai/scripts/*.test.mts`) all pass; a new behaviour comes with its test. On Windows, uppercase drive letter: from `/d/…`, Vitest loads twice and fails ("Cannot read properties of undefined (reading 'config')"), checked on 2026-11-18
- **Selection:** kept on 2026-11-18: proven on Resonhance
- **Status:** provisional

### R-8

- **Trigger:** Automatic: before each tool call of Claude's
- **Commands:** `ai/scripts/hook.mts`, `PreToolUse` event, through `ai/scripts/usage.mts` (tested by `ai/scripts/usage.test.mts`): keeps the usage ledger `ai/claude/usage.json`, files of `ai/` read and written, scripts run, reminders and blocks, with a count and a date; never the text of a command nor the content of a file. It feeds the selection of R-1. Remove: take the call out of `hook.mts`, then delete the ledger
- **Selection:** trial until 2026-12-11; measure: candidates for extinction it settles, with no false living or false dead flagged by the user
- **Status:** provisional

### R-9

- **Trigger:** Automatic: before each tool call of Claude's, only when the call touches a rule
- **Commands:** `ai/scripts/hook.mts`, `PreToolUse` event, through `ai/scripts/reminders.mts` (tested by `ai/scripts/reminders.test.mts`): a reminder in context, without blocking, once per session and per subject. Authority of sources, at the first web search or the first batch of sources; source first, when Claude writes an objective, a decision or a feature without a web search in the session; economy, when reading an image, a heavy file or a tool declared heavy (R-10); bin, before deleting or moving in `ai/`. Remove a reminder: take it out of `reminders.mts`
- **Selection:** trial until 2026-12-11; measure: reminders given (`reminders:*`) followed by effect, none judged off-topic by the user
- **Status:** provisional

### R-10

- **Trigger:** Before reading a long content (page, API response, log, PDF) or comparing two versions of a document, by Claude; automatic: before each `Read`
- **Commands:** `npm run peek -- <file> [--path a.0.b] [--around word] [--diff other] [--head n]` (`ai/scripts/peek.mts`, tested by `ai/scripts/peek.test.mts`): shape and sizes, excerpts around a word, changed lines; a large output is first redirected to `ai/tmp/claude/`. `ai/scripts/hook.mts`, `PreToolUse` event, through `ai/scripts/economy.mts` (tested by `ai/scripts/economy.test.mts`): refuses the whole read of a file over 60 KB, images aside; the project's tools that bring a whole page are declared in `HEAVY_TOOLS`. Remove: take the `oversizedRead` call out of `hook.mts`, the `peek` script out of `package.json`, and update this ritual
- **Selection:** trial until 2026-12-24; measure: refusals (`economy:refused`) and reminders (`reminders:economy`) followed by a reduced read, none judged wrongly blocking; proven on resonhance-web-extension, the user's rule of 2026-11-24: find the smartest, most efficient and cost-effective method before each process
- **Status:** provisional

### R-11

- **Trigger:** Once, by the user, to plug the shell into an existing project (README)
- **Commands:** from the project's root, `node ../wwai-shell/ai/scripts/install.mts` (`ai/scripts/install.mts`, tested by `ai/scripts/install.test.mts`): copies `ai/` without what is born from use; stops without touching anything if the project already has an `ai/` folder or an unreadable `package.json`; overwrites nothing: a file already there keeps its content and the shell's version waits in `ai/merge/`, JSON files only gain missing keys, `.gitignore` and `.ignore` only lines at the end. Remove: delete the script and its test
- **Selection:** trial until 2026-12-24; measure: installations done without loss, user feedback of 2026-11-24 (plugging the shell into an existing project must neither destroy nor replace anything)
- **Status:** provisional
