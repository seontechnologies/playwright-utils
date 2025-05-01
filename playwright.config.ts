import { config as dotenvConfig } from 'dotenv'
import path from 'path'

dotenvConfig({
  path: path.resolve(__dirname, '../../.env')
})

const envConfigMap = {
  local: require('./playwright/config/local.config').default
}

const environment = process.env.TEST_ENV || 'local'

// Validate environment config
if (!Object.keys(envConfigMap).includes(environment)) {
  console.error(`No configuration found for environment: ${environment}`)
  console.error('Available environments:')
  Object.keys(envConfigMap).forEach((env) => console.error(`- ${env}`))
  process.exit(1)
}

export default envConfigMap[environment as keyof typeof envConfigMap]
