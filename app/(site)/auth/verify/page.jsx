import { redirect } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/prisma';

export const metadata = { title: 'Verify Email' };

export default async function VerifyPage({ searchParams }) {
  const { token } = await searchParams;

  if (!token) {
    return <VerifyMessage type="error" text="Invalid verification link." />;
  }

  const user = await prisma.publicUser.findFirst({
    where: { verifyToken: token, emailVerified: false },
  });

  if (!user) {
    return (
      <VerifyMessage
        type="error"
        text="This link is invalid or has already been used. Try logging in or register again."
      />
    );
  }

  await prisma.publicUser.update({
    where: { id: user.id },
    data:  { emailVerified: true, verifyToken: null },
  });

  redirect('/auth/login?verified=1');
}

function VerifyMessage({ type, text }) {
  return (
    <div className="container py-5 text-center">
      <i className={`bi bi-${type === 'error' ? 'x-circle text-danger' : 'check-circle text-success'} fs-1 mb-3 d-block`} />
      <p className="text-muted">{text}</p>
      <Link href="/auth/login" className="btn btn-outline-secondary btn-sm">Go to login</Link>
    </div>
  );
}
