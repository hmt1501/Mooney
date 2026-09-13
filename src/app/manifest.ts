import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mooney — Sổ Quản Lý Chi Tiêu',
    short_name: 'Mooney',
    description: 'Personal expense management web app.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF9F5',
    theme_color: '#1B4332',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
