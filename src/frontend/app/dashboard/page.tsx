'use client';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Toaster } from 'react-hot-toast';

export default function DashboardPage() {
  return (
    <>
      <DashboardLayout />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: '#10B981',
            },
          },
          error: {
            style: {
              background: '#EF4444',
            },
          },
        }}
      />
    </>
  );
}