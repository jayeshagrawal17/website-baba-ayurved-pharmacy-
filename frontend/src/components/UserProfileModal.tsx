import { useState } from 'react';
import { UserCircle, Mail, Loader, CheckCircle } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  phone: string;
  onComplete: (username: string, email: string) => Promise<{ success: boolean; error?: string }>;
}

export default function UserProfileModal({ isOpen, phone, onComplete }: UserProfileModalProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const validateUsername = (username: string): boolean => {
    // Username should be 3-20 characters, alphanumeric with underscores
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate username
    if (!validateUsername(username)) {
      setError('Username must be 3-20 characters long and contain only letters, numbers, and underscores');
      return;
    }

    // Validate email
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    const result = await onComplete(username.toLowerCase(), email.toLowerCase());
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Failed to save profile. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Complete Your Profile</h2>
          <p className="text-gray-600 mt-2">
            Welcome! Please complete your profile to continue
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Verified Number: +91 {phone}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent">
              <span className="px-3">
                <UserCircle className="w-5 h-5 text-gray-400" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20))}
                placeholder="Enter username"
                required
                className="flex-1 px-4 py-3 outline-none rounded-r-lg"
                disabled={loading}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              3-20 characters, letters, numbers and underscores only
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent">
              <span className="px-3">
                <Mail className="w-5 h-5 text-gray-400" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="flex-1 px-4 py-3 outline-none rounded-r-lg"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !username || !email}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 mr-2 animate-spin" />
                Saving Profile...
              </>
            ) : (
              'Complete Profile'
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
          This information will be used for your orders and communication
        </div>
      </div>
    </div>
  );
}
