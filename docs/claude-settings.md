# recommended settings.json configuration (Windows, npm, TypeScript, Vitest base)

> Located at `~/.claude/settings.json`, i.e. `C:\Users\<you>\.claude\settings.json`;  
> This file sets Claude's global permissions for all your projects.

Each project also has its own permissions (managed automatically by Claude through _prompts_ in conversation):

- `.claude/settings.json` for the hooks and their run command, and the project's shared permissions (versioned);
- `.claude/settings.local.json` for your personal _deny_, _ask_ and _allow_ permissions on the project (not versioned: Claude records your "always allow" there);

> src: [code.claude.com/docs/en/settings](https://code.claude.com/docs/en/settings);  
> tip: if their site breaks, **disable JavaScript** for [https://code.claude.com](https://code.claude.com) in your **browser** **settings**.  
> the blocks below are excerpts to merge into your file, not to copy as is: the `// ...` are not valid JSON.

---

By default, Claude may run these read-only commands: `ls`, `cat`, `echo`, `pwd`, `head`, `tail`, `grep`, `find`, `wc`, `which`, `diff`, `stat`, `du`, `cd` and the read-only forms of `git`

> src: [code.claude.com/docs/en/permissions#read-only-commands](https://code.claude.com/docs/en/permissions#read-only-commands)

## Permission mode

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "defaultMode": "acceptEdits",
    "disableBypassPermissionsMode": "disable",
    "disableAutoMode": "disable"

    // ...
  }
}
```

- `acceptEdits`: Claude edits and creates files, and runs `mkdir`, `touch`, `mv`, `cp`, without asking you each time. Outside your project, it always asks;
- `disableBypassPermissionsMode`: forbids "bypass" mode, the one that turns off all confirmations (even --dangerously-skip-permissions);
- `disableAutoMode`: forbids "auto mode", where a second model (a classifier) checks each action in your place and lets through what seems right to it, without asking you;

> src: [code.claude.com/docs/en/permission-modes](https://code.claude.com/docs/en/permission-modes)

## _deny_ - _forbidden to Claude_

```json
{
  // ...
  "permissions": {
    // ...

    "deny": [
      "Read(//**/.env*)",
      "Edit(//**/.env*)",
      "Read(~/.ssh/**)",
      "Read(~/.aws/**)",
      "Read(//**/.npmrc)",
      "Read(~/.npmrc)",
      "Read(~/.git-credentials)",
      "Bash(npm publish *)",
      "Bash(npx * publish*)",
      "Bash(sed *-i*)",
      "Bash(sed *--in-place*)",
      "Bash(find * -delete*)",
      "Bash(find * -exec*)",
      "Bash(git reset *)",
      "Bash(git clean *)"
    ]

    // ...
  }
  // ...
}
```

- `Read/Edit(//**/.env*)`: blocks reading and writing .env files anywhere on the disk;
- `Read(~/.ssh/**), .aws`: forbids the .ssh folder of your user folder, where your private SSH keys live (the ones that give access to your servers and to GitHub or Amazon);
- `Read(//**/.npmrc), ~/.npmrc`: forbids npm's configuration file in your user folder;
- `Read(~/.git-credentials)`: forbids the file where Git may keep your GitHub or GitLab credentials in clear text;
- `Bash(npm publish *), npx * publish*`: forbids npm publish, which puts your project publicly online on npm;
- `Bash(sed *-i*), sed *--in-place*`: Claude could edit files this way, bypassing the normal edit tool and its checks;
- `Bash(find * -delete*), find * -exec*,`: forbids find when it deletes the files found (-delete) or runs a command on each (-exec, -execdir). A single line can act on hundreds of files;
- `Bash(git reset *), git clean *`: forbids reset, which can erase work, and clean, which can delete untracked files;

## _ask_ - _Claude will ask_

```json
{
  // ...
  "permissions": {
    // ...

    "deny": [
      //...
    ],
    "ask": [
      "Bash(node *)",
      "Edit(CLAUDE.local.md)",
      "Edit(package.json)",
      "Edit(CLAUDE.md)",
      "Edit(.github/**)",
      "Bash(npm install *)",
      "Bash(npm i *)",
      "Bash(npm ci *)",
      "Bash(npm uninstall *)",
      "Bash(npm update *)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Bash(git push *)",
      "Bash(rm *)",
      "Bash(rmdir *)",
      "PowerShell(Remove-Item *)",
      "Bash(curl *)",
      "Bash(wget *)"
    ]

    // ...
  }
  // ...
}
```

- `Bash(node *)`: the node command, including node -e "\<code>", which runs JavaScript written on the fly;
- `Edit(CLAUDE.md), CLAUDE.local.md`: editing its own instructions (the second file being optional);
- `Edit(package.json)`: keeping an eye on any new script;
- `Edit(.github/**)`: editing your GitHub Actions;
- `Bash(npm install *), npm i *, npm ci *, npm uninstall *, npm update *`: installing, removing or updating npm packages;
- `Bash(git add *), git commit * git push *`: sending your code to GitHub;
- `Bash(rm *)`: permanently deleting a file;
- `Bash(rmdir *)`: permanently deleting empty folders;
- `PowerShell(Remove-Item *)`: deleting a file or folder with PowerShell. The aliases `rm`, `del` and `ri` are recognised automatically by this rule;
- `Bash(curl *), wget *`: downloading or sending data over the internet;

## _allow_ - _Claude will act freely_

```json
{
  // ...
  "permissions": {
    // ...

    "deny": [
      // ...
    ],
    "ask": [
      // ...
    ],
    "allow": [
      "WebSearch",
      "WebFetch",
      "Read(//d/dev/**)",
      "Bash(npx vitest *)",
      "Bash(npx tsc *)",
      "Bash(npm run *)",
      "Bash(node ai/*)",
      "Bash(npm ls *)",
      "Bash(npm view *)",
      "Bash(npm audit)",
      "Bash(npm audit --*)",
      "Bash(npm test *)",
      "Bash(sed -n *)",
      "Bash(cut *)",
      "Bash(sort *)"
    ]
  }
  // ...
}
```

- `WebSearch`: Claude can run a web search (like Google) without asking you each time;
- `WebFetch`: Claude can open any web address and read the page, without asking you; alternative available with "WebFetch(domain:github.com)" or others;
- `Read(//d/dev/\*\*)`: Claude can read everything in D:\dev, without asking. '//d/dev' is how D:\dev is written in these rules, to adapt to your projects folder;
- `Bash(npx vitest*)`: allows npx vitest, which runs your Vitest tests;
- `Bash(npx tsc*)`: allows the TypeScript compiler. It checks your types and can generate files;
- `Bash(npm run *)`: allows the scripts defined in your package.json (build, test, dev...);
- `Bash(node ai/*)`: allows Claude's scripts filed in `ai/`, disposable ones included; safe with `resonhance-wwai-shell`, whose hook refuses before running any `ai/` script that touches the network, a process, your home folder or a `.env`; any other `node` stays in _ask_;
- `Bash(npm ls *)`: allows npm ls, which shows the list of packages installed in your project;
- `Bash(npm view *)`: followed by the package name, shows a package's public info on npm: versions, description, dependencies;
- `Bash(npm audit*)`: allows npm audit, which looks for known security flaws in your dependencies;
- `Bash(npm test*)`: runs the test script defined in your package.json;
- `Bash(sed -n *)`: shows an excerpt of a file, for instance lines 10 to 50: sed -n '10,50p' file;
- `Bash(cut *)`: extracts columns from a text, for instance the first field of each line;
- `Bash(sort *)`: sorts lines of text.

note: Claude often chains grep or cut with |, then sort, and each part of a chained command must be allowed. | `resonhance-wwai-shell` focuses Claude's work on building tested scripts and run routines to make any process reliable. Nothing very new, but: more math = less AI slop.

## _env_ - _extra access_

```JSON
{
  // ...
  "permissions": {
    // ...

    "deny": [
      // ...
    ],
    "ask": [
      // ...
    ],
    "allow": [
      // ...
    ]
  },
  "env": {
    "ENABLE_CLAUDEAI_MCP_SERVERS": "false"
  },
  // ...
}
```

- `ENABLE_CLAUDEAI_MCP_SERVERS false`: the variable prevents Claude from loading the tools coming from the connectors linked to your claude.ai account (mail, Drive, calendar...). It doesn't even see them anymore;
