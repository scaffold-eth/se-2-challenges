# GitHub Actions Setup

## README Revalidation Workflow

This repository includes a GitHub Action that automatically revalidates challenge README files on speedrunethereum.com whenever they are updated.

### How it works

The workflow (`revalidate-challenge-readme.yml`) triggers when:

1. **Push events** that modify README files on challenge branches
2. **Merged pull requests** that modify README files targeting challenge branches

**Watched files:**

- `README.md` (root level challenge description)
- `extension/README.md.args.mjs` (template file)

**Supported branches:**

- Any branch matching the pattern `challenge-*` (e.g., `challenge-0-simple-nft`, `challenge-1-decentralized-staking`)

### Setup Requirements

To use this workflow, you need to configure the following repository secret:

#### Required Secret

**`REVALIDATION_TOKEN`**

- Description: Authentication token for speedrunethereum.com API
- Required for: Making revalidation API calls
- Setup: Go to your repository Settings → Secrets and variables → Actions → Repository secrets

### How the workflow extracts challenge names

The workflow automatically extracts the challenge name from the branch name:

- `challenge-simple-nft-example` → `simple-nft-example`
- `challenge-decentralized-staking` → `decentralized-staking`
- `challenge-dex` → `dex`

This extracted name is used to construct the revalidation URL:

```
https://speedrunethereum.com/api/revalidate?token=${REVALIDATION_TOKEN}&path=/challenge/${challenge_name}
```

### Workflow Features

- ✅ **Automatic triggering** on README changes
- ✅ **Branch pattern matching** for challenge branches only
- ✅ **Smart challenge name extraction** from branch names
- ✅ **Error handling** with proper HTTP status checking
- ✅ **Detailed logging** of revalidation attempts
- ✅ **GitHub Actions summary** with status and details
- ✅ **Support for both direct pushes and merged PRs**

### Troubleshooting

If the workflow fails:

1. **Check the secret**: Ensure `REVALIDATION_TOKEN` is correctly set
2. **Verify branch name**: Make sure you're on a `challenge-*` branch
3. **Check file paths**: Ensure you're modifying `README.md` or `extension/README.md.args.mjs`
4. **Review logs**: Check the GitHub Actions logs for detailed error messages

### Testing the workflow

You can test the workflow by:

1. Making a small change to `README.md` on a challenge branch
2. Committing and pushing the change
3. Checking the Actions tab in your GitHub repository
4. Reviewing the workflow run and summary for success/failure status
