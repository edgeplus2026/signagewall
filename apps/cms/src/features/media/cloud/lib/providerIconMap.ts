import {
  DropboxIcon,
  GoogleDriveIcon,
  type IconProps,
  OneDriveIcon,
} from "@/features/media/cloud/components/providerIcons"
import type { CloudProvider } from "@/features/media/cloud/types/cloudPick.types"

export const PROVIDER_ICONS: Record<
  CloudProvider,
  (props: IconProps) => React.ReactElement
> = {
  google_drive: GoogleDriveIcon,
  onedrive: OneDriveIcon,
  dropbox: DropboxIcon,
}
