'use client';

import { useState } from 'react';
import NavbarItemForm from './NavbarItemForm';

const MAX_DEPTH = 3;

// Flatten tree into [{id, path}] for the parent selector
function flattenParentOptions(nodes, prefix = '', depth = 0) {
  if (depth >= MAX_DEPTH - 1) return [];
  const result = [];
  for (const node of nodes) {
    const label = node.translations[0]?.label || `Item #${node.id}`;
    const path  = prefix ? `${prefix} › ${label}` : label;
    result.push({ id: node.id, path });
    if (node.children?.length) {
      result.push(...flattenParentOptions(node.children, path, depth + 1));
    }
  }
  return result;
}

// Build tree from flat items array
function buildTree(items, parentId = null, depth = 0) {
  if (depth >= MAX_DEPTH) return [];
  return items
    .filter((i) => (i.parentId ?? null) === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({ ...item, children: buildTree(items, item.id, depth + 1) }));
}

// Flatten tree back to array (without children prop)
function flatItems(nodes) {
  const result = [];
  function walk(arr) { arr.forEach((n) => { result.push({ ...n, children: undefined }); walk(n.children ?? []); }); }
  walk(nodes);
  return result;
}

// Insert/replace a node in the tree (preserves existing children)
function insertIntoTree(tree, node) {
  const withoutNode = removeFromTree(tree, node.id);
  if (!node.parentId) {
    return [...withoutNode, { ...node, children: [] }].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return withoutNode.map((item) => {
    if (item.id === node.parentId) {
      const kids   = item.children ?? [];
      const newKid = { ...node, children: [] };
      const merged = [...kids.filter((c) => c.id !== node.id), newKid].sort((a, b) => a.sortOrder - b.sortOrder);
      return { ...item, children: merged };
    }
    return { ...item, children: insertIntoTree(item.children ?? [], node) };
  });
}

function removeFromTree(tree, id) {
  return tree.filter((i) => i.id !== id).map((i) => ({ ...i, children: removeFromTree(i.children ?? [], id) }));
}

// ── Single item row (recursive) ────────────────────────────────────────────

function NavItemRow({ item, siblings, index, depth, activeLocales, defaultLocale, pageOptions, parentOptions, editingId, setEditingId, onSaved, onDeleted, onMove }) {
  const label       = item.translations.find((t) => t.locale === defaultLocale)?.label || item.translations[0]?.label || `#${item.id}`;
  const isEditing   = editingId === item.id;
  const canAddChild = depth < MAX_DEPTH - 1;
  const newChildKey = `new-child-${item.id}`;
  const indentPx    = depth * 20;

  return (
    <div style={{ marginLeft: indentPx }}>
      {/* Row */}
      <div className={`d-flex align-items-center gap-2 py-2 px-3 rounded border mb-1 ${depth === 0 ? 'bg-white' : 'bg-light'}`}>
        {depth > 0 && <i className="bi bi-arrow-return-right text-muted small" />}
        <span className={`${depth === 0 ? 'fw-medium' : 'small'} flex-grow-1 text-truncate`}>{label}</span>
        <span className="text-muted small font-monospace" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.url || (item.linkedPageId ? `page #${item.linkedPageId}` : '—')}
        </span>
        {item.openInNewTab && <i className="bi bi-box-arrow-up-right text-muted small" />}

        <div className="d-flex flex-column">
          <button type="button" className="btn btn-sm btn-link p-0 lh-1 text-muted" disabled={index === 0} onClick={() => onMove(item, siblings, -1)}><i className="bi bi-chevron-up" /></button>
          <button type="button" className="btn btn-sm btn-link p-0 lh-1 text-muted" disabled={index === siblings.length - 1} onClick={() => onMove(item, siblings, 1)}><i className="bi bi-chevron-down" /></button>
        </div>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setEditingId(isEditing ? null : item.id)}><i className="bi bi-pencil" /></button>
        {canAddChild && (
          <button type="button" className="btn btn-sm btn-outline-primary" title="Add child item" onClick={() => setEditingId(editingId === newChildKey ? null : newChildKey)}><i className="bi bi-indent" /></button>
        )}
        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => onDeleted(item.id, item.children?.length > 0)}><i className="bi bi-trash" /></button>
      </div>

      {/* Edit form */}
      {isEditing && (
        <div className="mb-1">
          <NavbarItemForm
            initial={item}
            activeLocales={activeLocales}
            defaultLocale={defaultLocale}
            pageOptions={pageOptions}
            parentOptions={parentOptions.filter((p) => p.id !== item.id)}
            onSave={onSaved}
            onCancel={() => setEditingId(null)}
          />
        </div>
      )}

      {/* Children */}
      {(item.children ?? []).map((child, ci) => (
        <NavItemRow
          key={child.id}
          item={child}
          siblings={item.children}
          index={ci}
          depth={depth + 1}
          activeLocales={activeLocales}
          defaultLocale={defaultLocale}
          pageOptions={pageOptions}
          parentOptions={parentOptions}
          editingId={editingId}
          setEditingId={setEditingId}
          onSaved={onSaved}
          onDeleted={onDeleted}
          onMove={onMove}
        />
      ))}

      {/* Add child form */}
      {canAddChild && editingId === newChildKey && (
        <div className="mb-1">
          <NavbarItemForm
            initial={{ parentId: item.id, sortOrder: item.children?.length ?? 0 }}
            activeLocales={activeLocales}
            defaultLocale={defaultLocale}
            pageOptions={pageOptions}
            parentOptions={parentOptions}
            onSave={onSaved}
            onCancel={() => setEditingId(null)}
          />
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function NavbarEditor({ initialTree, activeLocales, defaultLocale, pageOptions }) {
  const [tree,      setTree]      = useState(initialTree);
  const [editingId, setEditingId] = useState(null);

  const parentOptions = flattenParentOptions(tree);

  async function reorderSiblings(siblings) {
    await fetch('/api/admin/navbar/reorder', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ items: siblings.map((s, i) => ({ id: s.id, sortOrder: i })) }),
    });
  }

  async function onMove(item, siblings, dir) {
    const idx = siblings.findIndex((s) => s.id === item.id);
    const target = idx + dir;
    if (target < 0 || target >= siblings.length) return;
    const next = [...siblings];
    [next[idx], next[target]] = [next[target], next[idx]];
    const reordered = next.map((s, i) => ({ ...s, sortOrder: i }));
    await reorderSiblings(reordered);

    setTree((prev) => {
      const flat = flatItems(prev).map((f) => {
        const r = reordered.find((x) => x.id === f.id);
        return r ? { ...f, sortOrder: r.sortOrder } : f;
      });
      return buildTree(flat);
    });
  }

  function onSaved(savedItem) {
    setEditingId(null);
    setTree((prev) => insertIntoTree(prev, savedItem));
  }

  async function onDeleted(id, hasChildren) {
    if (!confirm(hasChildren ? 'Delete this item and all its children?' : 'Delete this item?')) return;
    await fetch(`/api/admin/navbar/${id}`, { method: 'DELETE' });
    setTree((prev) => removeFromTree(prev, id));
    setEditingId(null);
  }

  return (
    <div>
      <div className="card border-0 shadow-sm p-3 mb-3">
        {tree.length === 0 && <p className="text-muted small mb-3">No navbar items yet. Add one below.</p>}

        {tree.map((item, i) => (
          <NavItemRow
            key={item.id}
            item={item}
            siblings={tree}
            index={i}
            depth={0}
            activeLocales={activeLocales}
            defaultLocale={defaultLocale}
            pageOptions={pageOptions}
            parentOptions={parentOptions}
            editingId={editingId}
            setEditingId={setEditingId}
            onSaved={onSaved}
            onDeleted={onDeleted}
            onMove={onMove}
          />
        ))}

        {editingId === 'new-top' ? (
          <div className="mt-2">
            <NavbarItemForm
              initial={{ sortOrder: tree.length }}
              activeLocales={activeLocales}
              defaultLocale={defaultLocale}
              pageOptions={pageOptions}
              parentOptions={parentOptions}
              onSave={onSaved}
              onCancel={() => setEditingId(null)}
            />
          </div>
        ) : (
          <button type="button" className="btn btn-sm btn-outline-primary mt-2" onClick={() => setEditingId('new-top')}>
            <i className="bi bi-plus-circle me-1" />Add top-level item
          </button>
        )}
      </div>

      <p className="text-muted small">
        <i className="bi bi-info-circle me-1" />Up to {MAX_DEPTH} levels of nesting. Use the indent <i className="bi bi-indent" /> button to add child items.
      </p>
    </div>
  );
}
