'use client';

import { useEffect, useRef, useState } from 'react';
import 'quill/dist/quill.snow.css';
import { uploadMediaFile } from '@/lib/client/upload-media';
import {
  listTemplatesAction,
  saveTemplateAction,
  deleteTemplateAction,
  type ContentTemplate,
} from '@/lib/actions/template-actions';

type QuillInstance = import('quill').default;

interface RichTextEditorProps {
  initialValue: string;
  onChange: (html: string) => void;
}

/**
 * Trình soạn thảo hiện đại chuẩn Gmail/Zalo:
 * - Định dạng đầy đủ: cỡ chữ, đậm/nghiêng/gạch, MÀU chữ + TÔ NỀN, danh sách,
 *   căn lề, thụt dòng, trích dẫn, xoá định dạng.
 * - Tạo ĐƯỜNG LINK.
 * - CHÈN ẢNH: chọn nhiều ảnh, KÉO-THẢ, DÁN (Ctrl+V) → Google Drive, giữ nguyên gốc.
 * - ĐÍNH KÈM FILE mọi định dạng → Drive → chèn link tải vào nội dung.
 * - MẪU (template): lưu nội dung đang soạn thành mẫu, chèn lại mẫu bất cứ lúc nào.
 */
export default function RichTextEditor({ initialValue, onChange }: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<QuillInstance | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [status, setStatus] = useState('');
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [selectedTpl, setSelectedTpl] = useState('');
  const [tplBusy, setTplBusy] = useState(false);

  async function reloadTemplates() {
    const res = await listTemplatesAction();
    if (res.success && res.data) setTemplates(res.data);
  }

  function insertOne(url: string, name: string, isImage: boolean) {
    const q = quillRef.current;
    if (!q) return;
    const sel = q.getSelection(true);
    const at = sel ? sel.index : q.getLength();
    if (isImage) {
      q.insertEmbed(at, 'image', url, 'user');
      q.setSelection(at + 1, 0);
    } else {
      const label = `📎 ${name}`;
      q.insertText(at, label, { link: url });
      q.insertText(at + label.length, '\n');
      q.setSelection(at + label.length + 1, 0);
    }
    onChangeRef.current(q.root.innerHTML);
  }

  async function uploadAndInsert(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      setStatus(`Đang tải ${i + 1}/${list.length}: ${f.name}…`);
      try {
        const url = await uploadMediaFile(f);
        insertOne(url, f.name, (f.type || '').startsWith('image/'));
      } catch (e) {
        setStatus(`Lỗi tải "${f.name}": ${e instanceof Error ? e.message : ''}`);
        await new Promise((r) => setTimeout(r, 1800));
      }
    }
    setStatus('');
  }

  async function handleSaveTemplate() {
    const q = quillRef.current;
    if (!q) return;
    const html = q.root.innerHTML;
    if (!html || html === '<p><br></p>') {
      window.alert('Nội dung đang trống — soạn vài dòng rồi hãy lưu mẫu.');
      return;
    }
    const name = window.prompt('Đặt tên cho mẫu (template):', '');
    if (!name || !name.trim()) return;
    setTplBusy(true);
    const res = await saveTemplateAction(name.trim(), html);
    setTplBusy(false);
    if (!res.success) {
      window.alert('Lưu mẫu thất bại: ' + (res.error || ''));
      return;
    }
    await reloadTemplates();
  }

  function handleInsertTemplate() {
    const q = quillRef.current;
    if (!q || !selectedTpl) return;
    const tpl = templates.find((t) => String(t.id) === selectedTpl);
    if (!tpl) return;
    const sel = q.getSelection(true);
    const at = sel ? sel.index : q.getLength();
    // Chèn nội dung mẫu tại vị trí con trỏ
    q.clipboard.dangerouslyPasteHTML(at, tpl.content || '', 'user');
    onChangeRef.current(q.root.innerHTML);
  }

  async function handleDeleteTemplate() {
    if (!selectedTpl) return;
    const tpl = templates.find((t) => String(t.id) === selectedTpl);
    if (!tpl) return;
    if (!window.confirm(`Xoá mẫu "${tpl.name}"?`)) return;
    setTplBusy(true);
    const res = await deleteTemplateAction(tpl.id);
    setTplBusy(false);
    if (!res.success) {
      window.alert('Xoá mẫu thất bại: ' + (res.error || ''));
      return;
    }
    setSelectedTpl('');
    await reloadTemplates();
  }

  useEffect(() => {
    let cancelled = false;

    void reloadTemplates();

    import('quill').then(({ default: Quill }) => {
      if (cancelled || !containerRef.current) return;

      const imageHandler = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = () => {
          if (input.files) void uploadAndInsert(input.files);
        };
        input.click();
      };

      const quill = new Quill(containerRef.current, {
        theme: 'snow',
        placeholder: 'Soạn nội dung — cỡ chữ, in đậm, màu sắc, danh sách, chèn ảnh, đính kèm file…',
        modules: {
          toolbar: {
            container: [
              [{ size: ['small', false, 'large', 'huge'] }],
              ['bold', 'italic', 'underline', 'strike'],
              [{ color: [] }, { background: [] }],
              [{ list: 'ordered' }, { list: 'bullet' }],
              [{ align: [] }],
              [{ indent: '-1' }, { indent: '+1' }],
              ['blockquote'],
              ['link', 'image'],
              ['clean'],
            ],
            handlers: { image: imageHandler },
          },
        },
      });
      quillRef.current = quill;
      if (initialValue) quill.root.innerHTML = initialValue;
      quill.on('text-change', () => onChangeRef.current(quill.root.innerHTML));

      quill.root.addEventListener('drop', (ev: Event) => {
        const e = ev as DragEvent;
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
          e.preventDefault();
          e.stopPropagation();
          void uploadAndInsert(e.dataTransfer.files);
        }
      });

      quill.root.addEventListener('paste', (ev: Event) => {
        const e = ev as ClipboardEvent;
        const items = e.clipboardData ? e.clipboardData.items : null;
        if (!items) return;
        const imgs: File[] = [];
        for (const it of Array.from(items)) {
          if (it.kind === 'file') {
            const f = it.getAsFile();
            if (f) imgs.push(f);
          }
        }
        if (imgs.length) {
          e.preventDefault();
          void uploadAndInsert(imgs);
        }
      });
    });

    return () => {
      cancelled = true;
      quillRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {/* Thanh MẪU (template) */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
          padding: 8,
          borderRadius: 8,
          background: 'rgba(13,110,253,0.08)',
          border: '1px dashed rgba(13,110,253,0.4)',
        }}
      >
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>📄 Mẫu:</span>
        <select
          className="form-select form-select-sm"
          style={{ width: 'auto', minWidth: 180 }}
          value={selectedTpl}
          onChange={(e) => setSelectedTpl(e.target.value)}
        >
          <option value="">— Chọn mẫu để chèn —</option>
          {templates.map((t) => (
            <option key={t.id} value={String(t.id)}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={!selectedTpl || tplBusy}
          onClick={handleInsertTemplate}
        >
          Chèn mẫu
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          disabled={!selectedTpl || tplBusy}
          onClick={handleDeleteTemplate}
        >
          Xoá mẫu
        </button>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className="btn btn-sm btn-success"
          disabled={tplBusy}
          onClick={handleSaveTemplate}
        >
          💾 Lưu nội dung hiện tại thành mẫu
        </button>
      </div>

      {/* Nút đính kèm file mọi định dạng + trạng thái */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          className="btn btn-sm btn-outline-light"
          onClick={() => fileInputRef.current?.click()}
        >
          📎 Đính kèm file (mọi định dạng)
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="*/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) void uploadAndInsert(e.target.files);
            e.target.value = '';
          }}
        />
        {status && (
          <span style={{ fontSize: 13, color: '#0dcaf0' }}>
            <i className="fas fa-spinner fa-spin" /> {status}
          </span>
        )}
      </div>

      <div
        ref={containerRef}
        style={{ background: '#fff', color: '#111', minHeight: 260, borderRadius: 6 }}
      />

      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
        Mẹo: kéo-thả ảnh/file vào ô soạn thảo, hoặc dán ảnh (Ctrl+V). Chọn nhiều ảnh/file cùng lúc —
        máy tính &amp; điện thoại đều được. Ảnh &amp; tài liệu giữ nguyên gốc, không nén, lưu trên Google Drive.
      </p>
    </div>
  );
}
