import { CopyIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

interface CopyableDetailRowProps {
  label: string
  value: string
  copyValue?: string
}

export function CopyableDetailRow({ label, value, copyValue }: CopyableDetailRowProps) {
  const { t } = useTranslation()

  const handleCopy = async () => {
    const text = copyValue ?? value

    try {
      await navigator.clipboard.writeText(text)
      toast.success(t('superAdmin.userSheet.copySuccess'))
    } catch {
      toast.error(t('superAdmin.userSheet.copyError'))
    }
  }

  return (
    <div className="flex flex-col gap-1 px-4 py-3">
      <div className="flex items-center gap-1.5">
        <span className="text-secondary text-[13px]">{label}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-secondary size-6"
          onClick={() => void handleCopy()}
        >
          <CopyIcon className="size-3" />
          <span className="sr-only">{t('superAdmin.userSheet.copy')}</span>
        </Button>
      </div>
      <span className="text-primary text-sm break-all">{value}</span>
    </div>
  )
}
