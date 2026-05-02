'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { Extension } from '@tiptap/core';
import styles from './RichTextEditor.module.css';

// ── Font Size extension (built on TextStyle) ───────────────────────────────
const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [{
      types: ['textStyle'],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el) => el.style.fontSize || null,
          renderHTML: (attrs) => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: (size) => ({ chain }) =>
        chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }) =>
        chain().setMark('textStyle', { fontSize: null }).run(),
    };
  },
});

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px'];
const COLORS = ['#000000', '#374151', '#6b7280', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function RichTextEditor({ value, onChange, placeholder = '' }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Image.configure({ HTMLAttributes: { class: 'img-fluid' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      FontSize,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: styles.editorContent,
      },
    },
  });

  if (!editor) return null;

  // ── Toolbar helpers ──────────────────────────────────────────────────────
  function btn(active, onClick, title, icon) {
    return (
      <button
        key={title}
        type="button"
        title={title}
        onClick={onClick}
        className={`${styles.toolBtn} ${active ? styles.toolBtnActive : ''}`}
      >
        <i className={`bi bi-${icon}`} />
      </button>
    );
  }

  function setLink() {
    const prev = editor.getAttributes('link').href;
    const url  = window.prompt('URL', prev || 'https://');
    if (url === null) return;
    if (url === '') { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url }).run();
  }

  async function insertImage() {
    const input = document.createElement('input');
    input.type  = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('file', file);
      const res  = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.success) {
        editor.chain().focus().setImage({ src: `/uploads/${json.data.filename}` }).run();
      }
    };
    input.click();
  }

  function toggleFullscreen() {
    const el = document.getElementById('rte-wrapper');
    if (!el) return;
    el.classList.toggle(styles.fullscreen);
  }

  return (
    <div id="rte-wrapper" className={styles.wrapper}>
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className={styles.toolbar}>
        {/* Text style */}
        {btn(editor.isActive('bold'),      () => editor.chain().focus().toggleBold().run(),      'Bold',          'type-bold')}
        {btn(editor.isActive('italic'),    () => editor.chain().focus().toggleItalic().run(),    'Italic',        'type-italic')}
        {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), 'Underline',     'type-underline')}
        {btn(editor.isActive('strike'),    () => editor.chain().focus().toggleStrike().run(),    'Strikethrough', 'type-strikethrough')}

        <span className={styles.sep} />

        {/* Headings */}
        {[1, 2, 3, 4].map((level) =>
          btn(
            editor.isActive('heading', { level }),
            () => editor.chain().focus().toggleHeading({ level }).run(),
            `Heading ${level}`,
            `type-h${level}`
          )
        )}

        <span className={styles.sep} />

        {/* Lists */}
        {btn(editor.isActive('bulletList'),  () => editor.chain().focus().toggleBulletList().run(),  'Bullet List',   'list-ul')}
        {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), 'Ordered List',  'list-ol')}
        {btn(editor.isActive('blockquote'),  () => editor.chain().focus().toggleBlockquote().run(),  'Blockquote',    'quote')}
        {btn(false, () => editor.chain().focus().setHorizontalRule().run(), 'Horizontal Rule', 'hr')}

        <span className={styles.sep} />

        {/* Alignment */}
        {['left', 'center', 'right', 'justify'].map((align) =>
          btn(
            editor.isActive({ textAlign: align }),
            () => editor.chain().focus().setTextAlign(align).run(),
            `Align ${align}`,
            `text-${align}`
          )
        )}

        <span className={styles.sep} />

        {/* Link & Image */}
        {btn(editor.isActive('link'), setLink, 'Link', 'link-45deg')}
        <button type="button" title="Insert Image" className={styles.toolBtn} onClick={insertImage}>
          <i className="bi bi-image" />
        </button>

        <span className={styles.sep} />

        {/* Table */}
        <button
          type="button"
          title="Insert Table"
          className={styles.toolBtn}
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        >
          <i className="bi bi-table" />
        </button>
        {editor.isActive('table') && (
          <>
            <button type="button" title="Add column" className={styles.toolBtn} onClick={() => editor.chain().focus().addColumnAfter().run()}><i className="bi bi-layout-split" /></button>
            <button type="button" title="Add row"    className={styles.toolBtn} onClick={() => editor.chain().focus().addRowAfter().run()}><i className="bi bi-layout-three-rows" /></button>
            <button type="button" title="Del column" className={styles.toolBtn} onClick={() => editor.chain().focus().deleteColumn().run()}><i className="bi bi-dash-square" /></button>
            <button type="button" title="Del row"    className={styles.toolBtn} onClick={() => editor.chain().focus().deleteRow().run()}><i className="bi bi-dash-circle" /></button>
            <button type="button" title="Del table"  className={styles.toolBtn} onClick={() => editor.chain().focus().deleteTable().run()}><i className="bi bi-trash" /></button>
          </>
        )}

        <span className={styles.sep} />

        {/* Font size */}
        <select
          className={styles.toolSelect}
          title="Font Size"
          value={editor.getAttributes('textStyle').fontSize ?? ''}
          onChange={(e) => {
            if (e.target.value) editor.chain().focus().setFontSize(e.target.value).run();
            else editor.chain().focus().unsetFontSize().run();
          }}
        >
          <option value="">Size</option>
          {FONT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Text colour */}
        <div className={styles.colorPicker} title="Text Color">
          <input
            type="color"
            className={styles.colorInput}
            value={editor.getAttributes('textStyle').color ?? '#000000'}
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          />
        </div>

        <span className={styles.sep} />

        {/* Undo / Redo */}
        {btn(false, () => editor.chain().focus().undo().run(), 'Undo', 'arrow-counterclockwise')}
        {btn(false, () => editor.chain().focus().redo().run(), 'Redo', 'arrow-clockwise')}

        {/* Fullscreen */}
        <button type="button" title="Fullscreen" className={`${styles.toolBtn} ms-auto`} onClick={toggleFullscreen}>
          <i className="bi bi-fullscreen" />
        </button>
      </div>

      {/* ── Editor area ─────────────────────────────────────────────────── */}
      <EditorContent editor={editor} />
    </div>
  );
}
