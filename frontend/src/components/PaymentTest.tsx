import { useState } from 'react';
import { paymentService } from '../services/paymentService';

interface PaymentTestProps {
  onClose: () => void;
}

export default function PaymentTest({ onClose }: PaymentTestProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  const testPaymentMethods = async () => {
    setIsLoading(true);
    setTestResult('Testing payment methods...');

    try {
      // Test payment with all methods enabled
      await paymentService.processPayment(
        100, // ₹100 test amount
        {
          name: 'Test User',
          email: 'test@example.com',
          phone: '9999999999'
        },
        (response) => {
          setTestResult(`✅ Payment Successful! Payment ID: ${response.razorpay_payment_id}`);
          setIsLoading(false);
        },
        (error) => {
          if (error.message === 'Payment cancelled by user') {
            setTestResult('❌ Payment cancelled by user');
          } else {
            setTestResult(`❌ Payment failed: ${error.message}`);
          }
          setIsLoading(false);
        }
      );
    } catch (error) {
      setTestResult(`❌ Error: ${error}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Payment Methods Test</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>

          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Expected Payment Methods:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>UPI (Google Pay, PhonePe, Paytm)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Credit/Debit Cards</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span>Net Banking</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>Wallets (Paytm, Mobikwik)</span>
              </div>
            </div>
          </div>

          {testResult && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm">{testResult}</p>
            </div>
          )}

          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-2">Test Payment Options</h4>
            <p className="text-sm text-gray-600 mb-4">
              This will open Razorpay checkout with ₹100 test amount. 
              All payment methods should be visible.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <h5 className="font-medium text-yellow-800 mb-2">Test Credentials:</h5>
              <div className="text-xs text-yellow-700 space-y-1">
                <div><strong>UPI:</strong> success@razorpay</div>
                <div><strong>Card:</strong> 4111 1111 1111 1111</div>
                <div><strong>CVV:</strong> Any 3 digits</div>
                <div><strong>Expiry:</strong> Any future date</div>
              </div>
            </div>
          </div>

          <button
            onClick={testPaymentMethods}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Opening Payment Gateway...' : 'Test Payment Methods'}
          </button>

          <div className="mt-4 text-xs text-gray-500">
            <p><strong>Note:</strong> If UPI is not showing, check:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Razorpay account activation status</li>
              <li>Test mode vs Live mode settings</li>
              <li>Payment method configuration in dashboard</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}