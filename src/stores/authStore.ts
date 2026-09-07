/**
 * Authentication Store — manages JWT token, current user, login, signup, and logout.
 */
import { create } from 'zustand';
import axios from 'axios';
import type { LoginCredentials, SignupCredentials, User } from '../types/auth';
import { getMe, login as apiLogin, signup as apiSignup } from '../services/authApi';
import { setSkipAuthRedirect } from '../services/api';
import { clearAllImageCache } from '../services/imageCache';
import { getErrorMessage } from '../utils/errors';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  logout: () => void;
  initializeAuth: () => Promise<void>;
  clearError: () => void;
}

const TOKEN_KEY = 'auth_token';

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: null,
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),
  isInitialized: false,
  isLoading: false,
  error: null,

  initializeAuth: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
      });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      // Prevent the global 401 interceptor from wiping localStorage during this check;
      // we will handle auth rejection ourselves below.
      setSkipAuthRedirect(true);
      const user = await getMe();
      set({
        token,
        user,
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
      });
    } catch (err: unknown) {
      // Make sure the flag is reset even if getMe throws synchronously
      setSkipAuthRedirect(false);

      const isAuthRejection =
        axios.isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 403);

      if (isAuthRejection) {
        // Token is invalid / expired — clear it and require re-login
        localStorage.removeItem(TOKEN_KEY);
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isInitialized: true,
          isLoading: false,
        });
      } else {
        // Network error or server issue — keep the token, mark as authenticated
        // so the user isn't kicked out just because the backend was briefly unreachable
        set({
          token,
          isAuthenticated: true,
          isInitialized: true,
          isLoading: false,
        });
      }
    }
  },

  login: async (credentials: LoginCredentials) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiLogin(credentials);
      localStorage.setItem(TOKEN_KEY, response.access_token);
      set({
        token: response.access_token,
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  signup: async (credentials: SignupCredentials) => {
    try {
      set({ isLoading: true, error: null });
      await apiSignup(credentials);
      set({ isLoading: false, error: null });
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    clearAllImageCache();
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));
