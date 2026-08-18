'use client';

import { useEffect, useRef } from 'react';
import 'quill/dist/quill.snow.css';
import { uploadMediaFile } from '@/lib/client/upload-media';

interface RichTextEditorProps {
  initialValue: string;
  onChange: (html: string) => void;
}

/**
 * Quill chỉ hoạt động trên trình duyệt (thao tác DOM trực tiếp) nên phải
 * import động trong useEffect, không thể SSR.
 *
 * Nút "chèn ảnh" dùng handler tùy chỉnh: tải THẲNG lên Google Drive rồi chèn
 * URL — KHÔNG nhét ảnh base64 khổng lồ vào nội dung. (Base64 làm nội dung
 * vượt 1MB → Server Action từ chối lưu, ra lỗi "An unexpected response...".)
 */
export default function RichTextEditor({ initialValue, onChange }: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let quill: import('quill').default | null = null;
    let cancelled = false;

    import('quill').then(({ default: Quill }) => {
      if (cancelled || !containerRef.current) return;

      const imageHandler = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*';
        input.onchange = async () => {
          const file = input.files && input.files[0];
          if (!file || !quill) return;
          const sel = quill.getSelection(true);
          const at = sel ? sel.index : quill.getLength();
          const PH = '[Dang tai anh len Drive...] ';
          quill.insertText(at, PH, { italic: true });
          try {
            const url = await uploadMediaFile(file);
            quill.deleteText(at, PH.length);
            quill.insertEmbed(at, 'image', url, 'user');
            quill.setSelection(at + 1, 0);
            onChangeRef.current(quill.root.innerHTML);
          } catch (e) {
            quill.deleteText(at, PH.length);
            const msg = e instanceof Error ? e.message : 'Loi tai anh';
            quill.insertText(at, `[${msg}] `);
            onChangeRef.current(quill.root.innerHTML);
          }
        };
        input.click();
      };

      quill = new Quill(containerRef.current, {
        theme: 'snow',
        modules: {
          toolbar: {
            container: [
              ['bold', 'italic', 'underline', 'strike'],
              [{ header: [1, 2, 3, false] }],
              [{ list: 'ordered' }, { list: 'bullet' }],
              [{ align: [] }],
              ['link', 'image'],
              ['clean'],
            ],
            handlers: { image: imageHandler },
          },
        },
      });
      if (initialValue) quill.root.innerHTML = initialValue;
      quill.on('text-change', () => {
        onChangeRef.current(quill!.root.innerHTML);
      });
    });

    return () => {
      cancelled = true;
      quill = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ background: '#fff', color: '#111', minHeight: 220, borderRadius: 6 }}
    />
  );
}
