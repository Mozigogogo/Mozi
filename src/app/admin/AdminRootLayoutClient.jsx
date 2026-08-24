'use client';

import '@/app/admin/admin-shell.css';
import AdminLayout from '@/components/AdminLayout';

export default function AdminRootLayoutClient({ children }) {
  return <AdminLayout>{children}</AdminLayout>;
}
