import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  renderCount: number;
}

export function usePerformanceMonitor(componentName: string) {
  const renderCountRef = useRef(0);
  const renderStartTimeRef = useRef<number>(0);

  useEffect(() => {
    renderCountRef.current += 1;
    const renderEndTime = performance.now();
    const renderTime = renderEndTime - renderStartTimeRef.current;

    // Only log in development mode
    if (import.meta.env.DEV) {
      const metrics: PerformanceMetrics = {
        componentName,
        renderTime,
        renderCount: renderCountRef.current,
      };

      // Log performance metrics only if render takes > 50ms
      if (renderTime > 50) {
        console.warn(`[Performance] ${componentName} rendered in ${renderTime.toFixed(2)}ms (Render #${renderCountRef.current})`);
      }
    }
  });

  // Record start time before render
  renderStartTimeRef.current = performance.now();

  return {
    renderCount: renderCountRef.current,
  };
}

export function useMountTime(componentName: string) {
  useEffect(() => {
    const mountTime = performance.now();
    
    if (import.meta.env.DEV) {
      console.log(`[Performance] ${componentName} mounted at ${mountTime.toFixed(2)}ms`);
    }

    return () => {
      const unmountTime = performance.now();
      const lifetime = unmountTime - mountTime;
      
      if (import.meta.env.DEV) {
        console.log(`[Performance] ${componentName} unmounted after ${lifetime.toFixed(2)}ms`);
      }
    };
  }, [componentName]);
}
