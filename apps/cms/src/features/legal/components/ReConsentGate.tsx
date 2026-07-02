import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { legalApi } from '@/features/legal/api/legalApi'
import { getApiErrorMessage } from '@/lib/api-error'

const ACCEPTANCE_QUERY_KEY = ['legal', 'acceptance-status'] as const

/**
 * Blocks the app with a modal when the signed-in user hasn't accepted the
 * current version of a legal document (first login after a version bump). The
 * app renders underneath; the modal can't be dismissed without accepting.
 */
export function ReConsentGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [checked, setChecked] = useState(false)

  const { data } = useQuery({
    queryKey: ACCEPTANCE_QUERY_KEY,
    queryFn: () => legalApi.getAcceptanceStatus(),
  })

  const acceptMutation = useMutation({
    mutationFn: () => legalApi.accept(),
    onSuccess: (status) => {
      queryClient.setQueryData(ACCEPTANCE_QUERY_KEY, status)
      setChecked(false)
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, t('legal.reconsent.error'))),
  })

  const needsReconsent = data?.needsReconsent ?? false

  return (
    <>
      {children}
      <Dialog open={needsReconsent}>
        <DialogContent showCloseButton={false} onInteractOutside={(e) => { e.preventDefault(); }}>
          <DialogHeader>
            <DialogTitle>{t('legal.reconsent.title')}</DialogTitle>
            <DialogDescription>
              {t('legal.reconsent.description')}
            </DialogDescription>
          </DialogHeader>

          <label className="flex items-start gap-2.5 px-1 text-sm">
            <Checkbox
              className="mt-0.5"
              checked={checked}
              onCheckedChange={(value) => { setChecked(value === true); }}
            />
            <span className="text-primary leading-snug">
              <Trans
                i18nKey="legal.reconsent.accept"
                components={{
                  terms: (
                    <Link
                      to="/legal/terms"
                      target="_blank"
                      className="underline underline-offset-4"
                    />
                  ),
                  privacy: (
                    <Link
                      to="/legal/privacy"
                      target="_blank"
                      className="underline underline-offset-4"
                    />
                  ),
                }}
              />
            </span>
          </label>

          <DialogFooter>
            <Button
              disabled={!checked || acceptMutation.isPending}
              onClick={() => { acceptMutation.mutate(); }}
            >
              {t('legal.reconsent.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
