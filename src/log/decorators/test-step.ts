/**
 * Step decorators for logging and Playwright test steps
 *
 * Provides decorators that can be used to wrap methods or functions in test steps
 * with proper logging integration.
 */
import { test } from '@playwright/test'
import { log } from '../log'

/**
 * Method decorator for class methods to wrap them in a test.step with logging
 *
 * @param stepName - Optional name for the step, defaults to method name
 *
 * @example
 * // Page object with decorated methods
 * class MyPage {
 *   // Uses method name as step name
 *   @methodTestStep()
 *   async login() {
 *     // Method implementation
 *   }
 *
 *   // Custom step name
 *   @methodTestStep("Search for products")
 *   async search(term: string) {
 *     // Method implementation
 *   }
 * }
 *
 */
export function methodTestStep(stepName?: string) {
  // This is a higher-order function that returns the actual decorator function
  // It allows us to pass in parameters (stepName) to customize our decorator
  return function methodDecorator(
    target: any, // The original method being decorated
    context: ClassMethodDecoratorContext // Gives us metadata about the method (like its name)
  ) {
    // Store the original method name to use as default step name if none provided
    const methodName = context.name as string

    // This is the function that will replace the original method
    // It wraps the original method with our logging and test.step functionality
    return function replacementMethod(this: any, ...args: any[]) {
      // 'this' is the class instance (e.g., TodoPage) when the method is called
      // We need to preserve this context for the original method to work properly

      // Use provided stepName or fall back to the method's name
      const name = stepName || methodName
      // Get the class name for better logging context (e.g., 'TodoPage')
      // This helps trace the step back to its exact source in our page objects
      const className = this.constructor ? this.constructor.name : 'Unknown'
      // Combine them for a descriptive step name in test reports
      const fullStepName = `${name} (${className})`

      // Log the step to our custom logger before Playwright's test.step
      // This allows for consistent logging across all our test utilities
      log.step(fullStepName)

      // Wrap execution in Playwright's test.step for proper test reporting
      // This makes steps appear in Playwright's HTML reporter with timing info
      return test.step(fullStepName, async () => {
        try {
          // Call the original method with the correct 'this' context
          // This is crucial - without it, the original method wouldn't have
          // access to the class properties and methods (like this.page)
          const result = await target.call(this, ...args)
          return result
        } catch (error) {
          // Enhanced error handling - we log the error before re-throwing it
          // This creates a clean error trace in both our logs and test reports
          log.error(`Step failed: ${fullStepName} - ${error}`)
          throw error // Re-throw to maintain normal test failure behavior
        }
      })
    }
  }
}

/**
 * Function decorator to wrap any function in a test.step with logging
 *
 * @param stepName - Name for the step
 * @param fn - The function to wrap
 *
 * @example
 * // Define a function with the decorator
 * const searchProducts = functionTestStep("Search for products", async (term: string) => {
 *   // Function implementation
 * })
 *
 * // Call it normally
 * const results = await searchProducts("laptop")
 */
export function functionTestStep<T extends any[], R>(
  stepName: string, // Unlike methodTestStep, this is required (no method name to fall back to)
  fn: (...args: T) => Promise<R> | R // The function to wrap (instead of decorating a method)
): (...args: T) => Promise<R> {
  // We use TypeScript generics (T, R) to preserve the exact function signature
  // This ensures proper type checking for arguments and return values

  // Return a new function with the same signature as the original function
  // But enhanced with step logging and error handling
  return async function (...args: T): Promise<R> {
    // Unlike methodTestStep, we don't need to handle 'this' context
    // Because we're working with standalone functions, not class methods

    // Log the step to our custom logger for consistent output
    log.step(stepName)

    // Wrap execution in Playwright's test.step for proper test reporting
    return test.step(stepName, async () => {
      try {
        // Simply call the original function with the provided arguments
        // No need for .call() since we don't need to manage 'this'
        return await fn(...args)
      } catch (error) {
        // Enhanced error handling with consistent logging
        log.error(`Step failed: ${stepName} - ${error}`)
        throw error // Re-throw to maintain normal test failure behavior
      }
    })
  }
}
