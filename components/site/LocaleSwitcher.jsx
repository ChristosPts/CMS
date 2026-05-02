// Renders locale switch links that set the site-locale cookie via /api/locale.
// Only shown when more than one locale is active.

export default function LocaleSwitcher({ activeLocales, currentLocale, returnPath }) {
  if (activeLocales.length <= 1) return null;

  return (
    <div className="d-flex gap-2">
      {activeLocales.map((loc) => (
        <a
          key={loc}
          href={`/api/locale?locale=${loc}&returnTo=${encodeURIComponent(returnPath)}`}
          className={`btn btn-sm ${currentLocale === loc ? 'btn-secondary' : 'btn-outline-secondary'}`}
        >
          {loc.toUpperCase()}
        </a>
      ))}
    </div>
  );
}
