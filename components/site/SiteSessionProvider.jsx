'use client';

import { SessionProvider } from 'next-auth/react';

export default function SiteSessionProvider({ children }) {
  return (
    <SessionProvider basePath="/api/site-auth">
      {children}
    </SessionProvider>
  );
}
