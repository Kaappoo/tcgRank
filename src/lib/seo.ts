const APP_URL =
  (typeof process !== 'undefined' ? process.env.APP_URL : undefined) ??
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')

export const absoluteUrl = (path: string): string => new URL(path, APP_URL).toString()

/** Open Graph + Twitter tags so shared links unfurl with a generated image on WhatsApp, Discord and X. */
export const seo = ({ title, description, image }: { title: string; description: string; image?: string }) => [
  { title },
  { name: 'description', content: description },
  { property: 'og:type', content: 'website' },
  { property: 'og:site_name', content: 'tcgRank' },
  { property: 'og:title', content: title },
  { property: 'og:description', content: description },
  { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' },
  { name: 'twitter:title', content: title },
  { name: 'twitter:description', content: description },
  ...(image
    ? [
        { property: 'og:image', content: image },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:image', content: image },
      ]
    : []),
]
