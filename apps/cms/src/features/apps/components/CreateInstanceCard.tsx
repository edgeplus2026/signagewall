import { PlusIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface CreateInstanceCardProps {
  onClick: () => void
}

/**
 * Compact "add" card matching the InstanceCard layout (icon left, text right).
 */
export function CreateInstanceCard({ onClick }: CreateInstanceCardProps) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-2.5 rounded-2xl border border-dashed border-secondary bg-panel/50 p-4 text-left transition-colors hover:border-brand/60 hover:bg-brand/5"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand transition-transform duration-300 group-hover:scale-105">
        <PlusIcon className="size-5" />
      </div>
      <div className="flex min-w-0 flex-col">
        <p className="truncate text-sm font-medium text-primary">
          {t('apps.instances.create.title')}
        </p>
        <p className="truncate text-xs text-secondary">
          {t('apps.instances.create.description')}
        </p>
      </div>
    </button>
  )
}
