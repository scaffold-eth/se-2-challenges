---
name: read-challenge
description: Read specific sections of CHALLENGE.yaml efficiently. Avoids loading the entire file. Use this instead of reading CHALLENGE.yaml directly with the Read tool.
---

# Read Challenge Section

Use the script at `.ai/scripts/read-challenge.js` to read only the section you need from CHALLENGE.yaml.

## Available commands

Run these with `node .ai/scripts/read-challenge.js <command>`:

- **`metadata`** — Challenge name, version, description, difficulty, setup config
- **`welcome`** — The welcome_message text
- **`completion`** — The completion_message text
- **`list`** — All checkpoint ids, titles, and types (concept vs code-writing)
- **`checkpoint <id>`** — Full data for a single checkpoint (context, questions, task, hints, solution)
- **`current`** — The current in-progress checkpoint (reads progress.json), includes next checkpoint id

## When to use which command

- Starting a new session: `metadata` + `welcome` + `current` (or `list` if no progress)
- Resuming: `current` to get the active checkpoint with all its data
- Moving to next checkpoint: `checkpoint <next-id>`
- Challenge complete: `completion`
