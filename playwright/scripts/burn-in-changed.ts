import { runBurnIn } from '../../src/burn-in'

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2)
  const baseBranchArg = args.find(arg => arg.startsWith('--base-branch='))
  const configPathArg = args.find(arg => arg.startsWith('--config-path='))
  const shardArg = args.find(arg => arg.startsWith('--shard='))
  
  const options: Parameters<typeof runBurnIn>[0] = {}
  
  if (baseBranchArg) {
    options.baseBranch = baseBranchArg.split('=')[1]
  }
  
  if (configPathArg) {
    options.configPath = configPathArg.split('=')[1]
  }
  
  // Store shard info in environment for the burn-in runner to use
  if (shardArg) {
    process.env.PW_SHARD = shardArg.split('=')[1]
  }
  
  await runBurnIn(options)
}

main().catch(console.error)
