#!/usr/bin/env node

/**
 * Reads specific sections from CHALLENGE.yaml to avoid loading the entire 65KB+ file.
 *
 * Usage:
 *   node read-challenge.js metadata          # name, version, description, difficulty, setup
 *   node read-challenge.js welcome            # welcome_message
 *   node read-challenge.js completion         # completion_message
 *   node read-challenge.js checkpoint <id>    # a single checkpoint by id
 *   node read-challenge.js current            # current checkpoint (reads progress.json)
 *   node read-challenge.js list               # list all checkpoint ids and titles
 */

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const ROOT = path.resolve(__dirname, "..");
const CHALLENGE_PATH = path.join(ROOT, "CHALLENGE.yaml");
const PROGRESS_PATH = path.join(ROOT, "..", ".challenge-ai", "progress.json");

function loadYaml() {
  const content = fs.readFileSync(CHALLENGE_PATH, "utf8");
  return yaml.load(content);
}

function getProgress() {
  if (!fs.existsSync(PROGRESS_PATH)) return null;
  return JSON.parse(fs.readFileSync(PROGRESS_PATH, "utf8"));
}

function printJson(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

const [, , command, arg] = process.argv;

if (!command) {
  console.error(
    "Usage: node read-challenge.js <metadata|welcome|completion|checkpoint|current|list> [id]"
  );
  process.exit(1);
}

const doc = loadYaml();

switch (command) {
  case "metadata": {
    const { name, version, description, difficulty, estimated_time, setup } =
      doc;
    printJson({ name, version, description, difficulty, estimated_time, setup });
    break;
  }

  case "welcome": {
    console.log(doc.welcome_message);
    break;
  }

  case "completion": {
    console.log(doc.completion_message);
    break;
  }

  case "list": {
    const list = doc.checkpoints.map((cp) => ({
      id: cp.id,
      title: cp.title,
      type: cp.task ? "code-writing" : "concept",
    }));
    printJson(list);
    break;
  }

  case "checkpoint": {
    if (!arg) {
      console.error("Usage: node read-challenge.js checkpoint <id>");
      process.exit(1);
    }
    const cp = doc.checkpoints.find((c) => c.id === arg);
    if (!cp) {
      console.error(`Checkpoint "${arg}" not found`);
      process.exit(1);
    }
    printJson(cp);
    break;
  }

  case "current": {
    const progress = getProgress();
    if (!progress) {
      console.log("No progress file found. Run /start first.");
      break;
    }
    const currentEntry = progress.checkpoints.find(
      (c) => c.status === "in_progress"
    );
    if (!currentEntry) {
      console.log("All checkpoints completed!");
      break;
    }
    const cp = doc.checkpoints.find((c) => c.id === currentEntry.id);
    if (!cp) {
      console.error(`Checkpoint "${currentEntry.id}" not found in CHALLENGE.yaml`);
      process.exit(1);
    }

    // Also include next checkpoint id for convenience
    const idx = doc.checkpoints.findIndex((c) => c.id === currentEntry.id);
    const nextId =
      idx + 1 < doc.checkpoints.length
        ? doc.checkpoints[idx + 1].id
        : null;

    printJson({ ...cp, _nextCheckpointId: nextId, _progress: progress });
    break;
  }

  default:
    console.error(`Unknown command: ${command}`);
    process.exit(1);
}
