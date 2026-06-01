'use client';

import '@/app/admin/admin-shell.css';
import AdminLayout from '@/components/AdminLayout';

export default function AdminRootLayout({ children }) {
  return <AdminLayout>{children}</AdminLayout>;
}
