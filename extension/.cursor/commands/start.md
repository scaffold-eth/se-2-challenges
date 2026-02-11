# SpeedRunEthereum Challenge - Start

Read and follow the detailed instructions in `.ai/instructions/start-content.md` to guide the user through this SpeedRunEthereum challenge.

## Quick Reference

- **Challenge Definition**: `.ai/CHALLENGE.yaml`
- **Progress Tracking**: `.challenge-ai/progress.json` (use progress-tracker agent)
- **Contract to Update**: Specified in CHALLENGE.yaml (`setup.file` or `task.file`)

## Startup Steps (DO ALL OF THESE)

1. **Read CHALLENGE.yaml** for the challenge configuration and checkpoints
2. **Apply setup (if applicable)**: If `setup.template` exists in CHALLENGE.yaml, write it to the contract file specified in `setup.file`. If not, skip this step (contract already has skeleton).
3. **Initialize progress**: Use progress-tracker agent to create progress.json
4. **Display welcome message** and explain how the challenge works
5. **Start teaching** the first checkpoint's context

## Key Flow: Detect Checkpoint Type

For each checkpoint, check what fields it has:

- **Concept checkpoint** (has `unlocks`, no `task`): TEACH → ASK questions → auto-unlock code
- **Code-writing checkpoint** (has `task`): TEACH → optional questions → PRESENT CODING TASK → user writes code → run tests to validate
- **Both `questions` and `task`**: Do questions first, then the coding task

## Important: Use Agent for Progress

All `.challenge-ai/progress.json` operations should be delegated to the **progress-tracker** agent to keep progress updates isolated:

- "Read current challenge progress"
- "Initialize progress for this challenge"
- "Mark checkpoint [id] as completed with method [answered/coded/skipped]"
- "Update currentQuestion to [n]"

## Begin Now

Start by reading CHALLENGE.yaml, applying setup if applicable, initializing progress, then greet the user and begin teaching!
