import { Helmet } from 'react-helmet-async'

const siteName = 'Live TV'
const defaultDescription = 'Watch live IPTV channels in a modern OTT streaming app with favorites, search, categories, and HLS playback.'
const defaultUrl = 'https://live-tv.local/'
const themeColor = '#06070d'

export default function Seo({
  title = siteName,
  description = defaultDescription,
  url = defaultUrl,
  image = '/favicon.svg',
  type = 'website',
  noIndex = false,
}) {
  const fullTitle = title === siteName ? siteName : `${title} | ${siteName}`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={noIndex ? 'noindex, nofollow' : 'index, follow'} />
      <meta name="theme-color" content={themeColor} />
      <meta name="application-name" content={siteName} />
      <meta name="apple-mobile-web-app-title" content={siteName} />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  )
}
