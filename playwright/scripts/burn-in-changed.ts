import { runBurnIn } from '../../src/burn-in'

async function main() {
  await runBurnIn()
}

main().catch(console.error)
