import { waitRandom } from './time'

/**
 * This error is thrown if the function is cancelled before completing
 */
export class CancelledError extends Error {
    public isCancelledError = true
    constructor() {
        super('Cancelled')
    }
}

/**
 * Throw this error if the function should retry
 */
export class RetryableError extends Error {
    public isRetryableError = true
}

export type RetryOptions = {
    n: number
    minWait: number
    maxWait: number
}

export type RetryResult<T> = {
    promise: Promise<T>
    cancel: () => void
}

/**
 * Retries the function that returns the promise until the promise successfully resolves up to n retries
 * @param fn function to retry
 * @param n how many times to retry
 * @param minWait min wait between retries in ms
 * @param maxWait max wait between retries in ms
 */
export function retry<T>(fn: () => Promise<T>, options: RetryOptions): RetryResult<T> {
    const { n, minWait, maxWait } = options

    let result: T
    let retries = 0
    let completed = false
    let rejectCancelled: (error: Error) => void
    const tryFn: () => Promise<T> = async () => {
        rejectCancelled = (error: Error) => {
            throw error
        }
        try {
            const temp = await fn()
            if (!completed) {
                completed = true
                result = temp
            }
            return result
        } catch (error: any) {
            if (completed) return result
            retries++
            if (retries >= n) {
                completed = true
                throw error
            }
        }
        await waitRandom(minWait, maxWait)
        return tryFn()
    }

    return {
        promise: tryFn(),
        cancel: () => {
            if (completed) return
            completed = true
            rejectCancelled(new CancelledError())
        },
    }
}
