/**
 * UI store — manages sidebar, mobile drawer, chat panel, and toast notifications.
 */
import { create } from 'zustand';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface UIState {
  sidebarOpen: boolean;
  mobileChatOpen: boolean;
  mobileNavOpen: boolean;
  toasts: Toast[];

  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setMobileChatOpen: (open: boolean) => void;
  toggleMobileChat: () => void;
  setMobileNavOpen: (open: boolean) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

let toastCounter = 0;

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  mobileChatOpen: false,
  mobileNavOpen: false,
  toasts: [],

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setMobileChatOpen: (open) => set({ mobileChatOpen: open }),
  toggleMobileChat: () => set((state) => ({ mobileChatOpen: !state.mobileChatOpen })),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),

  addToast: (toast) => {
    const id = `toast-${++toastCounter}`;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
