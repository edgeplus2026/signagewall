const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3002'

/** Organization + WebSite structured data (rendered once in the root layout). */
export function OrganizationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'EdgeRize',
        url: siteUrl,
        logo: `${siteUrl}/favicon.svg`,
        description: 'Software for digital screens.',
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: 'EdgeRize',
        publisher: { '@id': `${siteUrl}/#organization` },
        inLanguage: ['sr', 'en'],
      },
    ],
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  )
}
