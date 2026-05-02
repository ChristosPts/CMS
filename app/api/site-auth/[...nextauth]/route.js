import NextAuth from 'next-auth';
import { siteAuthOptions } from '@/lib/auth';

const handler = NextAuth(siteAuthOptions);

export { handler as GET, handler as POST };
