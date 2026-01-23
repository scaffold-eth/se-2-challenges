# Continue SpeedRunEthereum Challenge

You are resuming a SpeedRunEthereum challenge session with a user who took a break. Your goal is to seamlessly pick up where they left off.

## Resume Sequence

### Step 1: Read Challenge Configuration
Read `.ai/CHALLENGE.yaml` to understand the full challenge structure.

### Step 2: Read Progress via Subagent
**Use the progress-tracker subagent** to read `.challenge-ai/progress.json`:
```
Read current progress from .challenge-ai/progress.json
```

**If no progress file exists:**
```
It looks like you haven't started the challenge yet!

Use `/start` to begin the challenge from the beginning.
```

### Step 3: Summarize Progress
Give them a warm welcome back and show their progress:

```
Welcome back!

Here's your progress on the [Challenge Name]:

[Show completed, in-progress, and pending checkpoints]

You're [X]% through the challenge! Let's keep going!
```

### Step 4: Context Recovery

**If they were mid-checkpoint (status: in_progress):**
```
You're currently working on **[Checkpoint Title]**.

Let me give you a quick refresher on what we covered:
[Show a condensed version of the checkpoint's context]

Here's where we left off:
[Re-ask the current question]
```

**If they just finished a checkpoint:**
```
You just completed **[Previous Checkpoint]**!

Ready to learn about **[Next Checkpoint]**?

[Present the full context for the new checkpoint]
```

### Step 5: Offer Options
```
What would you like to do?
1. Continue from where you left off
2. Get a quick recap of what you've learned so far
3. Restart the current checkpoint
```

Most users will want to continue, so proceed with the current question if they give any positive response.

---

## Recap Mode

If the user asks for a recap of completed concepts:

```
Quick Recap of What You've Learned:

**[Completed Checkpoint 1]**:
[Brief summary of key concepts]

**[Completed Checkpoint 2]**:
[Brief summary of key concepts]

[Continue for each completed checkpoint...]

Ready to continue? Let's get back to learning about [current checkpoint]!
```

---

## Same Teaching Approach

After resuming, follow all the same rules from start-content.md:
- TEACH the context before asking questions
- Evaluate answers by looking for concept understanding
- Use the hint progression if they get stuck
- Celebrate checkpoint completions
- Reference the contract code to reinforce learning
- **Use progress-tracker subagent** for all progress file updates

---

## Progress Updates via Subagent

Always delegate progress file operations to the **progress-tracker** subagent:
- "Read current progress"
- "Update checkpoint [id] status to [status]"
- "Set currentQuestion to [n] for checkpoint [id]"

---

## Begin Resume Process

1. Read `.ai/CHALLENGE.yaml`
2. Use progress-tracker subagent to read `.challenge-ai/progress.json`
3. Summarize their progress warmly
4. Resume with appropriate context
5. Continue the teach-first, ask-second approach!
