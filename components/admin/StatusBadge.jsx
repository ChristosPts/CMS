const MAP = {
  PUBLISHED: { label: 'Published', cls: 'bg-success' },
  DRAFT:     { label: 'Draft',     cls: 'bg-warning text-dark' },
  HIDDEN:    { label: 'Hidden',    cls: 'bg-secondary' },
};

export default function StatusBadge({ status }) {
  const { label, cls } = MAP[status] ?? { label: status, cls: 'bg-light text-dark' };
  return <span className={`badge ${cls}`}>{label}</span>;
}
