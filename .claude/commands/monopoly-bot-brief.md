---
description: Generate the self-contained Monopoly bot-authoring brief and copy it to the clipboard
allowed-tools: Bash(node:*), Bash(npm:*)
---

Generate the Monopoly bot-authoring brief and put it on the user's clipboard.

The brief is a single self-contained block of TypeScript + docs that someone with
NO repo access can use to write a competitive Monopoly bot. It is assembled fresh
from the live engine source (so it never drifts) by
`src/projects/monopoly/bots/bot-brief-cli.mjs`.

Do this:

1. From the repo root, run the generator and pipe it to the clipboard:

       node src/projects/monopoly/bots/bot-brief-cli.mjs | clip

2. Run it once more into `wc` to get the size, and report to the user how many
   lines / characters were copied:

       node src/projects/monopoly/bots/bot-brief-cli.mjs | wc -lc

3. Confirm the brief is on their clipboard, ready to paste. If the generator
   writes anything to stderr (it warns about unmapped characters) or exits
   non-zero, surface that instead of claiming success.
