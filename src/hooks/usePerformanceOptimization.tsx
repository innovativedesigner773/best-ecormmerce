import { useEffect, useCallback, useRef, useState } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  isSlowDevice: boolean;
}

export function usePerformanceOptimization() {
  const renderStartTime = useRef<number>(0);
  const isSlowDevice = useRef<boolean>(false);

  // Detect slow devices
  useEffect(() => {
    const checkDevicePerformance = () => {
      // Check hardware concurrency (CPU cores)
      const cores = navigator.hardwareConcurrency || 4;
      
      // Check memory (if available)
      const memory = (navigator as any).deviceMemory || 4;
      
      // Check connection speed
      const connection = (navigator as any).connection;
      const effectiveType = connection?.effectiveType || '4g';
      
      // Determine if device is slow
      isSlowDevice.current = cores < 4 || memory < 4 || effectiveType === 'slow-2g' || effectiveType === '2g';
      
      console.log('Device performance check:', {
        cores,
        memory,
        effectiveType,
        isSlowDevice: isSlowDevice.current
      });
    };

    checkDevicePerformance();
  }, []);

  // Measure render performance
  const startRenderMeasurement = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endRenderMeasurement = useCallback((componentName: string) => {
    if (renderStartTime.current > 0) {
      const renderTime = performance.now() - renderStartTime.current;
      
      // Log slow renders
      if (renderTime > 16) { // More than one frame (16ms at 60fps)
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
      
      renderStartTime.current = 0;
      return renderTime;
    }
    return 0;
  }, []);

  // Debounce function for performance
  const debounce = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): T => {
    let timeoutId: NodeJS.Timeout;
    return ((...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    }) as T;
  }, []);

  // Throttle function for performance
  const throttle = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): T => {
    let lastCall = 0;
    return ((...args: any[]) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        return func(...args);
      }
    }) as T;
  }, []);

  // Lazy load images
  const lazyLoadImage = useCallback((img: HTMLImageElement, src: string) => {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              img.src = src;
              observer.unobserve(img);
            }
          });
        },
        { rootMargin: '50px' }
      );
      observer.observe(img);
    } else {
      // Fallback for older browsers
      img.src = src;
    }
  }, []);

  // Preload critical resources
  const preloadResource = useCallback((href: string, as: string) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    document.head.appendChild(link);
  }, []);

  // Optimize scroll performance
  const optimizeScroll = useCallback((element: HTMLElement) => {
    if (isSlowDevice.current) {
      // Use passive listeners for better performance
      element.addEventListener('scroll', () => {}, { passive: true });
    }
  }, []);

  // Memory cleanup
  const cleanup = useCallback(() => {
    // Clear any pending timeouts
    const highestTimeoutId = setTimeout(() => {}, 0);
    for (let i = 0; i < highestTimeoutId; i++) {
      clearTimeout(i);
    }
    
    // Clear any pending intervals
    const highestIntervalId = setInterval(() => {}, 0);
    for (let i = 0; i < highestIntervalId; i++) {
      clearInterval(i);
    }
  }, []);

  return {
    isSlowDevice: isSlowDevice.current,
    startRenderMeasurement,
    endRenderMeasurement,
    debounce,
    throttle,
    lazyLoadImage,
    preloadResource,
    optimizeScroll,
    cleanup
  };
}

// Hook for component performance monitoring
export function useComponentPerformance(componentName: string) {
  const { startRenderMeasurement, endRenderMeasurement } = usePerformanceOptimization();

  useEffect(() => {
    startRenderMeasurement();
    
    return () => {
      endRenderMeasurement(componentName);
    };
  }, [componentName, startRenderMeasurement, endRenderMeasurement]);
}

// Hook for image lazy loading
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const { lazyLoadImage } = usePerformanceOptimization();
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current && src) {
      lazyLoadImage(imgRef.current, src);
    }
  }, [src, lazyLoadImage]);

  const handleLoad = useCallback(() => {
    setImageSrc(src);
    setIsLoaded(true);
  }, [src]);

  return {
    imageSrc,
    isLoaded,
    imgRef,
    handleLoad
  };
}
