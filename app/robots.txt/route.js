const SITE_URL = (process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export async function GET() {
  const content = `User-agent: *
Disallow: /admin
Disallow: /api/
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
