jest.mock('node:path', () => jest.requireActual('node:path').win32)

import { BurnInAnalyzer } from './analyzer'

describe('Windows Playwright file filter', () => {
  it('matches the native path of the selected test file', () => {
    const analyzer = new BurnInAnalyzer({ testPatterns: ['**/*.spec.ts'] }, {})
    const file = 'C:\\repo\\tests\\a.spec.ts'
    const command = analyzer.buildCommand({ tests: [file], reason: 'test' })
    const filter = command?.[1]

    expect(filter).toBeDefined()
    expect(new RegExp(filter!, 'gi').test(file)).toBe(true)
    expect(new RegExp(filter!, 'gi').test('C:\\repo\\tests\\aXspec.ts')).toBe(
      false
    )
  })
})
