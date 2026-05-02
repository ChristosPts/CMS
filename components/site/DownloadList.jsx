// Server component — receives pre-fetched, locale-resolved download items.

const TYPE_META = {
  'application/pdf': { label: 'PDF', icon: 'file-earmark-pdf', cls: 'text-danger' },
  'application/msword': { label: 'DOC', icon: 'file-earmark-word', cls: 'text-primary' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { label: 'DOCX', icon: 'file-earmark-word', cls: 'text-primary' },
};

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Props:
 *  items – array of { download, title, description } (locale-resolved)
 *  heading – optional section heading
 */
export default function DownloadList({ items, heading }) {
  if (!items?.length) return null;

  return (
    <div className="mt-4">
      {heading && <h5 className="mb-3">{heading}</h5>}
      <ul className="list-group list-group-flush">
        {items.map(({ download, title, description }) => {
          const meta = TYPE_META[download.fileType] ?? { label: 'FILE', icon: 'file-earmark', cls: 'text-secondary' };
          return (
            <li key={download.id} className="list-group-item px-0 d-flex align-items-center gap-3">
              <i className={`bi bi-${meta.icon} fs-4 ${meta.cls} flex-shrink-0`} />
              <div className="flex-grow-1">
                <div className="fw-medium">{title}</div>
                {description && <div className="text-muted small">{description}</div>}
                <div className="text-muted small">
                  {meta.label} · {formatBytes(download.fileSize)}
                </div>
              </div>
              <a
                href={`/uploads/${download.filename}`}
                target="_blank"
                rel="noreferrer"
                download={download.originalName}
                className="btn btn-sm btn-outline-secondary flex-shrink-0"
              >
                <i className="bi bi-download me-1" />Download
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
