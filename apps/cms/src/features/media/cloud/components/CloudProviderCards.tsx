import { Loader2Icon } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { MicrosoftBrowserDialog } from "@/features/media/cloud/components/MicrosoftBrowserDialog"
import { cloudEnv } from "@/features/media/cloud/lib/cloudEnv"
import { CloudPickerError } from "@/features/media/cloud/lib/cloudPickerError"
import { loadScript } from "@/features/media/cloud/lib/loadScript"
import {
  getGraphToken,
  isUserCancellation,
} from "@/features/media/cloud/lib/microsoftAuth"
import { GRAPH_SCOPES } from "@/features/media/cloud/lib/microsoftGraph"
import { PROVIDER_ICONS } from "@/features/media/cloud/lib/providerIconMap"
import { openDropboxPicker } from "@/features/media/cloud/pickers/dropbox"
import { openGoogleDrivePicker } from "@/features/media/cloud/pickers/googleDrive"
import { openGooglePhotosPicker } from "@/features/media/cloud/pickers/googlePhotos"
import type {
  CloudPickResult,
  CloudProvider,
} from "@/features/media/cloud/types/cloudPick.types"
import {
  mediaActionCardClassName,
  mediaActionCardIconClassName,
} from "@/features/media/lib/mediaActionCardStyles"
import { useStagingStore } from "@/features/media/store/stagingStore"
import { cn } from "@/lib/utils"

interface ProviderConfig {
  key: CloudProvider
  /** Sub-key under `media.providers.*` for title/hint. */
  i18nKey: string
  /** Promise-based picker (Dropbox/Google): opens its own popup/window. */
  open?: () => Promise<CloudPickResult[]>
  /** OneDrive signs in via MSAL, then browses Graph in MicrosoftBrowserDialog. */
  microsoft?: boolean
}

const PROVIDERS: ProviderConfig[] = [
  { key: "onedrive", i18nKey: "onedrive", microsoft: true },
  { key: "dropbox", i18nKey: "dropbox", open: openDropboxPicker },
  { key: "google_drive", i18nKey: "googleDrive", open: openGoogleDrivePicker },
  {
    key: "google_photos",
    i18nKey: "googlePhotos",
    open: openGooglePhotosPicker,
  },
]

export function CloudProviderCards() {
  const { t } = useTranslation()
  const addCloudItems = useStagingStore((state) => state.addCloudItems)
  const [pending, setPending] = useState<CloudProvider | null>(null)
  const [msToken, setMsToken] = useState<string | null>(null)

  useEffect(() => {
    // Preload the Dropbox Chooser so its popup opens straight from the click.
    if (cloudEnv.dropboxAppKey) {
      void loadScript("https://www.dropbox.com/static/api/2/dropins.js", {
        attrs: { id: "dropboxjs", "data-app-key": cloudEnv.dropboxAppKey },
      }).catch(() => undefined)
    }
  }, [])

  const reportError = (key: CloudProvider, error: unknown) => {
    if (error instanceof CloudPickerError && error.code === "cancelled") return
    if (isUserCancellation(error)) return
    console.error(`[cloud import: ${key}]`, error)
    if (error instanceof CloudPickerError && error.code === "not_configured") {
      toast.error(t("media.providers.notConfigured"))
      return
    }
    const detail =
      error instanceof Error && error.message ? ` (${error.message})` : ""
    toast.error(`${t("media.providers.pickError")}${detail}`)
  }

  // Dropbox / Google: a popup picker that resolves with the selection.
  const handlePicker = async (config: ProviderConfig): Promise<void> => {
    if (!config.open) return
    setPending(config.key)
    try {
      const results = await config.open()
      if (results.length > 0) {
        addCloudItems(results)
      }
    } catch (error) {
      reportError(config.key, error)
    } finally {
      setPending(null)
    }
  }

  // OneDrive: sign in (this click's one popup), then browse via Graph in a
  // dialog — no second popup; works for personal and work/school accounts.
  const handleMicrosoft = async (): Promise<void> => {
    setPending("onedrive")
    try {
      const token = await getGraphToken(GRAPH_SCOPES)
      setMsToken(token)
    } catch (error) {
      reportError("onedrive", error)
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-secondary text-xs font-medium">
        {t("media.providers.title")}
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {PROVIDERS.map((config) => {
          const Icon = PROVIDER_ICONS[config.key]
          const isPending = pending === config.key
          return (
            <button
              key={config.key}
              type="button"
              disabled={pending !== null}
              onClick={() => {
                if (config.microsoft) {
                  void handleMicrosoft()
                } else {
                  void handlePicker(config)
                }
              }}
              className={cn(
                mediaActionCardClassName,
                "border border-secondary bg-panel hover:border-brand/50 hover:bg-highlight/30",
              )}
            >
              <div className={mediaActionCardIconClassName}>
                {isPending ? (
                  <Loader2Icon className="text-brand size-4 animate-spin" />
                ) : (
                  <Icon className="size-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-primary">
                  {t(`media.providers.${config.i18nKey}.title`)}
                </p>
                <p className="line-clamp-2 text-xs text-secondary">
                  {t(`media.providers.${config.i18nKey}.hint`)}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {msToken ? (
        <MicrosoftBrowserDialog
          token={msToken}
          onClose={() => {
            setMsToken(null)
          }}
          onConfirm={(picks) => {
            if (picks.length > 0) {
              addCloudItems(picks)
            }
            setMsToken(null)
          }}
        />
      ) : null}
    </div>
  )
}
