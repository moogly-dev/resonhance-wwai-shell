# Onboarding

Claude's path the first time the shell is used in a project, flagged by `npm run check:ai` as long as this file exists. It does not apply in the shell's own repository.

Claude leads: no questionnaire, nothing for the user to read. This file removes itself at the session start following a finished onboarding (Foundation without "to fill", one objective set, `gitignore.project` handled, `ai/merge/` emptied), a copy kept in `ai/bin/`.

1. **A single question**: "What's your project?" In an existing project, first read its README, its manifest (`package.json` or equivalent) and its file tree, and only ask what they do not say.
2. **Source right away, in the same turn**: search the web for the highest authority on each point at stake (official documentation of the targeted frameworks, APIs and platforms in their current version, standards, law as soon as personal data is involved), the existing solutions of the field, and compare the possible stacks on these sources. What grounds a proposal is kept as S-n through `npm run ai:apply`. No stack and no objective proposed without these sources.
3. **Propose in one block**: the filled Foundation as before -> after (the user's words for what they said; the rest marked as Claude's proposal, with its source; "to be seen" where nothing is settled), a recommended stack and one or two alternatives (existing project: its stack, as it is), the first objective with its measure. Then iterate naturally on their answers; a question only when a choice is theirs.
4. **Nothing written without agreement**: objective, decision, feature or question are proposed in the conversation and only written once accepted; the first objective goes into `ai/00-objectives.md` with its measure.
5. **Set up behind the scenes**; what the user must run (git, deletion, installation, unless they hand git to Claude) is given to them in a single block:
   - **new project** ("Use this template", or a clone without `.git`): a `.git` whose origin is the shell's repository is removed; `mv gitignore.project .gitignore`, then, if `CLAUDE.md`, `ai/` or `.claude/` are already tracked, `git rm -r --cached CLAUDE.md ai .claude .ignore` (files kept on disk); project name in the manifest; the stack's creation tool; the application's README instead of the shell's; `LICENSE` and `docs/` kept or removed as the user wishes;
   - **existing project** (installed by `ai/scripts/install.mts`, which overwrote nothing): each file in `ai/merge/` is the shell's version of a file the project already had; Claude proposes the merge as before -> after, the user accepts, then the file in `ai/merge/` is removed. For `CLAUDE.md`, add the shell's rules without removing the team's. Never `git rm`, never rewrite an existing file without agreement;
   - `npm install`, `npm run check:ai`, `npm run test:ai` (on Windows, from `/D/…`, uppercase drive letter, otherwise Vitest fails);
   - `CODE_DIRS` and `CODE_FILE` of `ai/scripts/check-ai.mts` according to the stack;
   - `git init` if there is no `.git`, then a commit in English, without attribution; the remote repository if the user wants one and has none;
   - in one line, the recommended global settings (`docs/claude-settings.md` of the shell's repository), to take or leave.
6. **Feedback**: each friction of this onboarding goes into `ai/improvements.md`.
