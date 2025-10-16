/**
 * SVG Error Handler Utility
 * 
 * This utility provides functions to handle and suppress SVG attribute errors
 * that may occur from third-party widgets or iframes.
 */

export class SVGErrorHandler {
  private static originalConsoleError: typeof console.error;
  private static isActive = false;

  /**
   * Initialize the SVG error handler
   * This will suppress SVG attribute errors from third-party widgets
   */
  static initialize() {
    if (this.isActive) return;

    this.originalConsoleError = console.error;
    this.isActive = true;

    console.error = (...args) => {
      const message = args[0]?.toString() || '';
      
      // Check if this is an SVG attribute error
      if (this.isSVGAttributeError(message)) {
        // Suppress SVG attribute errors from third-party widgets
        return;
      }
      
      // Pass through all other errors
      this.originalConsoleError.apply(console, args);
    };
  }

  /**
   * Restore the original console.error function
   */
  static cleanup() {
    if (!this.isActive) return;

    console.error = this.originalConsoleError;
    this.isActive = false;
  }

  /**
   * Check if an error message is related to SVG attribute issues
   */
  private static isSVGAttributeError(message: string): boolean {
    const svgErrorPatterns = [
      'svg.*attribute.*width.*expected.*length',
      'svg.*attribute.*height.*expected.*length',
      'attribute width.*expected length',
      'attribute height.*expected length',
      'svg.*width.*height'
    ];

    return svgErrorPatterns.some(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(message);
    });
  }

  /**
   * Validate SVG element attributes
   */
  static validateSVGAttributes(element: SVGElement): boolean {
    const width = element.getAttribute('width');
    const height = element.getAttribute('height');

    // Check if width and height are valid
    if (width && !this.isValidLength(width)) {
      console.warn(`Invalid SVG width attribute: ${width}`);
      return false;
    }

    if (height && !this.isValidLength(height)) {
      console.warn(`Invalid SVG height attribute: ${height}`);
      return false;
    }

    return true;
  }

  /**
   * Check if a value is a valid SVG length
   */
  private static isValidLength(value: string): boolean {
    // Valid SVG length patterns
    const validPatterns = [
      /^\d+(\.\d+)?$/,           // Numbers like "24", "24.5"
      /^\d+(\.\d+)?%$/,          // Percentages like "100%"
      /^\d+(\.\d+)?px$/,         // Pixels like "24px"
      /^\d+(\.\d+)?em$/,         // Em units like "1.5em"
      /^\d+(\.\d+)?rem$/,        // Rem units like "1.5rem"
      /^\d+(\.\d+)?vh$/,         // Viewport height like "50vh"
      /^\d+(\.\d+)?vw$/,         // Viewport width like "50vw"
      /^auto$/,                  // Auto value
      /^inherit$/                // Inherit value
    ];

    return validPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Fix SVG element attributes if they are invalid
   */
  static fixSVGAttributes(element: SVGElement): void {
    const width = element.getAttribute('width');
    const height = element.getAttribute('height');

    if (width && !this.isValidLength(width)) {
      console.warn(`Fixing invalid SVG width attribute: ${width} -> 24`);
      element.setAttribute('width', '24');
    }

    if (height && !this.isValidLength(height)) {
      console.warn(`Fixing invalid SVG height attribute: ${height} -> 24`);
      element.setAttribute('height', '24');
    }
  }
}

/**
 * React hook to manage SVG error handling
 */
export function useSVGErrorHandler() {
  React.useEffect(() => {
    SVGErrorHandler.initialize();
    
    return () => {
      SVGErrorHandler.cleanup();
    };
  }, []);
}

// Import React for the hook
import React from 'react';
