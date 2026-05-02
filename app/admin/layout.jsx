// Root admin area layout — applies to /admin/login and all protected pages.
// Provides the NextAuth SessionProvider so client components can use useSession.
import AdminSessionProvider from '@/components/admin/AdminSessionProvider';

export default function AdminAreaLayout({ children }) {
  return <AdminSessionProvider>{children}</AdminSessionProvider>;
}
