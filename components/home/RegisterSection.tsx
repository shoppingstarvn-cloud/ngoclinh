'use client';

import { FormEvent, useMemo, useState } from 'react';
import { assetUrl } from '@/lib/slug';
import MediaAsset from '@/components/ui/MediaAsset';
import {
  resolveRegisterContent,
  type RegisterBlock,
} from '@/lib/data/register-defaults';
import type { Service } from '@/components/home/HomeSections';

function digitsPhone(value: string) {
  return value.replace(/[^\d+]/g, '');
}

function SideCard({ block }: { block: RegisterBlock }) {
  const key = block.block_key;
  const title = (block.title || '').trim();
  const body = (block.body || '').trim();
  const image = (block.image_url || '').trim();
  const link = (block.link_url || '').trim();
  const phone = (block.phone || '').trim();
  const zalo = (block.zalo || '').trim();

  if (key === 'community') {
    const inner = (
      <div className="register-community">
        <i className="fa fa-users" aria-hidden />
        <span>{title}</span>
      </div>
    );
    if (link) {
      return (
        <a className="register-side-card is-link" href={link} target="_blank" rel="noopener noreferrer">
          {inner}
        </a>
      );
    }
    return <div className="register-side-card">{inner}</div>;
  }

  if (key === 'qr') {
    const src = image ? assetUrl(image) : '/images/register/he-sinh-thai-ai-qr.jpg';
    const qr = (
      <>
        {title ? <p className="register-qr-title">{title}</p> : null}
        <div className="register-qr-frame">
          <img src={src} alt={title || 'Mã QR Hệ Sinh Thái AI'} />
        </div>
      </>
    );
    if (link) {
      return (
        <a className="register-side-card is-link" href={link} target="_blank" rel="noopener noreferrer">
          {qr}
        </a>
      );
    }
    return <div className="register-side-card">{qr}</div>;
  }

  if (key === 'contact') {
    const tel = digitsPhone(phone);
    const zaloNum = digitsPhone(zalo || phone);
    return (
      <div className="register-side-card">
        {title ? <p className="register-contact-title">{title}</p> : null}
        {phone ? (
          <p className="register-contact-line">
            <i className="fa fa-phone" aria-hidden />
            {tel ? (
              <a href={`tel:${tel}`}>Mr Linh: {phone}</a>
            ) : (
              <span>Mr Linh: {phone}</span>
            )}
          </p>
        ) : null}
        {zaloNum || zalo ? (
          <p className="register-contact-line">
            <i className="fa fa-comment" aria-hidden />
            <a href={`https://zalo.me/${zaloNum || phone}`} target="_blank" rel="noopener noreferrer">
              Zalo: {zalo || phone}
            </a>
          </p>
        ) : null}
      </div>
    );
  }

  if (key === 'commitment') {
    const items = body
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    return (
      <div className="register-side-card">
        {title ? <p className="register-commit-title">{title}</p> : null}
        <ul className="register-commit-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="register-side-card">
      {title ? <p className="register-extra-title">{title}</p> : null}
      {image ? (
        <div className="register-qr-frame" style={{ marginBottom: 10 }}>
          <MediaAsset src={image} alt={title} />
        </div>
      ) : null}
      {body ? <p className="register-extra-body">{body}</p> : null}
      {link ? (
        <p className="register-contact-line">
          <a href={link} target="_blank" rel="noopener noreferrer">
            Mở liên kết
          </a>
        </p>
      ) : null}
    </div>
  );
}

export function RegisterFormSection({
  blocks,
  services,
  selectedService,
  selectedServiceId,
  onServiceChange,
}: {
  blocks: RegisterBlock[];
  services: Service[];
  selectedService: string;
  selectedServiceId?: number;
  onServiceChange: (title: string, id?: number) => void;
}) {
  const { form, sidebar } = useMemo(() => resolveRegisterContent(blocks), [blocks]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [occupation, setOccupation] = useState('');
  const [needs, setNeeds] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [message, setMessage] = useState('');

  function handleServiceInput(value: string) {
    const match = services.find(
      (s) => (s.title_top || '').trim().toLowerCase() === value.trim().toLowerCase(),
    );
    onServiceChange(value, match?.id);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setStatus('idle');
    setMessage('');
    try {
      const resp = await fetch('/api/public/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          email,
          occupation,
          service: selectedService,
          service_id: selectedServiceId,
          needs,
          company_website: '',
        }),
      });
      const result = (await resp.json()) as { success?: boolean; error?: string };
      if (!resp.ok || !result.success) {
        setStatus('err');
        setMessage(result.error || 'Gửi đăng ký chưa thành công.');
        return;
      }
      setStatus('ok');
      setMessage('Đăng ký thành công! Em đã nhận thông tin, anh Linh sẽ liên hệ sớm.');
      setFullName('');
      setPhone('');
      setEmail('');
      setOccupation('');
      setNeeds('');
      onServiceChange('', undefined);
    } catch {
      setStatus('err');
      setMessage('Không gửi được. Anh kiểm tra mạng rồi thử lại giúp em.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="register-home" id="form-dang-ky">
      <div className="container">
        <div className="row">
          <div className="col-lg-8">
            <div className="register-card">
              <h2 className="register-form-title">{form.title || 'Form đăng ký'}</h2>
              <form onSubmit={onSubmit} noValidate>
                <div className="register-hp" aria-hidden>
                  <label>
                    Website
                    <input type="text" name="company_website" tabIndex={-1} autoComplete="off" />
                  </label>
                </div>
                <div className="register-field">
                  <label htmlFor="reg-fullname">
                    Họ tên <span className="req">*</span>
                  </label>
                  <input
                    id="reg-fullname"
                    name="full_name"
                    required
                    placeholder="Nhập họ tên"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="register-field">
                  <label htmlFor="reg-phone">
                    Số điện thoại <span className="req">*</span>
                  </label>
                  <input
                    id="reg-phone"
                    name="phone"
                    required
                    inputMode="tel"
                    placeholder="Nhập số điện thoại"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="register-field">
                  <label htmlFor="reg-email">
                    Email <span className="req">*</span>
                  </label>
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    required
                    placeholder="Nhập email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="register-field">
                  <label htmlFor="reg-occupation">
                    Ngành nghề công tác <span className="req">*</span>
                  </label>
                  <input
                    id="reg-occupation"
                    name="occupation"
                    required
                    placeholder="Nhập ngành nghề"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                  />
                </div>
                <div className="register-field">
                  <label htmlFor="reg-service">
                    Muốn đăng ký <span className="req">*</span>
                  </label>
                  <input
                    id="reg-service"
                    name="service"
                    required
                    placeholder="Chọn dịch vụ (bấm vào các ô dịch vụ bên trên)"
                    value={selectedService}
                    onChange={(e) => handleServiceInput(e.target.value)}
                  />
                </div>
                <div className="register-field">
                  <label htmlFor="reg-needs">Mô tả nhu cầu cụ thể</label>
                  <textarea
                    id="reg-needs"
                    name="needs"
                    placeholder="Mô tả nhu cầu của bạn..."
                    value={needs}
                    onChange={(e) => setNeeds(e.target.value)}
                  />
                </div>
                <button className="register-submit" type="submit" disabled={sending}>
                  {sending ? 'Đang gửi...' : form.subtitle || 'Đăng Ký Ngay'}
                </button>
                {status !== 'idle' && message ? (
                  <p className={`register-msg ${status === 'ok' ? 'ok' : 'err'}`}>{message}</p>
                ) : null}
              </form>
            </div>
          </div>
          <div className="col-lg-4">
            <div className="register-side">
              {sidebar.map((block) => (
                <SideCard key={block.block_key + String(block.id ?? '')} block={block} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
