import { FilmIcon, ListVideoIcon, MonitorIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { useAuthStore } from "@/features/auth/store/authStore"
import { DashboardStatCard } from "@/features/dashboard/components/DashboardStatCard"
import { useDashboardStats } from "@/features/dashboard/hooks/useDashboardStats"

export default function DashboardPage() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)
  const { playlistCount, mediaFileCount, screenCount } = useDashboardStats()

  const greetingName = user?.name.split(" ")[0]

  return (
    <div className="flex w-full min-w-0 flex-col gap-7 lg:px-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-primary text-xl font-medium tracking-tight">
          {greetingName
            ? t("dashboard.greeting", { name: greetingName })
            : t("dashboard.title")}
        </h1>
        <p className="text-secondary text-sm">{t("dashboard.description")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardStatCard
          label={t("dashboard.stats.screens")}
          value={screenCount}
          icon={MonitorIcon}
          to="/screens"
        />
        <DashboardStatCard
          label={t("dashboard.stats.playlists")}
          value={playlistCount}
          icon={ListVideoIcon}
          to="/playlists"
        />
        <DashboardStatCard
          label={t("dashboard.stats.media")}
          value={mediaFileCount}
          icon={FilmIcon}
          to="/media"
        />
      </div>
    </div>
  )
}
