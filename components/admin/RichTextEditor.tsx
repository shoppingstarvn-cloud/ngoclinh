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

/** Chuyển data URL (base64) → File để tải lên Drive. */
function dataUrlToFile(dataUrl: string, baseName: string): File | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!m) return null;
  const mime = m[1];
  const bstr = atob(m[2]);
  let n = bstr.length;
  const u8 = new Uint8Array(n);
  while (n--) u8[n] = bstr.charCodeAt(n);
  const ext = (mime.split('/')[1] || 'png').replace('jpeg', 'jpg').replace('svg+xml', 'svg');
  return new File([u8], `${baseName}.${ext}`, { type: mime });
}

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
  const selectedImgIndexRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [status, setStatus] = useState('');
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [selectedTpl, setSelectedTpl] = useState('');
  const [tplBusy, setTplBusy] = useState(false);
  const [imgSelected, setImgSelected] = useState(false);

  function doUndo() {
    const h = quillRef.current?.getModule('history') as { undo?: () => void } | undefined;
    h?.undo?.();
  }
  function doRedo() {
    const h = quillRef.current?.getModule('history') as { redo?: () => void } | undefined;
    h?.redo?.();
  }
  function deleteSelectedImage() {
    const q = quillRef.current;
    if (!q) return;
    const idx = selectedImgIndexRef.current;
    if (idx != null && idx >= 0) {
      const contents = q.getContents(idx, 1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const op: any = contents && (contents as any).ops && (contents as any).ops[0];
      const isImage = op && op.insert && typeof op.insert === 'object' && 'image' in op.insert;
      if (isImage) {
        q.deleteText(idx, 1, 'user');
        selectedImgIndexRef.current = null;
        setImgSelected(false);
        onChangeRef.current(q.root.innerHTML);
        return;
      }
    }
    window.alert('Bấm chọn ảnh cần xoá trong bài trước (rê chuột vào ảnh sẽ thấy viền), rồi bấm "Xoá ảnh".');
  }

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

  // Tìm mọi ảnh base64 (data:) trong nội dung → tải lên Drive → thay bằng URL nhẹ.
  // Ngăn lỗi 413 "Content Too Large" của Vercel (request Server Action > 4.5MB).
  async function convertBase64Images() {
    const q = quillRef.current;
    if (!q) return;
    const imgs = Array.from(q.root.querySelectorAll('img')).filter((img) =>
      (img.getAttribute('src') || '').startsWith('data:'),
    );
    if (!imgs.length) return;
    setStatus(`Đang chuyển ${imgs.length} ảnh dán tay lên Drive (giảm dung lượng)…`);
    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i];
      const src = img.getAttribute('src') || '';
      const file = dataUrlToFile(src, `anh-dan-${Date.now()}-${i}`);
      if (!file) continue;
      try {
        const url = await uploadMediaFile(file);
        img.setAttribute('src', url);
      } catch {
        /* lỗi thì giữ nguyên ảnh đó */
      }
    }
    setStatus('');
    onChangeRef.current(q.root.innerHTML);
  }

  // Sửa link cũ bị TRẦN (vd href="shopmartai.com") → thêm https:// để không 404.
  function fixBareLinks() {
    const q = quillRef.current;
    if (!q) return;
    let changed = false;
    Array.from(q.root.querySelectorAll('a')).forEach((a) => {
      const href = a.getAttribute('href') || '';
      if (href && !/^(https?:|mailto:|tel:|\/|#)/i.test(href)) {
        a.setAttribute('href', 'https://' + href.replace(/^\/+/, ''));
        changed = true;
      }
    });
    if (changed) onChangeRef.current(q.root.innerHTML);
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

      // Chuẩn hoá LINK: gõ tên miền trần (vd "shopmartai.com") tự thêm https:// —
      // tránh bị hiểu là đường dẫn tương đối rồi thành .../shopmartai.com (404).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Link = Quill.import('formats/link') as any;
      const normalizeUrl = (val: string) => {
        const u = String(val || '').trim();
        if (u && !/^(https?:|mailto:|tel:|\/|#)/i.test(u)) return 'https://' + u.replace(/^\/+/, '');
        return u;
      };
      class CustomLink extends Link {
        static sanitize(url: string) {
          return normalizeUrl(url);
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Quill as any).register(CustomLink, true);

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
          history: { delay: 800, maxStack: 300, userOnly: false },
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
      // Bài cũ: chuyển ảnh base64 → Drive + sửa link trần (shopmartai.com → https://…).
      setTimeout(() => {
        void convertBase64Images();
        fixBareLinks();
      }, 400);
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
        } else {
          // Dán HTML có ảnh base64 (copy từ web/Word): Quill chèn base64 →
          // chuyển sang Drive ngay sau khi Quill xử lý xong.
          setTimeout(() => {
            void convertBase64Images();
          }, 500);
        }
      });

      // Bấm vào ẢNH trong bài → chọn ảnh (viền xanh) để có thể bấm "Xoá ảnh" hoặc
      // nhấn phím Delete/Backspace. Bấm ra ngoài ảnh → bỏ chọn.
      quill.root.addEventListener('click', (ev: Event) => {
        const target = ev.target as HTMLElement | null;
        if (target && target.tagName === 'IMG') {
          try {
            const blot = (Quill as unknown as { find: (n: Node) => unknown }).find(target);
            if (blot) {
              const index = quill.getIndex(blot as never);
              selectedImgIndexRef.current = index; // nhớ vị trí ảnh để xoá đúng
              quill.setSelection(index, 1, 'user'); // chọn ảnh (Quill tô sáng vùng chọn)
            }
          } catch {
            selectedImgIndexRef.current = null;
          }
          setImgSelected(true);
        } else {
          selectedImgIndexRef.current = null;
          setImgSelected(false);
        }
      });
    });

    return () => {
      cancelled = true;
      quillRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nạp nội dung khi initialValue tới MUỘN (formData cập nhật sau khi mở bài) —
  // chỉ nạp khi editor đang TRỐNG, để không đè lên chữ đang gõ. Chống lỗi "bài trắng".
  useEffect(() => {
    const q = quillRef.current;
    if (!q) return;
    const cur = q.root.innerHTML;
    const isEmpty = !cur || cur === '<p><br></p>' || cur.trim() === '';
    if (isEmpty && initialValue && initialValue !== cur) {
      q.root.innerHTML = initialValue;
      setTimeout(() => {
        void convertBase64Images();
        fixBareLinks();
      }, 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue]);

  return (
    <div>
      {/* Ô nhập link (tooltip Quill) căn ra GIỮA, không bị che, đủ rộng để nhìn chữ. */}
      <style>{`
        .ql-snow .ql-tooltip {
          left: 50% !important;
          transform: translate(-50%, 8px) !important;
          z-index: 30;
          white-space: nowrap;
          max-width: 92%;
        }
        .ql-snow .ql-tooltip input[type=text] { width: 280px; max-width: 60vw; }
        .ql-editor img { cursor: pointer; max-width: 100%; }
        .ql-editor img:hover { outline: 2px dashed rgba(13,110,253,0.85); outline-offset: 2px; }
      `}</style>
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

      {/* Hoàn tác / Làm lại / Xoá ảnh + đính kèm file + trạng thái */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" className="btn btn-sm btn-outline-secondary" title="Hoàn tác (Ctrl+Z)" onClick={doUndo}>
          ↶ Hoàn tác
        </button>
        <button type="button" className="btn btn-sm btn-outline-secondary" title="Làm lại (Ctrl+Y)" onClick={doRedo}>
          ↷ Làm lại
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          title="Bấm chọn ảnh trong bài (ảnh có viền xanh) rồi bấm đây để xoá"
          onClick={deleteSelectedImage}
          disabled={!imgSelected}
        >
          🗑 Xoá ảnh{imgSelected ? ' đang chọn' : ''}
        </button>
        <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.15)' }} />
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
        <button
          type="button"
          className="btn btn-sm btn-outline-warning"
          onClick={() => void convertBase64Images()}
          title="Chuyển mọi ảnh dán tay (base64) trong nội dung lên Google Drive để nội dung nhẹ, lưu được"
        >
          🧹 Nén ảnh dán tay → Drive
        </button>
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
