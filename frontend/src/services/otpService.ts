// MSG91 OTP Widget Service
// This service handles OTP using MSG91 Widget (CAPTCHA disabled)

const MSG91_AUTH_KEY = import.meta.env.VITE_MSG91_AUTH_KEY;
const MSG91_WIDGET_ID = import.meta.env.VITE_MSG91_WIDGET_ID;
const MSG91_TOKEN_AUTH = import.meta.env.VITE_MSG91_TOKEN_AUTH;

interface OTPResponse {
  success: boolean;
  message?: string;
  data?: any;
}

declare global {
  interface Window {
    initSendOTP: (config: any) => void;
    sendOtp?: (identifier?: string) => void;
    verifyOtp?: (otp: string) => void;
  }
}

let widgetInitialized = false;
let otpPromiseResolve: ((value: OTPResponse) => void) | null = null;
let otpPromiseReject: ((value: OTPResponse) => void) | null = null;

/**
 * Load MSG91 Widget Script
 */
const loadWidgetScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.getElementById('msg91-widget-script')) {
      resolve();
      return;
    }

    const urls = [
      'https://verify.msg91.com/otp-provider.js',
      'https://verify.phone91.com/otp-provider.js'
    ];

    let i = 0;
    function attempt() {
      const s = document.createElement('script');
      s.id = 'msg91-widget-script';
      s.src = urls[i];
      s.async = true;
      s.onload = () => {
        console.log('✅ MSG91 Widget script loaded successfully');
        resolve();
      };
      s.onerror = () => {
        console.warn(`⚠️ Failed to load from ${urls[i]}`);
        i++;
        if (i < urls.length) {
          attempt();
        } else {
          reject(new Error('Failed to load MSG91 widget script'));
        }
      };
      document.head.appendChild(s);
    }
    attempt();
  });
};

/**
 * Initialize MSG91 OTP Widget
 */
const initializeWidget = (phoneNumber: string): Promise<OTPResponse> => {
  return new Promise((resolve, reject) => {
    otpPromiseResolve = resolve;
    otpPromiseReject = reject;

    const configuration = {
      widgetId: MSG91_WIDGET_ID,
      tokenAuth: MSG91_TOKEN_AUTH,
      identifier: phoneNumber, // Important: Pass phone number here
      exposeMethods: true,
      success: (data: any) => {
        console.log('✅ OTP Widget Success:', data);
        console.log('📋 Access Token:', data.token || data.accessToken);
        if (otpPromiseResolve) {
          otpPromiseResolve({
            success: true,
            message: 'OTP verified successfully',
            data: data
          });
        }
      },
      failure: (error: any) => {
        console.error('❌ OTP Widget Failure:', error);
        console.error('📋 Error Details:', JSON.stringify(error, null, 2));
        if (otpPromiseReject) {
          otpPromiseReject({
            success: false,
            message: error.message || 'OTP verification failed',
            data: error
          });
        }
      },
    };

    if (typeof window.initSendOTP === 'function') {
      console.log('🚀 Initializing MSG91 Widget with phone:', phoneNumber);
      window.initSendOTP(configuration);
      widgetInitialized = true;
      
      // Widget will automatically send OTP after initialization
      console.log('⏰ Widget initialized. OTP will be sent automatically...');
    } else {
      reject({
        success: false,
        message: 'MSG91 Widget script not loaded'
      });
    }
  });
};

/**
 * Send OTP using MSG91 Widget
 */
export const sendOTP = async (phoneNumber: string): Promise<OTPResponse> => {
  try {
    const formattedPhone = phoneNumber.replace(/^\+91/, '').replace(/\D/g, '');
    
    // Validate phone number
    if (formattedPhone.length !== 10) {
      return { success: false, message: 'Invalid phone number format' };
    }

    // For test numbers (development)
    const testNumbers = ['9999999999', '9876543210', '8888888888'];
    if (testNumbers.includes(formattedPhone)) {
      console.log(`🧪 [TEST MODE] OTP for ${formattedPhone}: 123456`);
      return { 
        success: true, 
        message: 'OTP sent successfully (test mode)',
        data: { testMode: true }
      };
    }

    // Load widget script if not already loaded
    await loadWidgetScript();

    // Initialize widget with phone number
    // MSG91 Widget expects format: 91XXXXXXXXXX (with country code)
    const widgetPhoneFormat = `91${formattedPhone}`;
    console.log(`📱 Sending OTP to ${formattedPhone}... (Widget format: ${widgetPhoneFormat})`);
    
    // Wait for initialization to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Initialize widget - DON'T await, it only resolves after verification
    initializeWidget(widgetPhoneFormat).catch(err => {
      console.error('Widget initialization error:', err);
    });
    
    // Wait for OTP to be triggered
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('✅ OTP sent! Check your phone.');
    return { 
      success: true, 
      message: 'OTP sent successfully. Please check your phone.' 
    };
  } catch (error: any) {
    console.error('❌ Error sending OTP:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to send OTP. Please try again.' 
    };
  }
};

/**
 * Verify OTP
 */
export const verifyOTP = async (
  phoneNumber: string,
  otp: string
): Promise<OTPResponse> => {
  try {
    const formattedPhone = phoneNumber.replace(/^\+91/, '').replace(/\D/g, '');

    // For test numbers
    const testNumbers = ['9999999999', '9876543210', '8888888888'];
    if (testNumbers.includes(formattedPhone)) {
      if (otp === '123456') {
        console.log(`✅ [TEST MODE] OTP verified for ${formattedPhone}`);
        return { 
          success: true, 
          message: 'OTP verified successfully (test mode)',
          data: { 
            testMode: true,
            accessToken: 'test_token_' + formattedPhone
          }
        };
      } else {
        return { 
          success: false, 
          message: 'Invalid OTP. Use 123456 for test numbers.' 
        };
      }
    }

    // Production: Verify using widget
    if (!widgetInitialized) {
      return { 
        success: false, 
        message: 'Widget not initialized. Please request OTP first.' 
      };
    }

    console.log(`🔍 Verifying OTP: ${otp}...`);

    if (window.verifyOtp) {
      window.verifyOtp(otp);
      
      // The success/failure callbacks in initializeWidget will handle the response
      // We return a pending status here
      return new Promise((resolve) => {
        // Override the promise handlers to resolve this verification call
        const originalResolve = otpPromiseResolve;
        const originalReject = otpPromiseReject;

        otpPromiseResolve = (result) => {
          resolve(result);
          if (originalResolve) originalResolve(result);
        };

        otpPromiseReject = (result) => {
          resolve(result);
          if (originalReject) originalReject(result);
        };
      });
    }

    return { 
      success: false, 
      message: 'Widget verification method not available' 
    };
  } catch (error: any) {
    console.error('❌ Error verifying OTP:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to verify OTP. Please try again.' 
    };
  }
};

/**
 * Verify access token on server side (optional)
 */
export const verifyAccessToken = async (accessToken: string): Promise<OTPResponse> => {
  try {
    const response = await fetch('https://control.msg91.com/api/v5/widget/verifyAccessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authkey: MSG91_AUTH_KEY,
        'access-token': accessToken,
      }),
    });

    const data = await response.json();

    if (response.ok && data.type === 'success') {
      console.log('✅ Access token verified:', data);
      return { success: true, message: 'Token verified', data };
    } else {
      console.error('❌ Token verification failed:', data);
      return { success: false, message: 'Invalid access token' };
    }
  } catch (error) {
    console.error('❌ Error verifying access token:', error);
    return { success: false, message: 'Failed to verify token' };
  }
};

/**
 * Resend OTP
 */
export const resendOTP = async (phoneNumber: string): Promise<OTPResponse> => {
  console.log('🔄 Resending OTP...');
  widgetInitialized = false;
  return sendOTP(phoneNumber);
};

/**
 * Generate a session token after successful OTP verification
 * This is a simple implementation - in production, use proper JWT tokens
 */
export const generateSessionToken = (phoneNumber: string): string => {
  const token = btoa(JSON.stringify({
    phone: phoneNumber,
    timestamp: Date.now(),
    random: Math.random().toString(36),
  }));
  return token;
};

/**
 * Validate session token
 */
export const validateSessionToken = (token: string): { valid: boolean; phone?: string } => {
  try {
    const decoded = JSON.parse(atob(token));
    const tokenAge = Date.now() - decoded.timestamp;
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

    if (tokenAge > maxAge) {
      return { valid: false };
    }

    return { valid: true, phone: decoded.phone };
  } catch (error) {
    return { valid: false };
  }
};
