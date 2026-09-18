// Payment service for Razorpay integration

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface PaymentOptions {
  amount: number;
  currency: string;
  orderId: string;
  key: string;
  name: string;
  description: string;
  image?: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
  method?: {
    netbanking?: boolean;
    card?: boolean;
    upi?: boolean;
    wallet?: boolean;
  };
  config?: {
    display: {
      blocks: any;
      sequence: string[];
      preferences: {
        show_default_blocks: boolean;
      };
    };
  };
  handler: (response: PaymentResponse) => void;
  modal: {
    ondismiss: () => void;
  };
}

export interface PaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface CreateOrderRequest {
  amount: number;
  currency: string;
  receipt: string;
}

export interface CreateOrderResponse {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

class PaymentService {
  // Remove trailing slash from API_BASE_URL to prevent double slashes
  private baseURL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
  private razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_RugTH8y39IYTiU';

  // Load Razorpay script dynamically
  async loadRazorpay(): Promise<boolean> {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  // Create order on backend
  async createOrder(orderData: CreateOrderRequest): Promise<CreateOrderResponse> {
    try {
      const response = await fetch(`${this.baseURL}/create-payment-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment order');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating payment order:', error);
      throw error;
    }
  }

  // Verify payment on backend
  async verifyPayment(paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): Promise<{ success: boolean; message: string; status?: string; amount?: number }> {
    try {
      const response = await fetch(`${this.baseURL}/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        throw new Error('Payment verification failed');
      }

      const result = await response.json();
      
      // Log detailed response for debugging
      console.log('Payment verification result:', result);
      
      return result;
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  }

  // Initialize Razorpay payment
  async initiatePayment(options: PaymentOptions): Promise<void> {
    const isLoaded = await this.loadRazorpay();
    
    if (!isLoaded) {
      throw new Error('Razorpay SDK failed to load');
    }

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  }

  // Process payment flow with enhanced UPI support
  async processPayment(
    amount: number,
    userDetails: {
      name: string;
      email: string;
      phone: string;
    },
    onSuccess: (paymentResponse: PaymentResponse) => void,
    onFailure: (error: any) => void
  ): Promise<void> {
    try {
      // Step 1: Create order on backend
      const orderData: CreateOrderRequest = {
        amount: amount * 100, // Convert to paisa
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
      };

      const order = await this.createOrder(orderData);

      // Step 2: Initialize Razorpay payment with UPI priority
      const options: PaymentOptions = {
        amount: order.amount,
        currency: order.currency,
        orderId: order.id,
        key: this.razorpayKeyId,
        name: 'Baba Ayurveda Pharmacy',
        description: 'Ayurvedic Products Purchase',
        image: '/logo.png',
        prefill: {
          name: userDetails.name,
          email: userDetails.email,
          contact: userDetails.phone,
        },
        theme: {
          color: '#16a34a',
        },
        // Enable all payment methods explicitly
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
        },
        // Configure display to prioritize UPI
        config: {
          display: {
            blocks: {
              utib: {
                name: 'Pay using UPI',
                instruments: [
                  {
                    method: 'upi'
                  }
                ]
              },
              card: {
                name: 'Pay using Cards',
                instruments: [
                  {
                    method: 'card'
                  }
                ]
              },
              banks: {
                name: 'Pay using Net Banking',
                instruments: [
                  {
                    method: 'netbanking'
                  }
                ]
              },
              wallet: {
                name: 'Pay using Wallets',
                instruments: [
                  {
                    method: 'wallet'
                  }
                ]
              }
            },
            sequence: ['utib', 'card', 'banks', 'wallet'],
            preferences: {
              show_default_blocks: true
            }
          }
        },
        handler: async (response: PaymentResponse) => {
          try {
            console.log('Payment response received:', response);
            
            // Ensure we have all required fields for verification
            const verificationData = {
              razorpay_order_id: response.razorpay_order_id || order.id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature || ''
            };
            
            console.log('Sending verification data:', verificationData);
            
            // Step 3: Verify payment on backend
            const verification = await this.verifyPayment(verificationData);
            
            console.log('Verification result:', verification);
            
            if (verification.success) {
              // Create an enhanced response with the order_id from our backend order
              const enhancedResponse: PaymentResponse = {
                ...response,
                razorpay_order_id: order.id, // Use the order ID we created
                razorpay_signature: response.razorpay_signature || ''
              };
              
              // Check if payment was captured
              if (verification.status === 'captured' || verification.status === 'assumed_captured') {
                onSuccess(enhancedResponse);
              } else if (verification.status === 'authorized') {
                // Payment authorized but not captured - still consider as success
                // but notify user that processing might take a moment
                console.warn('Payment authorized but not captured automatically');
                onSuccess(enhancedResponse);
              } else {
                onFailure(new Error(`Payment verification succeeded but status is: ${verification.status}`));
              }
            } else {
              console.error('Payment verification failed:', verification.message);
              onFailure(new Error(`Payment verification failed: ${verification.message}`));
            }
          } catch (error) {
            console.error('Error in payment handler:', error);
            onFailure(error);
          }
        },
        modal: {
          ondismiss: () => {
            onFailure(new Error('Payment cancelled by user'));
          },
        },
      };

      await this.initiatePayment(options);
    } catch (error) {
      onFailure(error);
    }
  }
}

export const paymentService = new PaymentService();