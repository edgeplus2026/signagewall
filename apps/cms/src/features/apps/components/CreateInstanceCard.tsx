import { CopyPlusIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CreateCard } from '@/components/common/CreateCard'

interface CreateInstanceCardProps {
  onClick: () => void
}

export function CreateInstanceCard({ onClick }: CreateInstanceCardProps) {
  const { t } = useTranslation()

  return (
    <CreateCard
      icon={CopyPlusIcon}
      title={t('apps.instances.create.title')}
      hint={t('apps.instances.create.description')}
      onClick={onClick}
    />
  )
}
