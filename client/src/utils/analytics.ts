/**
 * Google Analytics 4 (GA4) Analytics Utility
 * Standard Vanilla gtag.js wrapper for Vite + React SPAs.
 * 
 * Instructions:
 * 1. Set VITE_GA_MEASUREMENT_ID in your local client .env file (e.g. VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX).
 * 2. Set VITE_GA_MEASUREMENT_ID as an environment variable in Vercel settings.
 */

// Define global types for window object integration
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Extract GA Measurement ID from Vite environment
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

let isInitialized = false;

/**
 * Dynamically loads the gtag.js script and initializes GA4
 */
export function initGA(): void {
  if (isInitialized) return;
  if (!GA_MEASUREMENT_ID) {
    console.warn(
      'Google Analytics Warning: VITE_GA_MEASUREMENT_ID is not defined. GA4 will not track events.'
    );
    return;
  }

  try {
    // 1. Inject the Google Tag script tag dynamically
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // 2. Initialize the dataLayer and gtag proxy
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };

    // 3. Configure core tracking options
    window.gtag('js', new Date());
    
    // Disable automatic pageviews so we can track route-based changes manually in React Router
    window.gtag('config', GA_MEASUREMENT_ID, {
      send_page_view: false,
    });

    isInitialized = true;
    console.log(`Google Analytics 4 initialized successfully with ID: ${GA_MEASUREMENT_ID}`);
  } catch (error) {
    console.error('Failed to initialize Google Analytics:', error);
  }
}

/**
 * Tracks a page view event (specifically designed for React SPA client-side route updates)
 * @param page The relative path or URL of the page (e.g. '/dashboard')
 */
export function trackPageView(page: string): void {
  if (!GA_MEASUREMENT_ID) return;
  initGA(); // Ensure initialized

  if (window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: page,
      page_location: window.location.href,
      page_title: document.title,
    });
  }
}

/**
 * Records a successful login event
 * @param method The login method used ('credentials' or 'google')
 */
export function trackLoginSuccess(method: 'credentials' | 'google'): void {
  trackCustomEvent('login', { method });
}

/**
 * Records a successful signup registration event
 * @param method The signup method used ('credentials' or 'google')
 */
export function trackSignupSuccess(method: 'credentials' | 'google'): void {
  trackCustomEvent('sign_up', { method });
}

/**
 * Records an OTP verification attempt success or failure
 * @param success Indicates if the verification was successful
 * @param errorMsg The error message returned if validation failed
 */
export function trackOTPVerification(success: boolean, errorMsg?: string): void {
  trackCustomEvent('otp_verification', {
    success: success ? 'success' : 'failure',
    error_message: errorMsg || 'none',
  });
}

/**
 * Records general user interface button clicks
 * @param buttonName The technical name of the button (e.g. 'upgrade_to_pro_cta')
 * @param label The friendly text label displayed on the button
 */
export function trackButtonClick(buttonName: string, label?: string): void {
  trackCustomEvent('button_click', {
    button_name: buttonName,
    label: label || '',
  });
}

/**
 * Records a flexible custom analytics event in GA4
 * @param eventName Name of the event to track
 * @param params Associated event variables/parameters
 */
export function trackCustomEvent(eventName: string, params: object = {}): void {
  if (!GA_MEASUREMENT_ID) return;
  initGA(); // Ensure initialized

  if (window.gtag) {
    window.gtag('event', eventName, {
      ...params,
      timestamp: new Date().toISOString(),
    });
  }
}
