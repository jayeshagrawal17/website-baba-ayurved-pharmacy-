import { useState } from 'react';
import { X, CreditCard, Shield, Lock } from 'lucide-react';
import { paymentService, PaymentResponse } from '../services/paymentService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  userDetails: {
    name: string;
    email: string;
    phone: string;
  };
  onPaymentSuccess: (paymentResponse: PaymentResponse) => void;
  onPaymentFailure: (error: any) => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  amount,
  userDetails,
  onPaymentSuccess,
  onPaymentFailure,
}: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      await paymentService.processPayment(
        amount,
        userDetails,
        (paymentResponse) => {
          setIsProcessing(false);
          onPaymentSuccess(paymentResponse);
        },
        (error) => {
          setIsProcessing(false);
          onPaymentFailure(error);
        }
      );
    } catch (error) {
      setIsProcessing(false);
      onPaymentFailure(error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Complete Payment</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isProcessing}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Order Summary</h4>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Amount:</span>
              <span className="text-2xl font-bold text-green-600">₹{amount.toFixed(2)}</span>
            </div>
          </div>

          {/* Customer Details */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Billing Details</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div>
                <span className="font-medium">Name:</span> {userDetails.name}
              </div>
              <div>
                <span className="font-medium">Email:</span> {userDetails.email}
              </div>
              <div>
                <span className="font-medium">Phone:</span> {userDetails.phone}
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Payment Method</h4>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <CreditCard className="w-6 h-6 text-blue-600" />
                <div>
                  <div className="font-medium">Razorpay Secure Payment</div>
                  <div className="text-sm text-gray-500">Cards, UPI, Net Banking, Wallets</div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Features */}
          <div className="mb-6">
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-green-600" />
                <span>256-bit SSL</span>
              </div>
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-green-600" />
                <span>Secure Payment</span>
              </div>
            </div>
          </div>

          {/* Payment Button */}
          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                <span>Pay ₹{amount.toFixed(2)}</span>
              </>
            )}
          </button>

          {/* Payment Disclaimer */}
          <div className="mt-4 text-xs text-gray-500 text-center">
            <p>
              By clicking "Pay", you agree to our terms and conditions.
              Your payment information is secure and encrypted.
            </p>
          </div>

          {/* Powered by Razorpay */}
          <div className="mt-4 text-center">
            <div className="text-xs text-gray-400">Powered by</div>
            <div className="text-sm font-semibold text-blue-600">Razorpay</div>
          </div>
        </div>
      </div>
    </div>
  );
}