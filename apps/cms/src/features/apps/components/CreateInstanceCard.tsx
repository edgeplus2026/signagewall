import { PlusIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface CreateInstanceCardProps {
  onClick: () => void
}

/**
 * Placeholder card that creates a new instance on click — mirrors the
 * "add" cards used elsewhere (e.g. MediaUploadCard / ContentEditor hint).
 */
export function CreateInstanceCard({ onClick }: CreateInstanceCardProps) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-56 flex-col overflow-hidden rounded-2xl border border-dashed border-secondary bg-panel/50 text-left transition-colors hover:border-brand/60 hover:bg-brand/5"
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand transition-transform duration-300 group-hover:scale-105">
          <PlusIcon className="size-6" />
        </div>
        <p className="text-sm font-medium text-primary">
          {t('apps.instances.create.title')}
        </p>
        <p className="max-w-[14rem] text-xs text-secondary">
          {t('apps.instances.create.description')}
        </p>
      </div>
    </button>
  )
}
