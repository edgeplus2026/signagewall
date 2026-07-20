import {
  ArrowRightIcon,
  ImageIcon,
  LightbulbIcon,
  ListVideoIcon,
  MonitorIcon,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

interface Concept {
  key: string
  icon: LucideIcon
  to: string
}

const CONCEPTS: Concept[] = [
  { key: 'screens', icon: MonitorIcon, to: '/screens' },
  { key: 'playlists', icon: ListVideoIcon, to: '/playlists' },
  { key: 'media', icon: ImageIcon, to: '/media' },
]

export function LearnSection() {
  const { t } = useTranslation()

  const tipsValue = t('dashboard.learn.tips', { returnObjects: true })
  const tips = Array.isArray(tipsValue) ? (tipsValue as string[]) : []

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-primary text-sm font-medium">{t('dashboard.learn.title')}</h2>
          <p className="text-secondary mt-0.5 text-xs">{t('dashboard.learn.description')}</p>
        </div>
        <Link
          to="/faq"
          className="text-secondary hover:text-primary inline-flex shrink-0 items-center gap-1 text-xs font-medium transition-colors"
        >
          {t('dashboard.learn.faqLink')}
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {CONCEPTS.map((concept) => (
          <Link
            key={concept.key}
            to={concept.to}
            className="group border-secondary bg-panel hover:border-brand/40 flex flex-col gap-3 rounded-xl border p-5 transition-all hover:shadow-sm"
          >
            <div className="bg-brand/10 text-brand flex size-10 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105">
              <concept.icon className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-primary text-sm font-medium">
                {t(`dashboard.learn.concepts.${concept.key}.title`)}
              </h3>
              <p className="text-secondary text-xs leading-relaxed">
                {t(`dashboard.learn.concepts.${concept.key}.description`)}
              </p>
            </div>
            <span className="text-secondary group-hover:text-primary mt-auto inline-flex items-center gap-1 text-xs font-medium transition-colors">
              {t('dashboard.learn.cta')}
              <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>

      {tips.length > 0 ? (
        <div className="border-secondary bg-panel flex flex-col gap-3 rounded-xl border p-5">
          <div className="flex items-center gap-2">
            <LightbulbIcon className="text-warning size-4" />
            <h3 className="text-primary text-sm font-medium">{t('dashboard.learn.tipsTitle')}</h3>
          </div>
          <ul className="grid gap-3 sm:grid-cols-3">
            {tips.map((tip, index) => (
              <li key={index} className="text-secondary flex gap-2.5 text-xs leading-relaxed">
                <span className="text-primary/30 font-medium tabular-nums">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
