import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '@/styles/globals.css';

const SITE_URL = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '');

export const metadata = {
  metadataBase: new URL(SITE_URL || 'http://localhost:3000'),
  title: {
    template: '%s | CMS',
    default:  'CMS',
  },
  description:   '',
  robots:        { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
