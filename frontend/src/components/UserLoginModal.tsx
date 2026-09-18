import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Phone, Lock, Loader } from 'lucide-react';
import { useUserAuth } from '../context/UserAuthContext';
import UserProfileModal from './UserProfileModal';

interface UserLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
}

export default function UserLoginModal({ isOpen, onClose, onLoginSuccess }: UserLoginModalProps) {
  const { sendOTP, verifyOTP, updateUserProfile } = useUserAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp' | 'profile'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate phone number (10 digits)
    if (!/^\d{10}$/.test(phone)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    const result = await sendOTP(phone);
    setLoading(false);

    if (result.success) {
      setStep('otp');
    } else {
      setError(result.error || 'Failed to send OTP');
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(otp)) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    const result = await verifyOTP(phone, otp);
    setLoading(false);

    if (result.success) {
      // Check if this is a new user who needs to complete profile
      if (result.isNewUser) {
        setStep('profile');
      } else {
        // Existing user with complete profile
        setPhone('');
        setOtp('');
        setStep('phone');
        onLoginSuccess?.();
        onClose();
      }
    } else {
      setError(result.error || 'Invalid OTP');
    }
  };

  const handleProfileComplete = async (username: string, email: string) => {
    const result = await updateUserProfile(username, email);
    
    if (result.success) {
      setPhone('');
      setOtp('');
      setStep('phone');
      onLoginSuccess?.();
      onClose();
    }
    
    return result;
  };

  const handleClose = () => {
    setPhone('');
    setOtp('');
    setStep('phone');
    setError('');
    onClose();
  };

  // Show profile modal if user needs to complete profile
  if (step === 'profile') {
    return createPortal(
      <UserProfileModal
        isOpen={true}
        phone={phone}
        onComplete={handleProfileComplete}
      />,
      document.body
    );
  }

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-fade-in-up">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            {step === 'phone' ? (
              <Phone className="w-8 h-8 text-green-600" />
            ) : (
              <Lock className="w-8 h-8 text-green-600" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {step === 'phone' ? 'Welcome Back' : 'Verify OTP'}
          </h2>
          <p className="text-gray-600 mt-2">
            {step === 'phone'
              ? 'Enter your mobile number to get started'
              : `Enter the OTP sent to +91 ${phone}`}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Number
              </label>
              <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent">
                <span className="px-4 text-gray-600 font-medium">+91</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  maxLength={10}
                  required
                  className="flex-1 px-4 py-3 outline-none rounded-r-lg"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || phone.length !== 10}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                'Send OTP'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-2xl tracking-widest font-semibold"
                disabled={loading}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify OTP'
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setOtp('');
                setError('');
              }}
              className="w-full text-green-600 py-2 text-sm font-medium hover:text-green-700 transition"
            >
              Change Number
            </button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
          By continuing, you agree to our Terms & Conditions
        </div>
      </div>
    </div>,
    document.body
  );
}
