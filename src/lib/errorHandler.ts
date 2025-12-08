import { logger } from './logger';

/**
 * Global error handler for catching and logging errors
 */
export function handleError(error: unknown, context?: string): Error {
  const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
  const errorStack = error instanceof Error ? error.stack : undefined;

  logger.error(`Error in ${context || 'application'}`, {
    message: errorMessage,
    stack: errorStack,
    timestamp: new Date().toISOString(),
  });

  return error instanceof Error ? error : new Error(errorMessage);
}

/**
 * Async error handler wrapper
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, context);
      throw error;
    }
  }) as T;
}

/**
 * Setup global error handlers
 */
export function setupGlobalErrorHandlers() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled Promise Rejection', {
      reason: event.reason,
      promise: event.promise,
    });
    event.preventDefault();
  });

  // Handle global errors
  window.addEventListener('error', (event) => {
    // Check for chunk load errors (dynamically imported module)
    if (event.message && (
      event.message.includes('dynamically imported module') ||
      event.message.includes('Importing a module script failed')
    )) {
      console.log('Chunk load error detected, reloading page...');
      // Prevent infinite reload loops
      const storageKey = 'chunk_load_error_reload';
      const lastReload = sessionStorage.getItem(storageKey);
      const now = Date.now();

      if (!lastReload || now - parseInt(lastReload) > 10000) {
        sessionStorage.setItem(storageKey, now.toString());
        window.location.reload();
        return;
      }
    }

    logger.error('Global Error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
  });
}
