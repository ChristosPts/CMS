import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from './prisma';

// ── Admin auth ─────────────────────────────────────────────────────────────

export const adminAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Admin Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await prisma.adminUser.findUnique({
          where: { username: credentials.username },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        return {
          id:       String(user.id),
          username: user.username,
          name:     user.name ?? user.username,
          role:     user.role,
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/admin/login' },
  cookies: {
    sessionToken: {
      name:    'admin.session-token',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' },
    },
    callbackUrl: {
      name:    'admin.callback-url',
      options: { sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' },
    },
    csrfToken: {
      name:    'admin.csrf-token',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id       = user.id;
        token.username = user.username;
        token.role     = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id       = token.id;
      session.user.username = token.username;
      session.user.role     = token.role;
      return session;
    },
  },
};

// ── Public site auth ────────────────────────────────────────────────────────

export const siteAuthOptions = {
  providers: [
    CredentialsProvider({
      id:   'site-credentials',
      name: 'Site',
      credentials: {
        email:      { label: 'Email',       type: 'email' },
        password:   { label: 'Password',    type: 'password' },
        rememberMe: { label: 'Remember me', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.publicUser.findUnique({
          where: { email: credentials.email },
        });

        if (!user)                return null;
        if (!user.emailVerified)  return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        return {
          id:         String(user.id),
          email:      user.email,
          name:       user.name || user.email,
          role:       user.publicRole,
          rememberMe: credentials.rememberMe === 'true',
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge:   30 * 24 * 60 * 60, // 30 days (shortened to 1 day without rememberMe via jwt callback)
  },
  pages: { signIn: '/auth/login' },
  cookies: {
    sessionToken: {
      name:    'site.session-token',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' },
    },
    callbackUrl: {
      name:    'site.callback-url',
      options: { sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' },
    },
    csrfToken: {
      name:    'site.csrf-token',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id   = user.id;
        token.role = user.role;
        // Shorten session if "remember me" was not checked
        if (!user.rememberMe) {
          token.exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id   = token.id;
      session.user.role = token.role;
      return session;
    },
  },
};
