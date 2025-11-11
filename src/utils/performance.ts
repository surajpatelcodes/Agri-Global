/**
 * Web Vitals Performance Monitoring Utilities
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
}

// Thresholds based on web.dev recommendations
const THRESHOLDS = {
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
  FID: { good: 100, poor: 300 },   // First Input Delay
  CLS: { good: 0.1, poor: 0.25 },  // Cumulative Layout Shift
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte
};

export function getRating(value: number, metric: keyof typeof THRESHOLDS): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[metric];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

export function logPerformanceMetric(metric: PerformanceMetric) {
  if (process.env.NODE_ENV === 'development') {
    const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';
    console.log(
      `${emoji} ${metric.name}: ${metric.value.toFixed(2)}ms (${metric.rating})`
    );
  }
}

/**
 * Report Core Web Vitals
 */
export function reportWebVitals() {
  if (typeof window === 'undefined') return;

  // First Contentful Paint (FCP)
  const paintEntries = performance.getEntriesByType('paint');
  const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
  if (fcpEntry) {
    logPerformanceMetric({
      name: 'FCP',
      value: fcpEntry.startTime,
      rating: getRating(fcpEntry.startTime, 'FCP'),
      delta: fcpEntry.startTime,
    });
  }

  // Largest Contentful Paint (LCP), First Input Delay (FID), and CLS - use feature detection
  if ('PerformanceObserver' in window) {
    const supported = (PerformanceObserver as any).supportedEntryTypes || [];

    // LCP
    if (supported.includes('largest-contentful-paint')) {
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          if (lastEntry) {
            logPerformanceMetric({
              name: 'LCP',
              value: lastEntry.renderTime || lastEntry.loadTime,
              rating: getRating(lastEntry.renderTime || lastEntry.loadTime, 'LCP'),
              delta: lastEntry.renderTime || lastEntry.loadTime,
            });
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // LCP observe failed
      }
    }

    // FID
    if (supported.includes('first-input')) {
      try {
        const fidObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry: any) => {
            logPerformanceMetric({
              name: 'FID',
              value: entry.processingStart - entry.startTime,
              rating: getRating(entry.processingStart - entry.startTime, 'FID'),
              delta: entry.processingStart - entry.startTime,
            });
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        // FID observe failed
      }
    }

    // CLS
    if (supported.includes('layout-shift')) {
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries() as any) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              logPerformanceMetric({
                name: 'CLS',
                value: clsValue,
                rating: getRating(clsValue, 'CLS'),
                delta: entry.value,
              });
            }
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        // CLS observe failed
      }
    }
  }
}

/**
 * Measure component render performance
 */
export function measureRender(componentName: string, callback: () => void) {
  const startTime = performance.now();
  callback();
  const endTime = performance.now();
  const renderTime = endTime - startTime;

  if (process.env.NODE_ENV === 'development' && renderTime > 16) {
    console.warn(`⚠️ ${componentName} render took ${renderTime.toFixed(2)}ms (target: <16ms for 60fps)`);
  }
}
