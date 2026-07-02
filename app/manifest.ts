import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'mySwamp',
    short_name: 'mySwamp',
    description: 'dump your tasks. get your frog.',
    start_url: '/',
    display: 'standalone',
    background_color: '#07100b',
    theme_color: '#07100b',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
