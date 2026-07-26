'use client';

import { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSave?: () => void;
  saveLabel?: string;
  size?: 'default' | 'lg';
  children: ReactNode;
}

export default function Modal({ open, title, onClose, onSave, saveLabel = 'Lưu', size = 'lg', children }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="modal-custom"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        overflowY: 'auto',
        padding: '30px 15px',
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content" style={{ width: '100%', maxWidth: size === 'lg' ? 720 : 480 }}>
        <div className="modal-header d-flex justify-content-between align-items-center" style={{ padding: '16px 20px' }}>
          <h5 className="modal-title m-0">{title}</h5>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Đóng" />
        </div>
        <div className="modal-body" style={{ padding: 20, maxHeight: '70vh', overflowY: 'auto' }}>
          {children}
        </div>
        <div className="modal-footer" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Hủy
          </button>
          {onSave && (
            <button className="btn btn-primary" onClick={onSave}>
              {saveLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
