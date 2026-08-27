/** Sticker Facebook Care — mặt vàng ôm trái tim đỏ (nút Care, tách khỏi nút Yêu). */
export default function FbCareHeart({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      aria-hidden
      style={{ display: 'block', flexShrink: 0 }}
    >
      <circle cx="13.2" cy="18.4" r="12.6" fill="#F7B928" />
      <ellipse cx="9.4" cy="16.1" rx="1.65" ry="2.05" fill="#613A16" />
      <ellipse cx="16.6" cy="16.1" rx="1.65" ry="2.05" fill="#613A16" />
      <path
        d="M9.15 21.35c1.7 2.35 5.7 2.5 8.05.2"
        stroke="#613A16"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M22.7 8.05c-1.45-1.95-4.35-.5-4.35 2.05 0-2.55-2.9-4-4.35-2.05-1.6 2.1 1.25 6.15 4.35 9.1 3.1-2.95 5.95-7 4.35-9.1z"
        fill="#F33E58"
        transform="translate(8.2 2.2)"
      />
      <path
        d="M4.8 24.4c3.4 5.2 12.6 6.4 20.8-.4"
        stroke="#F7B928"
        strokeWidth="4.4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M20.2 26.6c4.4 1.15 8.6-.35 10.2-3.2"
        stroke="#F7B928"
        strokeWidth="3.6"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M29.4 14.1c.5-.8 1.45-.9 1.95-.2"
        stroke="#FF8A9B"
        strokeWidth="1.05"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
