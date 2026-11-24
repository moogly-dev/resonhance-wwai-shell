# resonhance-wwai-shell

A drop-in kit that turns Claude Code from a chat you have to babysit into a tool that keeps its bearings. Project rules and memory are written in French.

## What changes compared to a plain Claude Code session

| Plain session | With the shell |
| --- | --- |
| The longer the chat, the more Claude drifts and forgets your instructions. | Goals, decisions, features and sources live in files under `ai/`. Clear the chat anytime: Claude picks up the thread. |
| You re-explain the project at every session. | One question to start (“what's your project?”); Claude drafts the project charter and you approve it. |
| Answers come from memory. | Claude searches official documentation first and cites it before proposing a stack or a decision. |
| Nothing checks the work between two messages. | Hooks check consistency at every turn and stop Claude only on errors it just introduced. |
| Notes, scripts and temp files pile up. | Anything unused for 14 days is flagged; Claude's own tools stay on trial until usage proves them. |
| Permission prompts, risky shell commands, huge files read whole. | Ready-made permissions; Claude's scripts can't reach the network, your secrets or your home folder; large files are read by excerpt. |

## Requirements

[Claude Code](https://code.claude.com), Node 24.2+, and Git Bash on Windows.

## New project

1. Signed in to GitHub, click **Use this template** → **Create a new repository**, then clone your new repository.
2. Open it in your editor, start Claude Code, accept to trust the folder, and say hello: Claude takes it from there.

## Existing project

From your project's root folder, paste this single line:

```bash
git clone --depth 1 https://github.com/moogly-dev/resonhance-wwai-shell.git ../wwai-shell && node ../wwai-shell/ai/scripts/install.mts && rm -rf ../wwai-shell
```

Then run `npm install`, open the project in Claude Code and say hello.

The installer never overwrites or deletes anything. It stops untouched if your project already has an `ai/` folder. A file you already have (`CLAUDE.md`, `.claude/settings.json`…) keeps its content: the shell's version waits in `ai/fusion/` and Claude proposes the merge. JSON files only gain missing keys, and `.gitignore` only gains lines at the end.

## How it works

- `CLAUDE.md`: working rules and the project charter.
- `ai/`: the project memory (objectives, decisions, features, sources) and Claude's scripts.
- `.claude/settings.json`: hooks that run `ai/scripts/hook.mts` at session start, before each tool call and at the end of each turn.

Optional: recommended global Claude Code settings, in French, in [docs/claude-settings.md](docs/claude-settings.md).

## Contributing

`npm install`, then `npm run lint:ai`, `npm test` and `npm run check:ai`.

## License

[MIT](LICENSE)
