import { ApolloError } from '@apollo/client'
import { useCallback } from 'react'

// Union type for all possible error types in the application
export type AppError = string | ApolloError | Error | undefined | null

// Error severity levels
export enum ErrorSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

// Structured error information
export interface ErrorInfo {
    message: string
    severity: ErrorSeverity
    source?: string
    originalError?: AppError
}

/**
 * Combine multiple errors into a single error state
 * Returns the first non-null/undefined error, or null if no errors exist
 */
export function combineErrors(...errors: AppError[]): AppError {
    return errors.find(error => error != null) || null
}

/**
 * Check if any errors exist in a list of error states
 */
export function hasAnyError(...errors: AppError[]): boolean {
    return errors.some(error => error != null)
}

/**
 * Check if all errors are resolved (no errors exist)
 */
export function allErrorsResolved(...errors: AppError[]): boolean {
    return !hasAnyError(...errors)
}

/**
 * Convert various error types to a standardized error message
 */
export function getErrorMessage(error: AppError): string {
    if (!error) return ''
    
    if (typeof error === 'string') {
        return error
    }
    
    if (error instanceof ApolloError) {
        return error.message || 'GraphQL query failed'
    }
    
    if (error instanceof Error) {
        return error.message || 'An unexpected error occurred'
    }
    
    return 'Unknown error occurred'
}

/**
 * Determine error severity based on error type and content
 */
export function getErrorSeverity(error: AppError): ErrorSeverity {
    if (!error) return ErrorSeverity.LOW
    
    const message = getErrorMessage(error).toLowerCase()
    
    // Critical errors - system failures
    if (message.includes('system') || message.includes('critical') || message.includes('fatal')) {
        return ErrorSeverity.CRITICAL
    }
    
    // High priority - data loading failures that prevent functionality
    if (error instanceof ApolloError || message.includes('failed to fetch') || message.includes('network')) {
        return ErrorSeverity.HIGH
    }
    
    // Medium priority - partial failures
    if (message.includes('timeout') || message.includes('retry')) {
        return ErrorSeverity.MEDIUM
    }
    
    // Low priority - non-critical issues
    return ErrorSeverity.LOW
}

/**
 * Create structured error information from raw error
 */
export function createErrorInfo(error: AppError, source?: string): ErrorInfo | null {
    if (!error) return null
    
    return {
        message: getErrorMessage(error),
        severity: getErrorSeverity(error),
        source,
        originalError: error
    }
}

/**
 * Error boundary logic - determine if error should halt execution
 */
export function shouldHaltExecution(error: AppError): boolean {
    const severity = getErrorSeverity(error)
    return severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.HIGH
}

/**
 * Error boundary logic - determine if operation can continue with degraded functionality
 */
export function canContinueWithDegradedMode(error: AppError): boolean {
    const severity = getErrorSeverity(error)
    return severity === ErrorSeverity.LOW || severity === ErrorSeverity.MEDIUM
}

/**
 * Create a safe error handler that logs errors and provides fallback behavior
 */
export function createSafeErrorHandler<T>(
    fallbackValue: T,
    options: {
        logError?: boolean
        source?: string
        onError?: (error: AppError) => void
    } = {}
): (error: AppError) => T {
    const { logError = true, source, onError } = options
    
    return (error: AppError): T => {
        if (error && logError) {
            console.error(`Error in ${source || 'unknown'}:`, error)
        }
        
        if (onError) {
            onError(error)
        }
        
        return fallbackValue
    }
}

/**
 * Retry logic with exponential backoff for async operations
 */
export async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    options: {
        maxRetries?: number
        baseDelay?: number
        maxDelay?: number
        shouldRetry?: (error: AppError) => boolean
    } = {}
): Promise<T> {
    const {
        maxRetries = 3,
        baseDelay = 1000,
        maxDelay = 10000,
        shouldRetry = (error) => !shouldHaltExecution(error)
    } = options
    
    let lastError: AppError = null
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation()
        } catch (error) {
            lastError = error as AppError
            
            // Don't retry on last attempt or if error shouldn't be retried
            if (attempt === maxRetries || !shouldRetry(lastError)) {
                throw lastError
            }
            
            // Calculate delay with exponential backoff
            const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
            await new Promise(resolve => setTimeout(resolve, delay))
        }
    }
    
    throw lastError
}

/**
 * Batch error information for multiple error sources
 */
export function batchErrorInfo(errors: Record<string, AppError>): ErrorInfo[] {
    return Object.entries(errors)
        .map(([source, error]) => createErrorInfo(error, source))
        .filter((errorInfo): errorInfo is ErrorInfo => errorInfo !== null)
}

/**
 * Get the most severe error from a collection of errors
 */
export function getMostSevereError(errors: AppError[]): AppError {
    if (errors.length === 0) return null
    
    return errors.reduce((mostSevere, current) => {
        if (!current) return mostSevere
        if (!mostSevere) return current
        
        const currentSeverity = getErrorSeverity(current)
        const mostSevereSeverity = getErrorSeverity(mostSevere)
        
        // Higher severity values take precedence
        const severityOrder = {
            [ErrorSeverity.LOW]: 1,
            [ErrorSeverity.MEDIUM]: 2,
            [ErrorSeverity.HIGH]: 3,
            [ErrorSeverity.CRITICAL]: 4
        }
        
        return severityOrder[currentSeverity] > severityOrder[mostSevereSeverity] 
            ? current 
            : mostSevere
    }, null as AppError)
} 

/**
 * React hook for handling errors in components
 * Provides standardized error handling and user feedback
 */
export function useErrorHandler() {
    const handleError = useCallback((error: AppError, context?: string) => {
        if (!error) return

        const errorInfo = createErrorInfo(error, context)
        if (!errorInfo) return

        // Log error for debugging
        console.error(`Error in ${context || 'component'}:`, {
            message: errorInfo.message,
            severity: errorInfo.severity,
            originalError: errorInfo.originalError
        })

        // Determine user-facing behavior based on severity
        switch (errorInfo.severity) {
            case ErrorSeverity.CRITICAL:
                // Could trigger error boundary or redirect to error page
                console.error('Critical error detected - consider error boundary activation')
                break
            case ErrorSeverity.HIGH:
                // Show error notification to user
                console.warn('High priority error - user should be notified')
                break
            case ErrorSeverity.MEDIUM:
                // Show warning or degraded mode notice
                console.warn('Medium priority error - show degraded mode notice')
                break
            case ErrorSeverity.LOW:
                // Log only, continue normal operation
                console.info('Low priority error - continuing with normal operation')
                break
        }

        return errorInfo
    }, [])

    const clearError = useCallback(() => {
        // Could be used to clear error states in UI
        console.info('Clearing error state')
    }, [])

    return {
        handleError,
        clearError,
        shouldHaltExecution,
        canContinueWithDegradedMode,
        getErrorMessage,
        getErrorSeverity
    }
}

/**
 * Example usage in a component:
 * 
 * ```tsx
 * function EarnStrategiesPage() {
 *     const { rows, error, hasErrors, loading } = useEarnStrategies()
 *     const { handleError, getErrorMessage } = useErrorHandler()
 * 
 *     useEffect(() => {
 *         if (error) {
 *             handleError(error, 'EarnStrategiesPage')
 *         }
 *     }, [error, handleError])
 * 
 *     if (hasErrors && shouldHaltExecution(error)) {
 *         return <ErrorBoundary message="Unable to load strategies. Please try again later." />
 *     }
 * 
 *     if (hasErrors && canContinueWithDegradedMode(error)) {
 *         return (
 *             <div>
 *                 <WarningBanner message={`Limited data available: ${getErrorMessage(error)}`} />
 *                 <StrategiesTable data={rows} />
 *             </div>
 *         )
 *     }
 * 
 *     return <StrategiesTable data={rows} loading={loading} />
 * }
 * ```
 */ 