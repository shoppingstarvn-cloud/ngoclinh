import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px',
          background:
            'linear-gradient(135deg, #08111f 0%, #0f2a4d 45%, #153b68 100%)',
          color: '#ffffff',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: '28px',
            fontWeight: 700,
            color: '#9fd3ff',
          }}
        >
          <div
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '999px',
              background: '#37b6ff',
              display: 'flex',
            }}
          />
          Hệ Sinh Thái AI
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            maxWidth: '920px',
          }}
        >
          <div
            style={{
              fontSize: '68px',
              lineHeight: 1.08,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              display: 'flex',
            }}
          >
            Học AI cùng chuyên gia Mr Ngọc Linh
          </div>
          <div
            style={{
              fontSize: '30px',
              lineHeight: 1.35,
              color: '#d7e9ff',
              display: 'flex',
            }}
          >
            Không cần kỹ năng vẫn chuyên nghiệp. Chia sẻ hệ sinh thái AI mới
            nhất với bạn ngay hôm nay.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div
              style={{
                fontSize: '22px',
                color: '#9fd3ff',
                display: 'flex',
              }}
            >
              ngoclinh.shopmartai.com
            </div>
            <div
              style={{
                fontSize: '24px',
                color: '#ffffff',
                opacity: 0.92,
                display: 'flex',
              }}
            >
              Chuyên gia AI • Hệ sinh thái AI thực chiến
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '18px 28px',
              borderRadius: '999px',
              background: '#37b6ff',
              color: '#08111f',
              fontSize: '24px',
              fontWeight: 800,
            }}
          >
            Share V2
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    },
  );
}
