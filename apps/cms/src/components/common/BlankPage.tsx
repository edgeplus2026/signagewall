import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface BlankPageProps {
  titleKey: string
  descriptionKey?: string
}

export function BlankPage({ titleKey, descriptionKey }: BlankPageProps) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(titleKey)}</CardTitle>
        {descriptionKey ? (
          <CardDescription>{t(descriptionKey)}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        <p className="text-secondary text-sm">{t('layout.blankPlaceholder')}</p>
      </CardContent>
    </Card>
  )
}
