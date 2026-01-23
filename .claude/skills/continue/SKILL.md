---
name: continue
description: Resume the SpeedRunEthereum challenge from where you left off. Picks up your progress, gives you a refresher on the current topic, and continues the interactive learning session.
---

# SpeedRunEthereum Challenge - Continue

Read and follow the detailed instructions in `.ai/instructions/continue-content.md` to resume the user's SpeedRunEthereum challenge session.

## Quick Reference

- **Challenge Definition**: `.ai/CHALLENGE.yaml`
- **Progress Tracking**: `.challenge-ai/progress.json` (use progress-tracker subagent)
- **Target File**: Specified in each checkpoint's `unlocks.file` field

## Resume Flow

1. Read CHALLENGE.yaml for checkpoint structure
2. **Use the progress-tracker subagent** to read current progress
3. Summarize their progress warmly
4. Resume from current checkpoint with context refresher
5. Continue teach-first, ask-second approach

## Progress Summary Format

```
Welcome back!

[Completed checkpoints] - Complete
[Current checkpoint] - In Progress
[Pending checkpoints] - Pending
...

You're X% through the challenge!
```

## If No Progress Exists

Direct them to use `/start` instead.

## Begin Now

Use the progress-tracker subagent to read progress, summarize their journey, and resume teaching from where they left off.
