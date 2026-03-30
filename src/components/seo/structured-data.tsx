export function AppStructuredData() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Lawket',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'LegalSoftware',
    operatingSystem: 'Web, Android, iOS',
    url: 'https://lawket.app',
    description:
      'AI-powered legal case management platform for solo lawyers in Pakistan, UK, USA and Australia.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'PKR',
      description: 'Free to start with 10 AI credits',
    },
    featureList: [
      'AI case assistant per case',
      'Hearing reminders',
      'Document analysis',
      'Offline access',
      'Push notifications',
      'Dark mode',
    ],
    screenshot: 'https://lawket.app/og-image.png',
    softwareVersion: '1.0.0',
    releaseNotes: 'https://lawket.app/changelog',
    author: {
      '@type': 'Organization',
      name: 'Lawket',
      url: 'https://lawket.app',
      email: 'info.lawket.app@gmail.com',
    },
    inLanguage: ['en', 'ur'],
    countriesSupported: 'PK, GB, US, AU',
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data),
      }}
    />
  )
}

export function FAQStructuredData() {
  const faqs = [
    {
      q: 'Is Lawket free to use?',
      a: 'Yes. You get 10 free AI credits on signup. Purchase more when you need them.',
    },
    {
      q: 'Does Lawket work offline?',
      a: 'Yes. Lawket is a PWA that works offline. Your cases are always accessible even in courtrooms without internet.',
    },
    {
      q: 'Is my legal data safe?',
      a: 'Yes. All data is encrypted and stored with row-level security. Only you can access your cases.',
    },
    {
      q: 'Does Lawket provide legal advice?',
      a: 'No. Lawket is a practice management tool. AI features are drafting aids only. All legal work product must be reviewed by a qualified lawyer.',
    },
    {
      q: 'Which countries is Lawket available in?',
      a: 'Lawket is available globally with a focus on Pakistan, UK, USA and Australia.',
    },
    {
      q: 'Can I recover deleted cases?',
      a: 'Yes. Deleted cases go to an archive for 90 days where you can recover them. Permanent deletion requires explicit confirmation.',
    },
  ]

  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data),
      }}
    />
  )
}
