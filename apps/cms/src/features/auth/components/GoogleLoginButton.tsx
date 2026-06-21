import { useTranslation } from 'react-i18next'

import { GoogleIcon } from '@/assets/icons/GoogleIcon'
import { Button } from '@/components/ui/button'
import { authApi } from '@/features/auth/api/authApi'

export function GoogleLoginButton() {
  const { t } = useTranslation()

  return (
    <Button
      variant="outline"
      type="button"
      className="w-full"
      onClick={() => {
        authApi.loginWithGoogle()
      }}
    >
      <GoogleIcon className="size-4" />
      {t('common.loginWithGoogle')}
    </Button>
  )
}
