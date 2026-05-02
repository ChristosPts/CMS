'use client';

import { useState } from 'react';

const FIELD_TYPES = [
  { value: 'TEXT',     label: 'Text'     },
  { value: 'EMAIL',    label: 'Email'    },
  { value: 'PHONE',    label: 'Phone'    },
  { value: 'TEXTAREA', label: 'Textarea' },
  { value: 'SELECT',   label: 'Dropdown' },
  { value: 'CHECKBOX', label: 'Checkbox' },
];

function newField(sortOrder, locales) {
  const labelJson = {};
  locales.forEach((l) => { labelJson[l] = ''; });
  return { id: null, type: 'TEXT', labelJson, required: false, sortOrder, options: null, width: 'full' };
}

function OptionEditor({ options = [], onChange }) {
  const list = options ?? [];

  function addOption() {
    onChange([...list, { value: '', label: '' }]);
  }

  function removeOption(i) {
    onChange(list.filter((_, idx) => idx !== i));
  }

  function update(i, field, val) {
    const next = list.map((o, idx) => idx === i ? { ...o, [field]: val } : o);
    onChange(next);
  }

  return (
    <div className="mt-2">
      <div className="form-label small mb-1">Options</div>
      {list.map((opt, i) => (
        <div key={i} className="d-flex gap-2 mb-1">
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Value (stored)"
            value={opt.value}
            onChange={(e) => update(i, 'value', e.target.value)}
          />
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Label (shown)"
            value={opt.label}
            onChange={(e) => update(i, 'label', e.target.value)}
          />
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeOption(i)}>
            <i className="bi bi-x" />
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-sm btn-outline-secondary mt-1" onClick={addOption}>
        <i className="bi bi-plus me-1" />Add option
      </button>
    </div>
  );
}

function FieldRow({ field, index, total, activeLocales, defaultLocale, onChange, onRemove, onMove }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded mb-2 bg-white">
      {/* Header row */}
      <div className="d-flex align-items-center gap-2 px-3 py-2">
        <div className="d-flex flex-column gap-0">
          <button type="button" className="btn btn-sm btn-link p-0 lh-1 text-muted" disabled={index === 0} onClick={() => onMove(index, -1)}><i className="bi bi-chevron-up" /></button>
          <button type="button" className="btn btn-sm btn-link p-0 lh-1 text-muted" disabled={index === total - 1} onClick={() => onMove(index, 1)}><i className="bi bi-chevron-down" /></button>
        </div>

        <span className="badge bg-secondary fw-normal me-1">{FIELD_TYPES.find((t) => t.value === field.type)?.label}</span>

        <span className="flex-grow-1 small text-truncate">
          {field.labelJson[defaultLocale] || <em className="text-muted">Untitled field</em>}
          {field.required && <span className="text-danger ms-1">*</span>}
        </span>

        <button type="button" className="btn btn-sm btn-link text-muted p-1" onClick={() => setExpanded((e) => !e)}>
          <i className={`bi bi-chevron-${expanded ? 'up' : 'down'}`} />
        </button>
        <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRemove}>
          <i className="bi bi-trash" />
        </button>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-top px-3 py-3">
          <div className="row g-3 mb-3">
            <div className="col-6">
              <label className="form-label small">Field Type</label>
              <select
                className="form-select form-select-sm"
                value={field.type}
                onChange={(e) => onChange({ ...field, type: e.target.value, options: e.target.value === 'SELECT' ? (field.options ?? []) : null })}
              >
                {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="col-6">
              <label className="form-label small">Width</label>
              <select
                className="form-select form-select-sm"
                value={field.width}
                onChange={(e) => onChange({ ...field, width: e.target.value })}
              >
                <option value="full">Full width</option>
                <option value="half">Half width</option>
              </select>
            </div>
          </div>

          {/* Labels per locale */}
          {activeLocales.map((loc) => (
            <div key={loc} className="mb-2">
              <label className="form-label small">
                Label <span className="badge bg-light text-dark border fw-normal">{loc.toUpperCase()}</span>
                {loc === defaultLocale && <span className="text-danger ms-1">*</span>}
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={field.labelJson[loc] ?? ''}
                onChange={(e) => onChange({ ...field, labelJson: { ...field.labelJson, [loc]: e.target.value } })}
              />
            </div>
          ))}

          <div className="form-check mt-2">
            <input
              type="checkbox"
              className="form-check-input"
              id={`required-${index}`}
              checked={field.required}
              onChange={(e) => onChange({ ...field, required: e.target.checked })}
            />
            <label className="form-check-label small" htmlFor={`required-${index}`}>Required</label>
          </div>

          {field.type === 'SELECT' && (
            <OptionEditor
              options={field.options}
              onChange={(opts) => onChange({ ...field, options: opts })}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function FormFieldBuilder({ activeLocales, defaultLocale, value, onChange }) {
  function addField() {
    onChange([...value, newField(value.length, activeLocales)]);
  }

  function updateField(index, updated) {
    onChange(value.map((f, i) => i === index ? { ...updated, sortOrder: i } : f));
  }

  function removeField(index) {
    onChange(value.filter((_, i) => i !== index).map((f, i) => ({ ...f, sortOrder: i })));
  }

  function moveField(index, dir) {
    const next = [...value];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((f, i) => ({ ...f, sortOrder: i })));
  }

  return (
    <div>
      {value.length === 0 && (
        <p className="text-muted small mb-3">No fields yet. Add one below to build the contact form.</p>
      )}

      {value.map((field, i) => (
        <FieldRow
          key={i}
          field={field}
          index={i}
          total={value.length}
          activeLocales={activeLocales}
          defaultLocale={defaultLocale}
          onChange={(updated) => updateField(i, updated)}
          onRemove={() => removeField(i)}
          onMove={(idx, dir) => moveField(idx, dir)}
        />
      ))}

      <button type="button" className="btn btn-sm btn-outline-primary mt-1" onClick={addField}>
        <i className="bi bi-plus-circle me-1" />Add Field
      </button>
    </div>
  );
}
