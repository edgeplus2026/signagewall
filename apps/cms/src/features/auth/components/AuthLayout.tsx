import { GalleryVerticalEnd } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import heroImage from '@/assets/auth.jpg'
import { LanguageSwitcher } from '@/features/auth/components/LanguageSwitcher'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation()

  return (
    <div className="relative grid min-h-svh lg:grid-cols-2">
      <LanguageSwitcher className="absolute top-4 right-4 z-20 lg:top-14 lg:right-14" />
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link to="/" className="flex items-center gap-2 font-medium">
            <div className="bg-brand text-brand-contrast flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
            {t('common.appName')}
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
      <div className="hidden p-6 md:p-10 lg:sticky lg:top-0 lg:block lg:h-svh">
        <img
          src={heroImage}
          alt=""
          className="h-full w-full rounded-2xl object-cover dark:brightness-[0.65] dark:grayscale"
        />
      </div>
    </div>
  )
}
