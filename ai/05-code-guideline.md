# 05 — Code guideline

Revision: 2026-11-24

Format of a rule: heading `### P-n — title` (principle), `### U-n — title` (usage rule) or `### C-n — title` (convention), then Statement, Builds on, Serves, Applies to, Status (provisional | active), Origin (optional: the user's rule, dated, in their words).

## 1. Principles

Requirements common to the code and the whole interface, whatever the language and framework of the Foundation.

### P-1 — Minimal, surgical code

- **Statement:** Every line written is essential to the request: no option or case not asked for, no dead, commented-out or unused code; one file per role (C-3); conventions of the file and style of the surrounding code. A template tag and a style class count as lines of code: every wrapping element carries a semantics or a layout its parent does not already carry, every class has a visible effect. Before presenting, every line, tag and class passes the question: what do we lose if we remove it?
- **Builds on:** C-3
- **Serves:** —
- **Applies to:** all code
- **Status:** provisional

### P-2 — Native first

- **Statement:** The native element before any addition: the right HTML tag before an ARIA attribute, the API of the language, the browser or the system and the framework's own features before any library; a recent native API with a fallback by feature detection rather than a dependency; no new dependency without a decision.
- **Builds on:** —
- **Serves:** —
- **Applies to:** all code
- **Status:** provisional

### P-3 — Layers

- **Statement:** A layer only relies on the ones below it (data, logic, interface); no presentation value (colour, size, spacing, duration) hard-coded outside the common base that names it (tokens, theme, configuration).
- **Builds on:** —
- **Serves:** —
- **Applies to:** all code
- **Status:** provisional

### P-4 — Accessibility

- **Statement:** Every interface is usable with a keyboard and a screen reader, with sufficient contrast in each theme; reduced motion when the system asks for it; WCAG 2.2 level AA at least; keyboard and ARIA of components according to the WAI-ARIA Authoring Practices guide; labels, alternative texts, heading order, declared language.
- **Builds on:** P-2
- **Serves:** —
- **Applies to:** every interface
- **Status:** provisional

### P-5 — Check before presenting, at the lowest cost

- **Statement:** Before presenting, Claude runs the checks of the Foundation on what changes: types, lint and tests of the touched files; production build before any interface delivery and as soon as the configuration changes; the full suite before a delivery. Grouped checks: a single pass at the end of a block, never after each change. What shows on screen, the user checks with their own eyes: Claude says what to look at, without a measuring script or capture; a browser script only for what the eye cannot see (focus, navigation, computed value) or on request. A failure is measured before being explained; at the second failure on the same point, Claude switches to the simplest method that answers the request.
- **Builds on:** —
- **Serves:** —
- **Applies to:** all code
- **Status:** provisional

### P-6 — Personal data and secrets

- **Statement:** No personal data (IP address, identifier, entered content) written, logged or sent to a third party without a decision; an error is logged by its code, failing that by its message, never with the request or an entered value; outdated or revoked data (single-use link, session, attempt counter) is deleted at the latest at the next write; a secret is read at runtime through the name of its variable, never written in the code nor in `ai/`.
- **Builds on:** —
- **Serves:** —
- **Applies to:** all code
- **Status:** provisional

### P-7 — One input rule, written once

- **Statement:** An input rule is written only once, in a module shared by client and server; on submission, the server redoes everything and has authority, because two copies end up diverging.
- **Builds on:** —
- **Serves:** —
- **Applies to:** inputs
- **Status:** provisional

### P-8 — Approved file plan, common bases

- **Statement:** Before coding an interface or architecture request, Claude presents its file organisation plan and waits for the user's approval. The plan follows DRY, from the most general to the most specific (for the interface: layout, section, card, heading, text, then backgrounds, colours, spacing; for the logic: domain, module, function): at each step, does a common base exist? yes, use it; no, create it; two possible variants of one base, ask the user. DRY takes everything else into account (readability, accessibility, convention), hence an element-by-element treatment.
- **Builds on:** P-3 · C-3
- **Serves:** —
- **Applies to:** all code
- **Status:** provisional

### P-9 — Build piece by piece

- **Statement:** 1. Break down: each need apart; for an interaction or a process, its states and what owns them are written before the code. 2. Analyse what exists: what already carries a need is reused, what carries it amid other things is extracted from it (C-3); a verification path is recorded on what exists before touching it. 3. Source: every line rests on the official documentation of the version in use, read before writing and not summarised (framework of the Foundation, then language, then W3C, WHATWG, IETF or ISO standards, then vendor guides); the closest official example is applied to the letter; an undocumented point is flagged as such. 4. Create one piece at a time, each in its own file, from leaf to root, at the smallest that works, and test it alone before the next (test named `F-n A<m>`); no other work while it is not verified. 5. Assemble and check on every path (P-5); at the second failure, restart from the official example instead of patching. 6. All in a single turn, once the plan is approved (P-8); deliver the files, then a short table of piece, test, source.
- **Builds on:** P-1 · P-2 · P-5 · P-8
- **Serves:** —
- **Applies to:** all code
- **Status:** provisional

## 2. Usage rules

When to use which component or token, specific to the project. Added as decisions are made.

## 3. Conventions

Layout, naming, language of the code, comments.

### C-1 — Layout by module and by role

- **Statement:** What only serves one module (route, screen, domain) lives in its folder; what is shared, in a common folder organised by role (components, effects, logic, data), following the structure the framework of the Foundation recommends. An element is extracted and filed by its role, never by its number of uses; this extraction is not an abstraction in the sense of P-1.
- **Builds on:** —
- **Serves:** —
- **Applies to:** file tree
- **Status:** provisional

### C-2 — Naming

- **Statement:** Case and form of names follow the official convention of the language and framework; folders, scripts and migrations in lowercase with `-`; tests next to the code. A name comes, in order, from the official documentation, from the native element (tag, attribute, API), then from our choices debated in conversation; a new name is justified.
- **Builds on:** P-2
- **Serves:** —
- **Applies to:** all code
- **Status:** provisional

### C-3 — One file, one role

- **Statement:** Each function (state, navigation, effect, measurement, data access) and each component has its own file from its first use, named after what it does; a component assembles its functions and renders its interface, it does not compute; a function without interface goes into the logic of its domain (C-1).
- **Builds on:** C-1
- **Serves:** —
- **Applies to:** all code
- **Status:** provisional

### C-4 — Language of code and texts

- **Statement:** Code, comments and commits in English (files, folders, identifiers, text keys); the texts the users read in the languages of the Foundation. Text keys in camelCase, the namespace as first segment; translation files only carry interface labels, never content coming from data or a source.
- **Builds on:** —
- **Serves:** —
- **Applies to:** all code · translations
- **Status:** provisional

### C-5 — Comments

- **Statement:** No commented-out code left in place. A comment, rare and short, says why when the code cannot say it (external constraint, measured pitfall), never what the code does: if it needs one, the code is badly named or badly organised, rename or reorganise it. In an interface component, only the headings separating its sections, the `// F-n R<m>` markers, the `// PROVISIONAL (F-n R<m>)` marker and tool directives.
- **Builds on:** P-1
- **Serves:** —
- **Applies to:** all code
- **Status:** provisional

### C-6 — Named settings, in one place

- **Statement:** Every setting of a function or an effect (duration, delay, threshold, limit, intensity) is named and set in one place: as an uppercase constant at the top of the only file that reads it, in the common base (tokens, configuration) when several files read it. A function is understood through its organisation alone: clear names, settings at the top, named parameter types, short function.
- **Builds on:** P-3
- **Serves:** —
- **Applies to:** all code
- **Status:** provisional

### C-7 — Data through a single door

- **Statement:** Data is obtained through a dedicated access layer, server side only. As long as the database is not connected, it comes from a file laid out like database rows and read through a real asynchronous call: code that will process data tomorrow mimics the real path as closely as possible today.
- **Builds on:** P-3
- **Serves:** —
- **Applies to:** data access
- **Status:** provisional

### C-8 — Style is chosen by the caller

- **Statement:** A layout or style variant is chosen by the caller, which imports and assembles the exported styles; never a parameter that makes the called component choose its style (`variant`, `layout`, a class passed as argument): a common component only carries what does not vary. A style property has only one author per element.
- **Builds on:** C-3
- **Serves:** —
- **Applies to:** interface components
- **Status:** provisional
