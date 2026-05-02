import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import RegisterForm from './RegisterForm';

export const metadata = { title: 'Create Account' };

export default async function RegisterPage() {
  const settings = await prisma.setting.findMany({
    where: { key: { in: ['registration_enabled', 'register_salutation_enabled', 'register_phone_enabled', 'register_company_enabled'] } },
  });

  const get = (key) => settings.find((s) => s.key === key)?.value ?? 'false';

  if (get('registration_enabled') === 'false') {
    redirect('/auth/login');
  }

  return (
    <RegisterForm
      salutationEnabled={get('register_salutation_enabled') === 'true'}
      phoneEnabled={get('register_phone_enabled') === 'true'}
      companyEnabled={get('register_company_enabled') === 'true'}
    />
  );
}
