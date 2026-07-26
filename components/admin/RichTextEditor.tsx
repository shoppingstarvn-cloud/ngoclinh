'use client';

import { useEffect, useRef } from 'react';
import 'quill/dist/quill.snow.css';

interface RichTextEditorProps {
  initialValue: string;
  onChange: (html: string) => void;
}

/**
 * Quill chỉ hoạt động trên trình duyệt (thao tác DOM trực tiếp) nên phải
 * import động trong useEffect, không thể SSR.
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
      quill = new Quill(containerRef.current, {
        theme: 'snow',
        modules: {
          toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ header: [1, 2, 3, false] }],
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ align: [] }],
            ['link', 'image'],
            ['clean'],
          ],
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
