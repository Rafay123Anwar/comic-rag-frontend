import type { ReactNode } from 'react';
import { ToastContainer } from '../components/common/Toast';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
}
