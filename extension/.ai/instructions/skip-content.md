# Speedrun Ethereum Challenge - Skip Current Task

Skip the current code-writing checkpoint by applying the solution automatically.

## Steps

### Step 1: Read Progress
Use the **progress-tracker** agent to read `.challenge-ai/progress.json`.
- Find the `currentCheckpoint` value
- If no progress exists, tell the user: "No progress found. Run `/start` first to begin the challenge!"

### Step 2: Read Challenge Configuration
Read `.ai/CHALLENGE.yaml` and find the current checkpoint by its ID.

- If the current checkpoint does NOT have a `task` field, tell the user:
  "This checkpoint doesn't have a coding task to skip. Say 'hint' if you need help with the current question."
- If it has a `task` field, continue to Step 3

### Step 3: Show the Solution
Display the solution from `task.solution` with an explanation:

```
No worries! Here's the solution for this checkpoint:

[Show task.solution code with syntax highlighting]

**Why this works:**
[Explain each key part of the solution, connecting it to the concepts
from the checkpoint's context field. This is still a learning moment!]
```


### Step 4: Apply the Solution
Read the current contract file (`task.file`) and apply the solution code:
- Parse the solution comments (e.g., "// Add under State Variables:") to determine placement
- Add state variables, events, errors to their respective sections in the contract
- Fill in empty function bodies with the solution code
- Be careful to place code in the correct sections of the contract

### Step 5: Run Tests
Execute the `task.test` command (e.g., `yarn test --grep "Checkpoint1"`) to verify the solution works.
- If tests pass: continue to Step 6
- If tests fail: debug and fix (this shouldn't happen with correct solutions)

### Step 6: Update Progress
Use the **progress-tracker** agent:
```
Mark checkpoint "[checkpoint-id]" as completed with method "skipped". Set next checkpoint "[next-id]" to in_progress.
```

### Step 7: Continue
- If more checkpoints remain, present the next checkpoint's context (follow the teaching flow from `start-content.md`)
- If all checkpoints are complete, show the `completion_message` from CHALLENGE.yaml

## Important

- **Always explain the solution** — skipping should still be a learning opportunity
- **Track that this was skipped** in progress (method: "skipped") so the user can review later
- **Use the progress-tracker agent** for all progress file operations
- **Read `start-content.md`** for the full teaching flow when continuing to the next checkpoint
