'use client';

import { useLayoutEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Gắn overlay ra <body> — tránh bị header (.tag_header / stacking) làm mất nền. */
export default function AuthPortal({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    setTarget(document.body);
  }, []);
  if (!target) return null;
  return createPortal(children, target);
}
