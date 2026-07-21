// ============================================================
// DETAIL-SYNC.JS — Động hoá THÂN BÀI trang chi tiết
// ------------------------------------------------------------
// Mục đích: khi Super Admin sửa nội dung một bài/sản phẩm/dự án/đối tác
// trong /admin.html, trang chi tiết tương ứng trên website tự hiển thị
// nội dung MỚI NHẤT từ Supabase — không phải sửa file HTML tĩnh.
//
// Cơ chế AN TOÀN:
//  - Giữ nguyên URL cũ (tốt cho SEO). Nội dung tĩnh là fallback.
//  - Chỉ THAY khi tìm thấy đúng bản ghi trong Supabase và có nội dung.
//  - Nếu không khớp / lỗi mạng → giữ nguyên nội dung tĩnh (không vỡ trang).
//
// Khớp bản ghi bằng slug sinh từ <h1> (cùng thuật toán lúc đồng bộ),
// có thử thêm hậu tố mã trang (p87 / n32) cho các trang bị đổi slug do trùng.
// ============================================================
(function () {
  "use strict";

  if (!window.supabase || !window.supabase.createClient) return; // chưa có thư viện → bỏ qua
  const SB_URL = "https://bfruxinvvvaqufghtigw.supabase.co";
  const SB_KEY = "sb_publishable_QUYv4qEJntioJJ-XWtHkdA_haHovSml";
  const sb = window.supabase.createClient(SB_URL, SB_KEY);

  // ---- tiện ích ----
  const noAccent = s => String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D");

  const slugify = s => noAccent(s).toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);

  // ---- xác định khuôn trang + khối nội dung ----
  function findBox() {
    let box = document.querySelector(".detail_product");
    if (box) return { box, kind: "product" };
    box = document.querySelector(".content_news_page");
    if (box) return { box, kind: "news" };
    box = document.querySelector(".news_page");
    if (box) return { box, kind: "news" };
    return null;
  }

  // ---- phân loại giống hệt lúc đồng bộ ----
  function classify() {
    const d = decodeURIComponent(location.pathname).toLowerCase();
    if (d.includes("/tin-tuc/") || d.includes("/tin-chuyen-nganh/") || d.includes("/tin-tuyen-dung")) return "posts";
    if (d.includes("/du-an/")) return "projects";
    if (d.includes("/khach-hang/") || d.includes("/nha-cung-cap/")) return "partners";
    if (/-p\d+\.html$/i.test(d)) return /bao-?gia/.test(noAccent(d)) ? "posts" : "products";
    return "posts";
  }

  async function run() {
    const hit = findBox();
    if (!hit) return; // không phải trang chi tiết

    const h1 = document.querySelector("h1");
    const title = (h1 ? h1.textContent : document.title || "").replace(/\s+/g, " ").trim();
    if (!title) return;

    const table = classify();
    const base = slugify(title);
    const code = (location.pathname.match(/-((?:p|n)\d+)\.html$/i) || [])[1];
    const candidates = code ? [base, base + "-" + code] : [base];

    let rows;
    try {
      const res = await sb.from(table).select("*").in("slug", candidates).limit(1);
      if (res.error) throw res.error;
      rows = res.data;
    } catch (e) {
      console.warn("[detail-sync] bỏ qua (", table, "):", e.message || e);
      return; // lỗi → giữ nội dung tĩnh
    }
    if (!rows || !rows.length) return; // không khớp → giữ tĩnh

    const rec = rows[0];
    if (rec.is_active === false) return;

    const html = (rec.content || "").trim();
    if (html.length < 20) return; // nội dung rỗng → giữ tĩnh

    // Thay ruột bài bằng nội dung mới nhất từ Supabase
    hit.box.innerHTML = html;

    // Cập nhật tiêu đề nếu admin đã sửa
    const newTitle = (rec.title || rec.name || "").trim();
    if (newTitle && h1 && newTitle !== title) h1.textContent = newTitle;

    console.log("[detail-sync] ✓ đã đồng bộ nội dung từ", table, "→ slug:", rec.slug);
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", run);
  else
    run();
})();
