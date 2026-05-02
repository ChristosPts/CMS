import { notFound } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import ResetPasswordForm from './ResetPasswordForm';

export const metadata = { title: 'Reset Password' };

export default async function ResetPasswordPage({ searchParams }) {
  const { token } = await searchParams;

  if (!token) notFound();

  // Validate token server-side before rendering the form
  const user = await prisma.publicUser.findFirst({
    where: {
      resetToken:    token,
      resetTokenExp: { gt: new Date() },
    },
    select: { id: true },
  });

  if (!user) {
    return (
      <div className="container py-5 text-center">
        <i className="bi bi-x-circle text-danger fs-1 mb-3 d-block" />
        <h5>Link expired or invalid</h5>
        <p className="text-muted">Password reset links are valid for 1 hour.</p>
        <Link href="/auth/forgot-password" className="btn btn-primary btn-sm">Request a new link</Link>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
