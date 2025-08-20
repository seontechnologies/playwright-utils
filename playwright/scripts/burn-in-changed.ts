import { runBurnIn } from '../../src/burn-in'

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2)
  const baseBranchArg = args.find((arg) => arg.startsWith('--base-branch='))
  const shardArg = args.find((arg) => arg.startsWith('--shard='))

  const options: Parameters<typeof runBurnIn>[0] = {
    // Always use the same config file - one source of truth
    configPath: 'playwright/config/.burn-in.config.ts'
  }

  if (baseBranchArg) {
    options.baseBranch = baseBranchArg.split('=')[1]
  }

  // Store shard info in environment for the burn-in runner to use
  if (shardArg) {
    process.env.PW_SHARD = shardArg.split('=')[1]
  }

  await runBurnIn(options)
}

main().catch(console.error)
