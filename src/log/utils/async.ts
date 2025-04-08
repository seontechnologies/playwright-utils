/**
 * Wraps a synchronous function in a Promise and resolves after I/O processing
 * Used for asynchronous console logging
 */
export const asPromise = (fn: () => void): Promise<void> =>
  new Promise((resolve) => {
    fn()
    // Use setImmediate to ensure I/O processing completes
    // before the promise resolves
    setImmediate(() => resolve())
  })
