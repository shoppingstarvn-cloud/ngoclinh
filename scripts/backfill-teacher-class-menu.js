/**
 * NGOCLINH — chuẩn hoá slug website con giáo viên 2 trường
 * (Trương Công Định / Nguyễn Công Trứ) thành /{slug-trường-khai-báo}/{slug-lớp}
 * và gắn menu cấp 2 trong khối HOẠT ĐỘNG TRỌNG TÂM dưới tên trường cấp 1.
 *
 * CHỈ kho pglbhoitmcflpvoasewr. Cấm Cửa Âu. Không in khoá.
 *
 * PowerShell, từ thư mục repo:
 *   node scripts/backfill-teacher-class-menu.js
 *   node scripts/backfill-teacher-class-menu.js --dry-run
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const NGOCLINH_REF = 'pglbhoitmcflpvoasewr';
const CUA_AU_REF = 'bfruxinvvvaqufghtigw';
const ROOT = path.resolve(__dirname, '..');
const LIVE = 'https://ngoclinh.shopmartai.com';
const SCHOOL_LABEL = {
  tcd: 'Trường THCS Trương Công Định',
  nct: 'Trường Tiểu Học Nguyễn Công Trứ',
};

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const o = {};
  for (const raw of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 1) continue;
    let val = line.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    o[line.slice(0, i).trim()] = val;
  }
  return o;
}

function keyOk(k) {
  return typeof k === 'string' && k.trim().length >= 80;
}

function noAccent(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function fold(s) {
  return noAccent(s).toLowerCase();
}

function slugify(s) {
  return fold(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function isTeacherUserKind(kind) {
  return String(kind || '').trim().toLowerCase() !== 'student';
}

function specialSchoolKey(unit) {
  const key = fold(unit || '');
  if (key.includes('truong cong dinh')) return 'tcd';
  if (key.includes('nguyen cong tru')) return 'nct';
  return null;
}

function isRootCategory(parentId) {
  return parentId == null || Number(parentId) === 0;
}

function isLevel1(parentId) {
  return parentId == null || Number(parentId) === 0;
}

function isTargetHomeBlock(name, slug) {
  const n = fold(name);
  const s = String(slug || '').toLowerCase();
  if (n.includes('hoat dong') && n.includes('trong tam')) return true;
  if (n.includes('hoat dong') && n.includes('phong trao')) return true;
  return /^hoat-dong-(phong-trao|trong-tam)(-r2)?$/.test(s);
}

function labelMatchesSchool(label, school) {
  const n = fold(label);
  if (school === 'tcd') return n.includes('truong cong dinh');
  return n.includes('nguyen cong tru');
}

function albumPath(slug) {
  const s = String(slug || '').replace(/^\/+/, '').replace(/\/+$/, '');
  return s ? `/${s}` : '/';
}

function albumUrl(slug) {
  return LIVE + albumPath(slug);
}

function compactToken(s) {
  return fold(s).replace(/[^a-z0-9]+/g, '');
}

function classToken(s) {
  return compactToken(s).replace(/^lop/, '');
}

function sameClassIdentity(a, b) {
  const ta = classToken(a);
  const tb = classToken(b);
  return ta.length >= 3 && ta === tb;
}

function linkPathname(link) {
  const raw = String(link || '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw, LIVE);
    return u.pathname.replace(/\.html$/i, '').replace(/\/+$/, '') || '/';
  } catch {
    return raw.replace(/\.html$/i, '').replace(/\/+$/, '') || '';
  }
}

function sameAlbumLink(link, slug) {
  const pth = albumPath(slug);
  const raw = String(link || '').trim();
  if (!raw || !slug) return false;
  if (raw === pth || raw === `${pth}/` || raw === `${pth}.html`) return true;
  const p = linkPathname(raw);
  return p === pth || p === `${pth}/`;
}

function isLegacyClassOnlyLink(link, slug, previousSlug, classLabel) {
  const p = linkPathname(link);
  if (!p || p === '/') return false;
  const segs = p.replace(/^\/+/, '').split('/').filter(Boolean);
  if (segs.length !== 1) return false;
  const tok = classToken(segs[0]);
  if (tok.length < 3) return false;
  const candidates = [slug, previousSlug, classLabel]
    .filter(Boolean)
    .map((s) => classToken(String(s).split('/').pop() || ''));
  return candidates.includes(tok);
}

function findExistingClassItem(children, school, classLabel, slug, previousSlug) {
  const notSchoolName = (row) => !labelMatchesSchool(row.label || '', school);
  return (
    children.find((s) => sameAlbumLink(s.link_url, slug)) ||
    (previousSlug ? children.find((s) => sameAlbumLink(s.link_url, previousSlug)) : undefined) ||
    children.find(
      (s) =>
        notSchoolName(s) &&
        classLabel.trim() &&
        (fold(s.label || '') === fold(classLabel) ||
          sameClassIdentity(s.label || '', classLabel) ||
          sameClassIdentity(s.label || '', String(slug).split('/').pop() || '') ||
          (!!previousSlug &&
            sameClassIdentity(s.label || '', String(previousSlug).split('/').pop() || ''))),
    ) ||
    children.find(
      (s) => notSchoolName(s) && isLegacyClassOnlyLink(s.link_url, slug, previousSlug, classLabel),
    )
  );
}

function pickNgoclinhCreds() {
  const migratePath = path.join(ROOT, 'migrate.config.json');
  if (fs.existsSync(migratePath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(migratePath, 'utf8'));
      const url = String(cfg.NEW_URL || '').trim().replace(/\/$/, '');
      const key = String(cfg.NEW_SERVICE_KEY || '').trim();
      if (url.includes(NGOCLINH_REF) && keyOk(key)) {
        return { url, key, source: 'migrate.config.json (NEW_*)' };
      }
    } catch (e) {
      console.error('⚠️  migrate.config.json không đọc được:', e.message);
    }
  }
  const files = ['.env.ngoclinh.local', '.env.ngoclinh.latest.local', '.env.local'];
  for (const name of files) {
    const env = parseEnvFile(path.join(ROOT, name));
    if (!env) continue;
    const url = (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '').trim().replace(/\/$/, '');
    const key = (env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY || '').trim();
    if (url.includes(CUA_AU_REF) || /congbetongcuaau/i.test(url)) continue;
    if (url.includes(NGOCLINH_REF) && keyOk(key)) {
      return { url, key, source: name };
    }
  }
  return { url: '', key: '', source: '' };
}

const dryRun = process.argv.includes('--dry-run');
const createMissing = process.argv.includes('--create-missing');
const picked = pickNgoclinhCreds();
if (picked.source) console.log('Env source:', picked.source);
if (!picked.url || !picked.key) {
  console.error('❌ Thiếu NEW_URL / NEW_SERVICE_KEY (ngoclinh). Dừng.');
  process.exit(1);
}
if (picked.url.includes(CUA_AU_REF) || /congbetongcuaau/i.test(picked.url)) {
  console.error('❌ URL đang trỏ Cửa Âu. Dừng.');
  process.exit(1);
}
if (!picked.url.includes(NGOCLINH_REF)) {
  console.error('❌ URL không phải kho ngoclinh (' + NGOCLINH_REF + ').');
  process.exit(1);
}

const supabase = createClient(picked.url, picked.key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function rewriteMenuUrls(fromSlug, toSlug) {
  const oldPath = albumPath(fromSlug);
  const oldFull = albumUrl(fromSlug);
  const newPath = albumPath(toSlug);
  const urls = [oldPath, `${oldPath}/`, `${oldPath}.html`, oldFull, `${oldFull}/`];
  if (dryRun) {
    console.log('  [dry] rewrite urls', fromSlug, '→', toSlug);
    return;
  }
  await supabase.from('menus').update({ url: newPath }).in('url', urls);
  await supabase.from('category_submenus').update({ link_url: newPath }).in('link_url', urls);
}

async function ensureTeacherClassHomeMenu(opts) {
  if (!isTeacherUserKind(opts.userKind)) return { skipped: 'not-teacher' };
  const school = specialSchoolKey(opts.unitName);
  if (!school) return { skipped: 'not-special-school' };
  const slug = String(opts.slug || '').replace(/^\/+/, '').replace(/\/+$/, '');
  if (!slug) return { skipped: 'no-slug' };
  const classLabel = String(opts.className || '').trim() || 'Lớp';
  const linkUrl = albumPath(slug);

  const { data: cats, error: catErr } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id, display_order')
    .eq('is_active', true);
  if (catErr || !cats?.length) return { error: catErr?.message || 'no categories' };

  const blocks = cats.filter((c) => isRootCategory(c.parent_id) && isTargetHomeBlock(c.name || '', c.slug || ''));
  if (!blocks.length) return { error: 'no HOẠT ĐỘNG block' };

  const catIds = blocks.map((c) => Number(c.id));
  const { data: subs } = await supabase
    .from('category_submenus')
    .select('id, category_id, parent_id, label, link_url, display_order')
    .in('category_id', catIds);
  const allSubs = subs || [];

  const preferOriginal = (a, b) => {
    const ar = String(a.slug || '').endsWith('-r2') ? 1 : 0;
    const br = String(b.slug || '').endsWith('-r2') ? 1 : 0;
    if (ar !== br) return ar - br;
    const at = fold(a.name).includes('trong tam') ? 0 : 1;
    const bt = fold(b.name).includes('trong tam') ? 0 : 1;
    if (at !== bt) return at - bt;
    return (Number(a.display_order) || 0) - (Number(b.display_order) || 0);
  };
  const ordered = [...blocks].sort(preferOriginal);
  const now = new Date().toISOString();
  const schoolIdsByCat = new Map();
  const existingSchoolLink =
    allSubs.find((s) => isLevel1(s.parent_id) && labelMatchesSchool(s.label || '', school))?.link_url || '';
  const actions = [];

  for (const cat of ordered) {
    const cid = Number(cat.id);
    const level1 = allSubs
      .filter(
        (s) =>
          Number(s.category_id) === cid &&
          isLevel1(s.parent_id) &&
          labelMatchesSchool(s.label || '', school),
      )
      .sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0));
    if (level1[0]) {
      schoolIdsByCat.set(cid, Number(level1[0].id));
      continue;
    }
    const siblings = allSubs.filter((s) => Number(s.category_id) === cid && isLevel1(s.parent_id));
    const nextOrder = siblings.reduce((m, s) => Math.max(m, Number(s.display_order) || 0), 0) + 1;
    actions.push(`insert L1 "${SCHOOL_LABEL[school]}" on cat ${cid} (${cat.name})`);
    if (dryRun) continue;
    const { data: created, error: insSchoolErr } = await supabase
      .from('category_submenus')
      .insert({
        category_id: cid,
        parent_id: null,
        label: SCHOOL_LABEL[school],
        link_url: existingSchoolLink || '',
        display_order: nextOrder,
        is_active: true,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();
    if (insSchoolErr || !created) {
      console.warn('  insert L1 fail', insSchoolErr?.message);
      continue;
    }
    schoolIdsByCat.set(cid, Number(created.id));
    allSubs.push({
      id: Number(created.id),
      category_id: cid,
      parent_id: null,
      label: SCHOOL_LABEL[school],
      link_url: existingSchoolLink || '',
      display_order: nextOrder,
    });
  }

  if (!schoolIdsByCat.size && !dryRun) return { error: 'no school L1', actions };

  for (const [cid, schoolId] of schoolIdsByCat) {
    const orphan = allSubs.find(
      (s) =>
        Number(s.category_id) === cid &&
        isLevel1(s.parent_id) &&
        Number(s.id) !== schoolId &&
        !labelMatchesSchool(s.label || '', school) &&
        !!findExistingClassItem([s], school, classLabel, slug, opts.previousSlug),
    );
    if (orphan) {
      actions.push(`reparent orphan #${orphan.id} "${orphan.label}" → L1 #${schoolId}`);
      if (!dryRun) {
        await supabase
          .from('category_submenus')
          .update({
            parent_id: schoolId,
            link_url: linkUrl,
            ...(classLabel.trim() ? { label: classLabel } : {}),
            is_active: true,
            updated_at: now,
          })
          .eq('id', orphan.id);
        orphan.parent_id = schoolId;
        orphan.link_url = linkUrl;
        if (classLabel.trim()) orphan.label = classLabel;
      }
    }

    const children = allSubs.filter((s) => Number(s.parent_id) === schoolId);
    const existing = findExistingClassItem(children, school, classLabel, slug, opts.previousSlug);
    if (existing) {
      const needsUrl = !sameAlbumLink(existing.link_url, slug);
      const needsLabel =
        fold(existing.label || '') !== fold(classLabel) &&
        !sameClassIdentity(existing.label || '', classLabel);
      if (needsUrl || needsLabel) {
        actions.push(
          `update L2 #${existing.id} "${existing.label}" ${existing.link_url} → ${linkUrl}`,
        );
        if (!dryRun) {
          await supabase
            .from('category_submenus')
            .update({
              ...(needsUrl ? { link_url: linkUrl } : {}),
              ...(needsLabel && classLabel.trim() ? { label: classLabel } : {}),
              is_active: true,
              updated_at: now,
            })
            .eq('id', existing.id);
        }
      } else {
        actions.push(`keep L2 #${existing.id} "${existing.label}" ${existing.link_url}`);
      }
      continue;
    }
    actions.push(`insert L2 "${classLabel}" ${linkUrl} under L1 #${schoolId} cat ${cid}`);
    if (dryRun) continue;
    const nextOrder = children.reduce((m, s) => Math.max(m, Number(s.display_order) || 0), 0) + 1;
    const { data: inserted } = await supabase
      .from('category_submenus')
      .insert({
        category_id: cid,
        parent_id: schoolId,
        label: classLabel,
        link_url: linkUrl,
        display_order: nextOrder,
        is_active: true,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();
    if (inserted) {
      allSubs.push({
        id: Number(inserted.id),
        category_id: cid,
        parent_id: schoolId,
        label: classLabel,
        link_url: linkUrl,
        display_order: nextOrder,
      });
    }
  }

  return { school, slug, linkUrl, classLabel, actions };
}

async function main() {
  console.log(dryRun ? '=== DRY RUN (không ghi DB) ===' : '=== APPLY (ghi kho ngoclinh) ===');
  const [{ data: users, error: uErr }, { data: pages, error: pErr }] = await Promise.all([
    supabase
      .from('users')
      .select('id, full_name, user_kind, unit_name, class_in_charge, role, is_active')
      .limit(2000),
    supabase.from('album_pages').select('id, slug, title, owner_user_id, is_active').limit(5000),
  ]);
  if (uErr) throw new Error('users: ' + uErr.message);
  if (pErr) throw new Error('album_pages: ' + pErr.message);

  const pagesByOwner = new Map();
  for (const p of pages || []) {
    const oid = Number(p.owner_user_id);
    if (!oid) continue;
    if (!pagesByOwner.has(oid)) pagesByOwner.set(oid, []);
    pagesByOwner.get(oid).push(p);
  }

  const targets = (users || []).filter(
    (u) => isTeacherUserKind(u.user_kind) && specialSchoolKey(u.unit_name),
  );
  console.log('Giáo viên 2 trường đặc biệt:', targets.length);

  const summary = [];
  for (const u of targets) {
    const school = specialSchoolKey(u.unit_name);
    const wantedSchool = slugify(u.unit_name || '') || `truong-${u.id}`;
    const wantedKlass = slugify(u.class_in_charge || '') || 'lop';
    const wantedSlug = `${wantedSchool}/${wantedKlass}`;
    const mine = (pagesByOwner.get(Number(u.id)) || []).filter((p) => p.is_active !== false);
    const row = {
      id: u.id,
      name: u.full_name,
      kind: u.user_kind || '(trống)',
      unit: u.unit_name,
      klass: u.class_in_charge,
      school,
      wanted: wantedSlug,
      current: mine.map((p) => p.slug).join(' | ') || '(chưa có website)',
    };

    if (!mine.length && !createMissing) {
      row.status = 'skip — chưa có website (không tạo)';
      summary.push(row);
      continue;
    }

    let page = mine[0];
    let previousSlug;
    if (!page) {
      row.status = dryRun ? 'dry — sẽ tạo website' : 'tạo website';
      if (!dryRun) {
        const ins = await supabase
          .from('album_pages')
          .insert({
            slug: wantedSlug,
            title: u.class_in_charge || 'Lớp của tôi',
            subtitle: `Nhật ký · Album ${u.unit_name || ''}`.trim(),
            submenu_label: String(u.class_in_charge || '').trim(),
            owner_user_id: u.id,
            school_slug: wantedSchool,
            class_slug: wantedKlass,
            is_active: true,
          })
          .select('*')
          .single();
        if (ins.error) {
          row.status = 'lỗi tạo page: ' + ins.error.message;
          summary.push(row);
          continue;
        }
        page = ins.data;
      } else {
        page = { slug: wantedSlug };
      }
    } else {
      const current = String(page.slug || '').replace(/^\/+/, '').replace(/\/+$/, '');
      if (current && current !== wantedSlug) {
        if (dryRun) {
          previousSlug = current;
          row.status = `dry — đổi slug ${current} → ${wantedSlug}`;
        } else {
          const { data: clash } = await supabase
            .from('album_pages')
            .select('id')
            .eq('slug', wantedSlug)
            .neq('id', page.id)
            .maybeSingle();
          if (!clash) {
            const { error: upErr } = await supabase
              .from('album_pages')
              .update({
                slug: wantedSlug,
                school_slug: wantedSchool,
                class_slug: wantedKlass,
                updated_at: new Date().toISOString(),
              })
              .eq('id', page.id);
            if (!upErr) {
              previousSlug = current;
              await rewriteMenuUrls(current, wantedSlug);
              page = { ...page, slug: wantedSlug };
              row.status = `đổi slug ${current} → ${wantedSlug}`;
            } else {
              row.status = 'giữ slug cũ (lỗi): ' + upErr.message;
            }
          } else {
            row.status = `giữ slug cũ (trùng ${wantedSlug})`;
          }
        }
      } else {
        row.status = 'slug đã đúng';
      }
    }

    const menu = await ensureTeacherClassHomeMenu({
      userKind: u.user_kind,
      unitName: u.unit_name,
      className: u.class_in_charge || 'Lớp',
      slug: String(page.slug || wantedSlug),
      previousSlug,
    });
    row.menu = menu.actions || menu.error || menu.skipped;
    summary.push(row);
  }

  for (const r of summary) {
    console.log(
      JSON.stringify({
        id: r.id,
        name: r.name,
        unit: r.unit,
        klass: r.klass,
        wanted: r.wanted,
        current: r.current,
        status: r.status,
        menu: r.menu,
      }),
    );
  }
  console.log('Xong', summary.length, 'tài khoản.', dryRun ? '(dry-run)' : '(đã ghi)');
}

main().catch((e) => {
  console.error('❌', e.message || e);
  process.exit(1);
});
