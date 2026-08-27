/** Chuẩn hóa + kiểm tra form Đăng ký thông tin / Đề nghị mở Website. Dùng chung client + API. */

export type ProfileForm = {
  username: string;
  password: string;
  full_name: string;
  dob: string;
  zalo_phone: string;
  email: string;
  user_kind: string;
  unit_name: string;
  ward: string;
  class_in_charge: string;
};

export type ProfileField = keyof ProfileForm;

export const EMPTY_PROFILE_FORM: ProfileForm = {
  username: '',
  password: '',
  full_name: '',
  dob: '',
  zalo_phone: '',
  email: '',
  user_kind: 'teacher',
  unit_name: '',
  ward: '',
  class_in_charge: '',
};

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const EMAIL_TYPO: Record<string, string> = {
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'yahoo.co': 'yahoo.com',
  'hotmail.co': 'hotmail.com',
  'outlook.co': 'outlook.com',
};

export function collapseSpaces(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeZaloPhone(raw: string) {
  let s = String(raw || '').replace(/[\s.\-()]/g, '');
  if (s.startsWith('+84')) s = `0${s.slice(3)}`;
  else if (s.startsWith('84') && s.length >= 11) s = `0${s.slice(2)}`;
  return s;
}

function yearsOld(y: number, m: number, d: number) {
  const today = new Date();
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age -= 1;
  return age;
}

export function validateUsername(value: string) {
  const s = value.trim();
  if (!s) return 'Anh nhập tên đăng nhập.';
  if (s.length < 3) return 'Tên đăng nhập từ 3 ký tự trở lên.';
  if (s.length > 32) return 'Tên đăng nhập tối đa 32 ký tự.';
  if (!/^[a-zA-Z][a-zA-Z0-9._]{2,31}$/.test(s)) {
    return 'Tên đăng nhập bắt đầu bằng chữ, chỉ gồm chữ, số, dấu chấm hoặc gạch dưới.';
  }
  return null;
}

export function validatePassword(value: string) {
  if (!value) return 'Anh nhập mật khẩu.';
  if (value.length < 6) return 'Mật khẩu phải từ 6 ký tự.';
  return null;
}

export function validateFullName(value: string) {
  const s = collapseSpaces(value);
  if (!s) return 'Anh nhập họ và tên.';
  if (s.length < 4) return 'Họ và tên quá ngắn (tối thiểu 4 ký tự).';
  if (!/^[\p{L}]+(?:[\s'-][\p{L}]+)+$/u.test(s)) {
    return 'Họ và tên phải có họ + tên, chỉ gồm chữ (vd: Nguyễn Văn A).';
  }
  return null;
}

export function validateDob(value: string) {
  const raw = String(value || '').slice(0, 10);
  if (!raw) return 'Anh chọn ngày tháng năm sinh.';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return 'Ngày sinh chưa đúng định dạng.';
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    return 'Ngày sinh không hợp lệ.';
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dt > today) return 'Ngày sinh không được ở tương lai.';
  const age = yearsOld(y, mo, d);
  if (age < 5) return 'Ngày sinh chưa hợp lệ (tuổi quá nhỏ).';
  if (age > 90) return 'Ngày sinh chưa hợp lệ (tuổi quá lớn).';
  return null;
}

export function validateZaloPhone(value: string) {
  if (!String(value || '').trim()) return 'Anh nhập số điện thoại Zalo.';
  const n = normalizeZaloPhone(value);
  if (!/^0[35789]\d{8}$/.test(n)) {
    return 'Số Zalo phải là 10 số Việt Nam, bắt đầu 03/05/07/08/09 (vd: 0912345678).';
  }
  return null;
}

export function validateEmail(value: string) {
  const s = String(value || '').trim().toLowerCase();
  if (!s) return 'Anh nhập email.';
  if (/\s/.test(String(value || '').trim())) return 'Email không được chứa khoảng trắng.';
  if (s.includes('..') || !EMAIL_RE.test(s)) {
    return 'Email chưa đúng quy cách (vd: ten@gmail.com).';
  }
  const domain = s.split('@')[1] || '';
  const hint = EMAIL_TYPO[domain];
  if (hint) return `Email có vẻ thiếu, anh kiểm tra lại (vd: ...@${hint}).`;
  return null;
}

export function validateUserKind(value: string) {
  if (value !== 'teacher' && value !== 'student') return 'Anh chọn Giáo viên hoặc Học sinh.';
  return null;
}

export function validateUnitName(value: string) {
  const s = collapseSpaces(value);
  if (!s) return 'Anh nhập đơn vị công tác / học tập.';
  if (s.length < 3) return 'Đơn vị công tác / học tập tối thiểu 3 ký tự.';
  return null;
}

export function validateWard(value: string) {
  const s = collapseSpaces(value);
  if (!s) return 'Anh nhập phường / xã.';
  if (s.length < 2) return 'Phường / xã tối thiểu 2 ký tự.';
  return null;
}

export function validateClassInCharge(value: string) {
  const s = collapseSpaces(value);
  if (!s) return 'Anh nhập lớp phụ trách.';
  if (s.length < 2) return 'Lớp phụ trách chưa đúng (vd: 1A5, 12A1).';
  if (!/^[\p{L}\p{N}][\p{L}\p{N}\s./-]{0,39}$/u.test(s)) {
    return 'Lớp phụ trách chỉ gồm chữ, số (vd: 1A5).';
  }
  return null;
}

export function bodyToProfileForm(b: Record<string, string>): ProfileForm {
  return {
    username: String(b.username || ''),
    password: String(b.password || ''),
    full_name: String(b.full_name || ''),
    dob: String(b.dob || '').slice(0, 10),
    zalo_phone: String(b.zalo_phone || ''),
    email: String(b.email || ''),
    user_kind: b.user_kind === 'student' ? 'student' : 'teacher',
    unit_name: String(b.unit_name || ''),
    ward: String(b.ward || ''),
    class_in_charge: String(b.class_in_charge || ''),
  };
}

export function validateProfileForm(form: ProfileForm, opts: { requireAccount: boolean }) {
  const errors: Partial<Record<ProfileField, string>> = {};
  if (opts.requireAccount) {
    const u = validateUsername(form.username);
    const p = validatePassword(form.password);
    if (u) errors.username = u;
    if (p) errors.password = p;
  }
  const full_name = validateFullName(form.full_name);
  const dob = validateDob(form.dob);
  const zalo_phone = validateZaloPhone(form.zalo_phone);
  const email = validateEmail(form.email);
  const user_kind = validateUserKind(form.user_kind);
  const unit_name = validateUnitName(form.unit_name);
  const ward = validateWard(form.ward);
  const class_in_charge = validateClassInCharge(form.class_in_charge);
  if (full_name) errors.full_name = full_name;
  if (dob) errors.dob = dob;
  if (zalo_phone) errors.zalo_phone = zalo_phone;
  if (email) errors.email = email;
  if (user_kind) errors.user_kind = user_kind;
  if (unit_name) errors.unit_name = unit_name;
  if (ward) errors.ward = ward;
  if (class_in_charge) errors.class_in_charge = class_in_charge;
  return errors;
}

export function firstProfileError(errors: Partial<Record<ProfileField, string>>) {
  return Object.values(errors).find(Boolean) || '';
}

export function normalizedProfile(form: ProfileForm) {
  return {
    username: form.username.trim(),
    password: form.password,
    full_name: collapseSpaces(form.full_name),
    dob: String(form.dob || '').slice(0, 10),
    zalo_phone: normalizeZaloPhone(form.zalo_phone),
    email: form.email.trim().toLowerCase(),
    user_kind: form.user_kind === 'student' ? 'student' : 'teacher',
    unit_name: collapseSpaces(form.unit_name),
    ward: collapseSpaces(form.ward),
    class_in_charge: collapseSpaces(form.class_in_charge),
  };
}
