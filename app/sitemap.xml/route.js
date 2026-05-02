import prisma from '@/lib/prisma';

const SITE_URL = (process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');

function toDate(d) {
  return new Date(d).toISOString().split('T')[0];
}

function urlEntry(loc, lastmod, priority = '0.7', changefreq = 'weekly') {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export async function GET() {
  const [pages, articles] = await Promise.all([
    prisma.page.findMany({
      where:  { status: 'PUBLISHED', visibility: 'PUBLIC' },
      select: { slug: true, template: true, updatedAt: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.article.findMany({
      where:  { status: 'PUBLISHED', visibility: 'PUBLIC' },
      select: { slug: true, updatedAt: true, publishDate: true },
      include: { parentPage: { select: { slug: true } } },
      orderBy: { publishDate: 'desc' },
    }),
  ]);

  const entries = [];

  // Home page
  entries.push(urlEntry(`${SITE_URL}/`, toDate(new Date()), '1.0', 'daily'));

  // Pages (skip HOME — it renders at /)
  for (const page of pages) {
    if (page.template === 'HOME') continue;
    entries.push(
      urlEntry(`${SITE_URL}/${page.slug}`, toDate(page.updatedAt), '0.8', 'weekly')
    );
  }

  // Articles
  for (const article of articles) {
    if (!article.parentPage) continue;
    const date = article.publishDate ?? article.updatedAt;
    entries.push(
      urlEntry(
        `${SITE_URL}/${article.parentPage.slug}/${article.slug}`,
        toDate(date),
        '0.6',
        'monthly'
      )
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
