import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as otpService from '../services/otpService';
import apiService from '../services/apiService';
import { User } from '../types';

interface UserAuthContextType {
  user: User | null;
  loading: boolean;
  sendOTP: (phone: string) => Promise<{ success: boolean; error?: string }>;
  verifyOTP: (phone: string, otp: string) => Promise<{ success: boolean; error?: string; isNewUser?: boolean }>;
  updateUserProfile: (username: string, email: string) => Promise<{ success: boolean; error?: string }>;
  signOutUser: () => Promise<void>;
}

const UserAuthContext = createContext<UserAuthContextType | undefined>(undefined);

export function UserAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in localStorage
    const sessionToken = localStorage.getItem('user_session_token');
    const userData = localStorage.getItem('user_data');

    if (sessionToken && userData) {
      const isValid = otpService.validateSessionToken(sessionToken);
      if (isValid.valid) {
        setUser(JSON.parse(userData));
      } else {
        localStorage.removeItem('user_session_token');
        localStorage.removeItem('user_data');
      }
    }
    setLoading(false);
  }, []);

  const sendOTP = async (phone: string) => {
    try {
      const result = await otpService.sendOTP(phone);
      
      if (result.success) {
        return { success: true };
      } else {
        return { success: false, error: result.message || 'Failed to send OTP' };
      }
    } catch (error) {
      return { success: false, error: 'Failed to send OTP' };
    }
  };

  const verifyOTP = async (phone: string, otp: string) => {
    try {
      const result = await otpService.verifyOTP(phone, otp);

      if (result.success) {
        // Create or fetch user using backend API
        const formattedPhone = `+91${phone.replace(/^\+91/, '').replace(/\D/g, '')}`;
        
        try {
          // Create user (will return existing user if already exists)
          const userResult = await apiService.createUser({ phone: formattedPhone });
          
          if (!userResult.success) {
            console.error('Error creating/fetching user:', userResult.message);
            return { success: false, error: 'Failed to create user account' };
          }

          const userData: User = {
            id: userResult.user.id,
            phone: userResult.user.phone,
            username: userResult.user.username,
            email: userResult.user.email,
            created_at: userResult.user.created_at,
            updated_at: userResult.user.updated_at,
          };

          const isNewUser = userResult.is_new_user;

          // Generate session token
          const sessionToken = otpService.generateSessionToken(formattedPhone);
          
          // Store in localStorage
          localStorage.setItem('user_session_token', sessionToken);
          localStorage.setItem('user_data', JSON.stringify(userData));
          
          setUser(userData);
          console.log('Login successful. Is new user?', isNewUser, 'User data:', userData);
          return { success: true, isNewUser };
        } catch (apiError) {
          console.error('API Error:', apiError);
          return { success: false, error: 'Failed to create user account' };
        }
      }

      return { success: false, error: result.message || 'Invalid OTP' };
    } catch (error) {
      console.error('OTP verification error:', error);
      return { success: false, error: 'Failed to verify OTP' };
    }
  };

  const updateUserProfile = async (username: string, email: string) => {
    try {
      if (!user) {
        return { success: false, error: 'No user logged in' };
      }

      // Update user profile via backend API
      try {
        const result = await apiService.updateUser(user.id, {
          username: username.toLowerCase(),
          email: email.toLowerCase(),
        });

        if (!result.success) {
          // Handle specific error messages from backend
          if (result.message && result.message.includes('unique constraint')) {
            if (result.message.includes('username')) {
              return { success: false, error: 'Username already taken. Please choose another.' };
            }
            if (result.message.includes('email')) {
              return { success: false, error: 'Email already registered. Please use another.' };
            }
          }
          return { success: false, error: result.message || 'Failed to update profile. Please try again.' };
        }

        // Update local user state
        const updatedUser: User = {
          ...user,
          username: result.user.username,
          email: result.user.email,
          updated_at: result.user.updated_at,
        };

        setUser(updatedUser);
        localStorage.setItem('user_data', JSON.stringify(updatedUser));

        return { success: true };
      } catch (apiError: any) {
        console.error('API Error updating profile:', apiError);
        
        // Try to parse error message
        const errorMessage = apiError?.message || 'Failed to update profile. Please try again.';
        
        if (errorMessage.includes('username')) {
          return { success: false, error: 'Username already taken. Please choose another.' };
        }
        if (errorMessage.includes('email')) {
          return { success: false, error: 'Email already registered. Please use another.' };
        }
        
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: 'Failed to update profile. Please try again.' };
    }
  };

  const signOutUser = async () => {
    localStorage.removeItem('user_session_token');
    localStorage.removeItem('user_data');
    setUser(null);
  };

  return (
    <UserAuthContext.Provider
      value={{ user, loading, sendOTP, verifyOTP, updateUserProfile, signOutUser }}
    >
      {children}
    </UserAuthContext.Provider>
  );
}

export function useUserAuth() {
  const context = useContext(UserAuthContext);
  if (context === undefined) {
    throw new Error('useUserAuth must be used within a UserAuthProvider');
  }
  return context;
}
