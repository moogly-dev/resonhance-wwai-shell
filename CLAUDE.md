# AI workflow

## Always loaded

@ai/session.md
@ai/improvements.md

- Language: everything in the repository is written in English (code, comments, commits, `ai/` artefacts); Claude answers the user in the user's language, and quotes their words as they wrote them.
- Nothing mentions Claude or Anthropic (no "Co-Authored-By" line, no signature).
- You never edit CLAUDE.md unless the user asks: any rule or correction is returned in the conversation, as before -> after, and the user applies it.
- No secret value (password, token, connection URL) is written: only the variable's name.
- Nothing in AppData nor outside the project: Claude's disposable files go in `ai/tmp/claude/` (purged after 24 h, the root of `ai/tmp/` belongs to the user), a recurring task becomes a script in `ai/scripts/`; Claude's memory is `ai/`, never the automatic memory outside the project.
- A file of Claude's tooling rather than of the application, outside `ai/`, is flagged for exclusion in `.gitignore`.
- The documents in `context/` are unofficial premises, to read on request only.

## `ai/` artefacts

Order of authority: conversation and `## Foundation` → `ai/00-objectives.md` (O, the vision of the project) → `ai/01-decisions.md` (D) → `ai/features/` (F).

| Artefact                  | Id              | It answers                                                         |
| ------------------------- | --------------- | ------------------------------------------------------------------ |
| `ai/00-objectives.md`     | O-n             | What must the project achieve, and how is it measured?             |
| `ai/01-decisions.md`      | D-n             | Which choice commits several features, and what does it change?   |
| `ai/02-glossary.md`       | G-n             | What does this word mean here?                                     |
| `ai/03-texts.md`          | T-n             | Which text is waiting to enter the code?                           |
| `ai/04-rituals.md`        | R-n             | Which command or reminder, at which trigger?                       |
| `ai/05-code-guideline.md` | P-n, U-n, C-n   | How to write the code and the interface?                           |
| `ai/features/`            | F-n, R<m>, A<m> | What does this feature do, is it in scope, how to verify it?       |
| `ai/issues/`              | Q-n             | What remains to settle?                                            |
| `ai/sources/`             | S-n             | What do we know, and where does it come from?                      |
| `ai/claude/sources/`      | M-n             | What does Claude know of its tools and method, and where from?     |

- Each card folder opens with its `INDEX.md`: read it first, then only the target card.
- `active` = in production, nothing else; the rest is `provisional` and only comes back to the user if they open the subject.
- Agreement: creating, deleting or downgrading an O, D, F or Q is proposed in the conversation, with its reason, and only written once accepted by the user. Sources, searches and reference fixes go directly.
- The user's words go into the item they ground: statement of an objective, reason of a decision, statement of a question.
- A decision commits a choice and says what it changes; never a restatement of an objective.
- A change of line shows in the cards' `scope` (`project` | `secondary`), never in a decision that downgrades.
- Selection: before creating, look for the item that already carries the information. What Claude creates starts on trial and only stays through measured use (`ai/claude/usage.json`); what no living item reaches and nobody has used past the threshold of `npm run check:ai` leaves, sources and tooling by Claude, O, D, F and Q by the user.
- Sources: before proposing a stack, an objective, a decision or a feature, Claude searches the web right away for the highest authority of the field (ranks of `ai/sources/INDEX.md`) and cites it; a rank 3 is only a lead, to trace back to its primary source, and alone grounds no decision. What only serves Claude goes in `ai/claude/sources/`, which nothing in the project cites.
- References: full identifier (`F-n R<m>`) or path, never a bare file number. An item cites what grounds it, never what depends on it; a question and its items cite each other; a source cites no project item. A code file only cites a non-active item if it starts with `// PROVISIONAL (F-n R<m>)`.
- Formats: templates `ai/templates/feature.md`, `ai/templates/question.md`, `ai/templates/source.md`; each numbered file gives its own at the top. An answered question is deleted after supporting its items.
- `npm run check:ai` checks formats, references, indexes, sources and selection: it must finish without error before presenting.
- `ai/` is out of the project's git: `npm run ai:bin -- <subject> [paths]` before deleting or changing several files; a batch goes through `npm run ai:apply`, which removes the batch from `ai/tmp/` once applied. `ai/bin/` alone keeps its 10 most recent copies: a safety net, not an archive.
- `ai/session.md` carries the current task in the user's words: validated steps (10 at most), current point, pending points, doubts, and the tone of the exchange (mood, posture, expected form). One line per item, replaced; read again after any summary, emptied at the end of the task.
- `ai/improvements.md`: what Claude notices and only the user can apply to make it more effective (CLAUDE.md rule, file layout, tooling, tokens spent needlessly); under NEGATIVE the problem and its solution, under POSITIVE the improvement. Claude records it without mentioning it; what it can apply itself, it applies and does not record. At three items, say so in one sentence, when the moment fits.

## Foundation

- **the problem:** <to fill: what is wrong today, and for whom>
- **the solution sought:** <to fill: what the project brings, and to whom>
- **the goal:** <to fill: what will be true once the project succeeds>
- **heading:** <to fill: the current direction; a choice this heading settles is made without asking, structuring grey areas are raised>

**the issues:**

1. <to fill: one issue per line>

- <to fill: project name>: <to fill: nature, audience, access, languages>.
- Stack: <to fill: framework, language, styling, runtime version>; exact versions: the project's manifest.
- Data: <to fill: database, client, migrations; only the names of the environment variables>.
- Texts: <to fill: translation tool and languages folder>; tests: <to fill> (the scripts of `ai/scripts/` through `npm run test:ai`); lint: <to fill>.
- Git and deployment: <to fill: who runs git, Claude or the user>; branches `feat/<name>` created from <to fill: integration branch>; <to fill: what a push triggers on each branch>.
- Commits: in English, on one line, `type(scope): summary`; a big change may need a multi-line message, following `ai/git-commits.md`.
- Development order: the cards with `Scope: project` in `ai/features/INDEX.md`, <to fill: the base first, then the order of branches>.
- Backup: <to fill: where and how often the whole project is backed up, `ai/`, `CLAUDE.md` and `.claude/` included, since they are out of git>.

## Code

- Read, follow and improve `ai/05-code-guideline.md`.
- Reproduce verbatim any text of `ai/03-texts.md`; once in the code, remove it from the artefact.
- Cite `F-n R<m>` in the code and `F-n A<m>` in test names.

## Answers and autonomy

- You settle alone all the coding, interface trade-offs included, and the tooling (scripts, checks, hooks through `ai/scripts/hook.mts`, artefact layout), according to the guideline, summarised in one line. You improve it without waiting to be asked, behind the fence of `npm run check:ai` (no network, no spawned process, no `.env`, no home folder); the user has the last word. What comes back to the user: the direction of the project (product, features, what users receive), security and personal data, law, the meaning of a rule or decision, CLAUDE.md, and anything irreversible, dangerous, breaking or public.
- Read the person before applying a format: length, tone and form follow their message and their mood of the moment. A brief message calls for a concise answer, never a casual tone: the writing stays careful and rigorous, whatever the form of the message; an open reflection calls for an exchange, irritation calls for acknowledging and correcting without justifying; a change of posture (from exploring to executing, from confidence to doubt) is recognised and adjusted to. Interpret the intent rather than the letter; when in doubt, a single question, simply asked. Prose first; lists, headings and tables when the content has that shape.
- A decision that is the user's: the problem, 2 to 4 options with one recommended, then wait; the rest is carried out without asking. No reflexive recap or stock phrase; the next step when there is one.
- Commands for Git Bash; git is run by whoever the Foundation names. Every command the user runs or approves is recorded in `ai/04-rituals.md` and comes back at its trigger.
- Making a rule last means having an automatic check carry it whenever possible; hooks and scripts are recorded in `ai/04-rituals.md`.

## Reading files

- Golden rule: before each task, pick the method that costs the least context. A long content is never read whole: first reduce it by script (`npm run peek`), send a large output to `ai/tmp/claude/`, and iterate.
- Find: `Glob` (e.g. `**/INDEX.md`); search: `Grep` (`-i`, `-n`, `-A`, `head_limit`); read an excerpt: `Read` with `offset` and `limit`.
- Bash only for the project's scripts and commands (lint, tsc, tests, build…), never to read or search: no variables (`f=...`), no `$(...)` substitutions, no `;` or `|` chains.
