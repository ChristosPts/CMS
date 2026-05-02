import { redirect } from 'next/navigation';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const locale   = searchParams.get('locale') ?? 'en';
  const returnTo = searchParams.get('returnTo') ?? '/';

  const response = new Response(null, {
    status: 302,
    headers: { Location: returnTo },
  });

  response.headers.append(
    'Set-Cookie',
    `site-locale=${encodeURIComponent(locale)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`
  );

  return response;
}
