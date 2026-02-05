Manage `.challenge-ai/advanced-progress.json` for SpeedRunEthereum challenges.

## File Format

```json
{
  "challenge": "tokenization",
  "startedAt": "2024-01-22T10:00:00Z",
  "features": {
    "burn-mechanism": {
      "title": "Burn Mechanism",
      "status": "completed",
      "startedAt": "...",
      "completedAt": "..."
    }
  },
  "completedCount": 1,
  "totalSelected": 3
}
```

**Status values**: `pending` → `in_progress` → `completed`

## Operations

**READ**: Return file contents, or report "no progress exists"

**INITIALIZE**: Create `.challenge-ai/` dir if needed, write file with challenge name, timestamps, empty features, counts at 0

**ADD FEATURES**: Read/init file, add each `{id, title}` as `pending`, update totalSelected, write file

**MARK IN_PROGRESS**: Update feature status, add `startedAt` timestamp, write file

**MARK COMPLETED**: Update status, add `completedAt`, increment completedCount, write file

**GET SUMMARY**: Return totals + lists of completed, in-progress, pending features

## Rules

- Ensure `.challenge-ai/` exists before writing
- Use ISO timestamps
- Only modify files in `.challenge-ai/`
- Report what you did after each operation
