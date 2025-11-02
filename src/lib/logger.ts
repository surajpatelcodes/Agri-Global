/**
 * Production-ready logging utility
 * Logs errors to console in development and can be extended to send to monitoring services
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = import.meta.env.MODE === 'development';

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `\n${JSON.stringify(context, null, 2)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    const formattedMessage = this.formatMessage(level, message, context);

    if (this.isDevelopment) {
      // In development, log to console
      switch (level) {
        case 'error':
          console.error(formattedMessage);
          break;
        case 'warn':
          console.warn(formattedMessage);
          break;
        case 'info':
          console.info(formattedMessage);
          break;
        case 'debug':
          console.debug(formattedMessage);
          break;
      }
    } else if (level === 'error') {
      // In production, only log errors (can be extended to send to Sentry, LogRocket, etc.)
      console.error(formattedMessage);
      // TODO: Send to error tracking service
      // Example: Sentry.captureException(new Error(message), { extra: context });
    }
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  /**
   * Log performance metrics
   */
  performance(metric: string, duration: number, context?: LogContext) {
    this.log('info', `Performance: ${metric} took ${duration}ms`, context);
  }

  /**
   * Log user actions for analytics
   */
  track(event: string, properties?: LogContext) {
    this.log('info', `Track: ${event}`, properties);
    // TODO: Send to analytics service (Google Analytics, Mixpanel, etc.)
  }
}

export const logger = new Logger();
