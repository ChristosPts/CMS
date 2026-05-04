import Link from 'next/link';

export default function Breadcrumb({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="breadcrumb" className="mb-4">
      <ol className="breadcrumb">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className={`breadcrumb-item ${isLast ? 'active' : ''}`} aria-current={isLast ? 'page' : undefined}>
              {isLast || !item.href ? item.label : <Link href={item.href}>{item.label}</Link>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
