'use client';

import React from 'react';

export type MascotMood =
  | 'happy'
  | 'normal'
  | 'good_spending'
  | 'warning'
  | 'high_spending'
  | 'empty'
  | 'success';

interface MascotProps {
  mood?: MascotMood;
  className?: string;
  size?: number;
}

export function Mascot({
  mood = 'normal',
  className = '',
  size = 56,
}: MascotProps) {
  // SVG Mascot Mooney: Chú mầm xanh tài chính đáng yêu
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center shrink-0 ${className}`}
      aria-label={`Mooney Mascot: ${mood}`}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm select-none"
      >
        {/* Lá mầm nhỏ trên đầu */}
        <path
          d="M50 22 C 45 10, 32 14, 46 22 Z"
          fill="#52B788"
          stroke="#2D6A4F"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M50 22 C 55 10, 68 14, 54 22 Z"
          fill="#74C69D"
          stroke="#2D6A4F"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Thân nhân vật: Tròn múp mềm mại */}
        <rect
          x="18"
          y="22"
          width="64"
          height="62"
          rx="31"
          fill="#D8F3DC"
          stroke="#40916C"
          strokeWidth="3"
        />

        {/* Má hồng (Blush) */}
        <ellipse cx="28" cy="58" rx="5" ry="3" fill="#FCA5A5" opacity="0.6" />
        <ellipse cx="72" cy="58" rx="5" ry="3" fill="#FCA5A5" opacity="0.6" />

        {/* Biểu cảm mắt & miệng theo mood */}
        {(mood === 'happy' || mood === 'good_spending' || mood === 'success') && (
          <>
            {/* Mắt cười tít ^ ^ */}
            <path
              d="M32 50 Q 38 43 44 50"
              stroke="#1B4332"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path
              d="M56 50 Q 62 43 68 50"
              stroke="#1B4332"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Miệng cười tươi */}
            <path
              d="M43 59 Q 50 67 57 59"
              stroke="#1B4332"
              strokeWidth="3"
              strokeLinecap="round"
              fill="#E53E3E"
            />
          </>
        )}

        {mood === 'normal' && (
          <>
            {/* Mắt tròn ngây thơ */}
            <circle cx="38" cy="48" r="3.5" fill="#1B4332" />
            <circle cx="62" cy="48" r="3.5" fill="#1B4332" />
            {/* Miệng mỉm cười nhẹ */}
            <path
              d="M46 58 Q 50 63 54 58"
              stroke="#1B4332"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </>
        )}

        {mood === 'warning' && (
          <>
            {/* Mắt hơi lo âu */}
            <circle cx="38" cy="49" r="3.5" fill="#1B4332" />
            <circle cx="62" cy="49" r="3.5" fill="#1B4332" />
            {/* Miệng hơi tròn chữ o */}
            <ellipse
              cx="50"
              cy="60"
              rx="3.5"
              ry="4.5"
              fill="#1B4332"
            />
          </>
        )}

        {mood === 'high_spending' && (
          <>
            {/* Mắt chao đảo > < */}
            <path
              d="M34 46 L 42 52 L 34 56"
              stroke="#1B4332"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M66 46 L 58 52 L 66 56"
              stroke="#1B4332"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Giọt mồ hôi lo lắng */}
            <path
              d="M74 38 Q 78 44 74 48 Q 70 44 74 38 Z"
              fill="#60A5FA"
            />
            {/* Miệng gợn sóng */}
            <path
              d="M44 63 Q 47 60 50 63 Q 53 66 56 63"
              stroke="#1B4332"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </>
        )}

        {mood === 'empty' && (
          <>
            {/* Mắt ngủ êm dịu - - */}
            <path
              d="M33 50 L 43 50"
              stroke="#1B4332"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M57 50 L 67 50"
              stroke="#1B4332"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Miệng nhỏ xíu */}
            <circle cx="50" cy="58" r="2" fill="#1B4332" />
          </>
        )}
      </svg>
    </div>
  );
}
