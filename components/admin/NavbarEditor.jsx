'use client';

import { useState } from 'react';
import NavbarItemForm from './NavbarItemForm';

export default function NavbarEditor({ initialTree, activeLocales, defaultLocale, pageOptions }) {
  const [tree,       setTree]       = useState(initialTree);
  const [editingId,  setEditingId]  = useState(null); // item id being edited, or 'new-top', 'new-child-{parentId}'
  const [saving,     setSaving]     = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────────

  function getLabel(item) {
    return (
      item.translations.find((t) => t.locale === defaultLocale)?.label ||
      item.translations[0]?.label ||
      `Item #${item.id}`
    );
  }

  function topLevelItems() {
    return tree.map(({ children: _, ...item }) => item);
  }

  // ── Reorder ────────────────────────────────────────────────────────────

  async function reorderItems(items) {
    await fetch('/api/admin/navbar/reorder', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ items: items.map((i, idx) => ({ id: i.id, sortOrder: idx })) }),
    });
  }

  function moveTop(idx, dir) {
    const next = [...tree];
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setTree(next);
    reorderItems(next);
  }

  function moveChild(parentIdx, childIdx, dir) {
    const next = tree.map((item) => ({ ...item, children: [...item.children] }));
    const children = next[parentIdx].children;
    const swap = dir === 'up' ? childIdx - 1 : childIdx + 1;
    if (swap < 0 || swap >= children.length) return;
    [children[childIdx], children[swap]] = [children[swap], children[childIdx]];
    setTree(next);
    reorderItems(children);
  }

  // ── Delete ─────────────────────────────────────────────────────────────

  async function deleteItem(id, hasChildren) {
    const msg = hasChildren
      ? 'Delete this item and all its child items?'
      : 'Delete this item?';
    if (!confirm(msg)) return;

    await fetch(`/api/admin/navbar/${id}`, { method: 'DELETE' });

    setTree((prev) =>
      prev
        .filter((i) => i.id !== id)
        .map((i) => ({ ...i, children: i.children.filter((c) => c.id !== id) }))
    );
  }

  // ── Save callbacks ─────────────────────────────────────────────────────

  function handleSaved(savedItem) {
    setEditingId(null);

    setTree((prev) => {
      // Remove if exists (update case)
      const withoutOld = prev
        .filter((i) => i.id !== savedItem.id)
        .map((i) => ({
          ...i,
          children: i.children.filter((c) => c.id !== savedItem.id),
        }));

      if (savedItem.parentId) {
        // Insert into appropriate parent's children
        return withoutOld.map((i) => {
          if (i.id !== savedItem.parentId) return i;
          const childExists = i.children.some((c) => c.id === savedItem.id);
          return {
            ...i,
            children: childExists
              ? i.children.map((c) => (c.id === savedItem.id ? savedItem : c))
              : [...i.children, savedItem].sort((a, b) => a.sortOrder - b.sortOrder),
          };
        });
      }

      // Top-level item
      const topExists = withoutOld.some((i) => i.id === savedItem.id);
      const withChildren = { ...savedItem, children: savedItem.children ?? [] };
      return topExists
        ? withoutOld.map((i) => (i.id === savedItem.id ? withChildren : i))
        : [...withoutOld, withChildren].sort((a, b) => a.sortOrder - b.sortOrder);
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="card border-0 shadow-sm p-3 mb-3">
        {tree.length === 0 && (
          <p className="text-muted small mb-3">No navbar items yet. Add one below.</p>
        )}

        {tree.map((item, topIdx) => (
          <div key={item.id} className="mb-1">
            {/* Top-level item row */}
            <div className="d-flex align-items-center gap-2 py-2 px-3 rounded bg-white border">
              <i className="bi bi-grip-vertical text-muted" />
              <span className="fw-medium flex-grow-1">{getLabel(item)}</span>

              {/* URL/page hint */}
              <span className="text-muted small font-monospace">
                {item.url || (item.linkedPageId ? `page #${item.linkedPageId}` : '—')}
              </span>

              {item.openInNewTab && (
                <i className="bi bi-box-arrow-up-right text-muted small" title="Opens in new tab" />
              )}

              {/* Reorder */}
              <div className="d-flex flex-column">
                <button type="button" className="btn btn-sm btn-link p-0 lh-1 text-muted"
                  disabled={topIdx === 0} onClick={() => moveTop(topIdx, 'up')} title="Move up">
                  <i className="bi bi-chevron-up" />
                </button>
                <button type="button" className="btn btn-sm btn-link p-0 lh-1 text-muted"
                  disabled={topIdx === tree.length - 1} onClick={() => moveTop(topIdx, 'down')} title="Move down">
                  <i className="bi bi-chevron-down" />
                </button>
              </div>

              <button type="button" className="btn btn-sm btn-outline-secondary"
                onClick={() => setEditingId(editingId === item.id ? null : item.id)} title="Edit">
                <i className="bi bi-pencil" />
              </button>
              <button type="button" className="btn btn-sm btn-outline-primary"
                onClick={() => setEditingId(`new-child-${item.id}`)} title="Add child">
                <i className="bi bi-indent" />
              </button>
              <button type="button" className="btn btn-sm btn-outline-danger"
                onClick={() => deleteItem(item.id, item.children.length > 0)} title="Delete">
                <i className="bi bi-trash" />
              </button>
            </div>

            {/* Edit form for this top-level item */}
            {editingId === item.id && (
              <div className="ms-4 mt-1">
                <NavbarItemForm
                  initial={{ ...item, children: undefined }}
                  activeLocales={activeLocales}
                  defaultLocale={defaultLocale}
                  pageOptions={pageOptions}
                  topLevelItems={topLevelItems()}
                  onSave={handleSaved}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            )}

            {/* Children */}
            <div className="ms-4">
              {item.children.map((child, childIdx) => (
                <div key={child.id}>
                  <div className="d-flex align-items-center gap-2 py-2 px-3 rounded border mt-1 bg-light">
                    <i className="bi bi-arrow-return-right text-muted" />
                    <span className="small flex-grow-1">{getLabel(child)}</span>
                    <span className="text-muted small font-monospace">
                      {child.url || (child.linkedPageId ? `page #${child.linkedPageId}` : '—')}
                    </span>
                    {child.openInNewTab && (
                      <i className="bi bi-box-arrow-up-right text-muted small" />
                    )}
                    <div className="d-flex flex-column">
                      <button type="button" className="btn btn-sm btn-link p-0 lh-1 text-muted"
                        disabled={childIdx === 0} onClick={() => moveChild(topIdx, childIdx, 'up')}>
                        <i className="bi bi-chevron-up" />
                      </button>
                      <button type="button" className="btn btn-sm btn-link p-0 lh-1 text-muted"
                        disabled={childIdx === item.children.length - 1}
                        onClick={() => moveChild(topIdx, childIdx, 'down')}>
                        <i className="bi bi-chevron-down" />
                      </button>
                    </div>
                    <button type="button" className="btn btn-sm btn-outline-secondary"
                      onClick={() => setEditingId(editingId === child.id ? null : child.id)}>
                      <i className="bi bi-pencil" />
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-danger"
                      onClick={() => deleteItem(child.id, false)}>
                      <i className="bi bi-trash" />
                    </button>
                  </div>

                  {editingId === child.id && (
                    <NavbarItemForm
                      initial={child}
                      activeLocales={activeLocales}
                      defaultLocale={defaultLocale}
                      pageOptions={pageOptions}
                      topLevelItems={topLevelItems()}
                      onSave={handleSaved}
                      onCancel={() => setEditingId(null)}
                    />
                  )}
                </div>
              ))}

              {/* New child form */}
              {editingId === `new-child-${item.id}` && (
                <div className="mt-1">
                  <NavbarItemForm
                    initial={{ parentId: item.id, sortOrder: item.children.length }}
                    activeLocales={activeLocales}
                    defaultLocale={defaultLocale}
                    pageOptions={pageOptions}
                    topLevelItems={topLevelItems()}
                    onSave={handleSaved}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* New top-level form */}
        {editingId === 'new-top' ? (
          <div className="mt-2">
            <NavbarItemForm
              initial={{ sortOrder: tree.length }}
              activeLocales={activeLocales}
              defaultLocale={defaultLocale}
              pageOptions={pageOptions}
              topLevelItems={topLevelItems()}
              onSave={handleSaved}
              onCancel={() => setEditingId(null)}
            />
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-sm btn-outline-primary mt-2"
            onClick={() => setEditingId('new-top')}
          >
            <i className="bi bi-plus-circle me-1" />Add top-level item
          </button>
        )}
      </div>

      <div className="text-muted small">
        <i className="bi bi-info-circle me-1" />
        Changes take effect immediately on the public site. One level of nesting supported.
      </div>
    </div>
  );
}
