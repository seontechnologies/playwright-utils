# Network Recorder Usage Examples

## Basic Usage with Fixtures

```typescript
// playwright/tests/network-recorder-example.spec.ts
import { test } from '@seontechnologies/playwright-utils/network-recorder/fixtures'

test('Record network traffic during test', async ({ page, context, networkRecorder }) => {
  // Setup network recording 
  const recorderContext = await networkRecorder.setup(context)
  
  console.log(`Mode: ${recorderContext.mode}`)
  console.log(`HAR file: ${recorderContext.harFilePath}`)
  
  // Your test code - network traffic will be recorded/played back based on PW_NET_MODE
  await page.goto('/')
  await page.locator('button').click()
  
  // Cleanup happens automatically
})
```

## Direct Usage without Fixtures

```typescript
// playwright/tests/network-recorder-direct.spec.ts  
import { test } from '@playwright/test'
import { createNetworkRecorder } from '@seontechnologies/playwright-utils/network-recorder'

test('Direct network recorder usage', async ({ page, context }, testInfo) => {
  const recorder = createNetworkRecorder(testInfo, {
    harFile: { 
      harDir: 'custom-har-files',
      organizeByTestFile: true 
    }
  })
  
  try {
    await recorder.setup(context)
    
    // Your test code
    await page.goto('/')
    
    // Check recorder status
    console.log(recorder.getStatusMessage())
    
  } finally {
    await recorder.cleanup()
  }
})
```

## Configuration Examples

### Custom HAR Directory

```typescript
const recorderContext = await networkRecorder.setup(context, {
  harFile: {
    harDir: 'my-har-files',
    baseName: 'api-calls',
    organizeByTestFile: false  // All HAR files in same directory
  }
})
```

### Recording Configuration

```typescript
// Record mode configuration
const recorderContext = await networkRecorder.setup(context, {
  recording: {
    content: 'embed',        // Include response content in HAR
    urlFilter: /api\/v1/     // Only record API calls
  }
})
```

### Playback Configuration

```typescript
// Playback mode configuration  
const recorderContext = await networkRecorder.setup(context, {
  playback: {
    fallback: true,         // Fall back to live requests if HAR entry missing
    urlFilter: /api\/v1/    // Only playback API calls
  }
})
```

## Environment-Based Testing

### Recording Phase
```bash
# Record network traffic for later playback
PW_NET_MODE=record npm run test:pw

# HAR files will be created in har-files/ directory
```

### Playback Phase  
```bash
# Playback from recorded HAR files (tests run in isolation)
PW_NET_MODE=playback npm run test:pw

# Tests use recorded network responses
```

### Normal Testing
```bash
# Disabled mode - normal test execution
PW_NET_MODE=disabled npm run test:pw
# or just
npm run test:pw
```

## Integration with Auth Session

```typescript
import { test } from '@seontechnologies/playwright-utils/network-recorder/fixtures'
import { test as authTest } from '@seontechnologies/playwright-utils/auth-session/fixtures'

// Combine both fixtures
const testWithAuth = authTest.extend(test.fixtures)

testWithAuth('Test with auth and network recording', async ({ 
  page, 
  context, 
  authSession,
  networkRecorder 
}) => {
  // First authenticate
  await authSession.login('testuser', 'password')
  
  // Then setup network recording (works with authenticated context)
  await networkRecorder.setup(context)
  
  // Test authenticated flows with network recording
  await page.goto('/dashboard')
  await page.locator('[data-testid="user-menu"]').click()
})
```

## Error Handling

```typescript
test('Handle network recorder errors', async ({ context, networkRecorder }) => {
  try {
    const recorderContext = await networkRecorder.setup(context, {
      playback: { fallback: false }  // Strict mode - fail if HAR missing
    })
    
    if (recorderContext.mode === 'playback' && !recorderContext.isActive) {
      console.log('Playback mode but no HAR file found')
    }
    
  } catch (error) {
    if (error.name === 'NetworkRecorderError') {
      console.log(`Network recorder error: ${error.message}`)
      console.log(`Operation: ${error.operation}`)
      console.log(`HAR file: ${error.harFilePath}`)
    }
  }
})
```

## Advanced Configuration

### Force Mode Override

```typescript
// Force recording mode regardless of environment
const recorder = createNetworkRecorder(testInfo, {
  forceMode: 'record',
  recording: { content: 'embed' }
})
```

### Custom HAR Path Generation

```typescript
const recorder = createNetworkRecorder(testInfo, {
  harFile: {
    harDir: 'recordings',
    baseName: 'network-calls',
    organizeByTestFile: false
  }
})

// HAR file will be: recordings/network-calls-{test-title}.har
```

## Debugging and Monitoring

```typescript
test('Monitor network recorder status', async ({ networkRecorder, context }) => {
  const recorderContext = await networkRecorder.setup(context)
  
  console.log(`Status: ${networkRecorder.getStatus()}`)
  console.log(`Mode: ${recorderContext.mode}`)
  console.log(`Active: ${recorderContext.isActive}`)
  console.log(`HAR Path: ${recorderContext.harFilePath}`)
  
  // Get HAR file stats
  const recorder = networkRecorder.create()
  const stats = await recorder.getHarStats()
  console.log(`HAR exists: ${stats.exists}`)
  console.log(`Entries: ${stats.entriesCount}`)
  console.log(`Size: ${stats.size} bytes`)
})
```

## Best Practices

### 1. Use Environment Variables
```bash
# Development - record new tests
PW_NET_MODE=record npm run test:pw

# CI/CD - use playback mode for consistent, fast tests  
PW_NET_MODE=playback npm run test:pw
```

### 2. Organize HAR Files
```typescript
// Group by feature/test file for maintainability
{
  harFile: {
    harDir: 'har-files',
    organizeByTestFile: true  // Creates subdirectories per test file
  }
}
```

### 3. Handle Authentication Separately
```typescript
// ✅ Good - authenticate first, then setup recording
await authSession.login('user', 'pass')
await networkRecorder.setup(context)

// ❌ Avoid - don't mix auth logic with network recording
```

### 4. Use Fixtures for Consistency
```typescript
// ✅ Good - use fixtures for automatic cleanup
import { test } from '@seontechnologies/playwright-utils/network-recorder/fixtures'

// ❌ Manual - requires explicit cleanup
import { createNetworkRecorder } from '@seontechnologies/playwright-utils/network-recorder'
```