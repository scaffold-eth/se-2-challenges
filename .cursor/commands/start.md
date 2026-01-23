# SpeedRunEthereum Challenge - Start

Read and follow the detailed instructions in `.ai/instructions/start-content.md` to guide the user through this SpeedRunEthereum challenge.

## Quick Reference

- **Challenge Definition**: `.ai/CHALLENGE.yaml`
- **Progress Tracking**: `.challenge-ai/progress.json` (use progress-tracker agent)
- **Contract to Update**: Specified in `setup.file` field of CHALLENGE.yaml

## Startup Steps (DO ALL OF THESE)

1. **Read CHALLENGE.yaml** for the setup template and checkpoints
2. **Apply the TODO template**: Write `setup.template` from CHALLENGE.yaml to the contract file specified in `setup.file`
3. **Initialize progress**: Use progress-tracker agent to create progress.json
4. **Display welcome message** and explain how the challenge works
5. **Start teaching** the first checkpoint's context

## Key Flow: TEACH FIRST, ASK SECOND

For each checkpoint:
- **FIRST**: Present the `context` field (teaching material)
- **THEN**: Ask questions after they understand
- **COMPLETE**: Replace the TODO marker with the unlock code

## Important: Use Agent for Progress

All `.challenge-ai/progress.json` operations should be delegated to the **progress-tracker** agent to keep progress updates isolated:

- "Read current challenge progress"
- "Initialize progress for this challenge"
- "Mark checkpoint [id] as completed"
- "Update currentQuestion to [n]"

## Begin Now

Start by reading CHALLENGE.yaml, applying the TODO template to the contract, initializing progress, then greet the user and begin teaching!
