import {
  DropboxIcon,
  GoogleDriveIcon,
  GooglePhotosIcon,
  type IconProps,
  OneDriveIcon,
  SharePointIcon,
} from "@/features/media/cloud/components/providerIcons"
import type { CloudProvider } from "@/features/media/cloud/types/cloudPick.types"

export const PROVIDER_ICONS: Record<
  CloudProvider,
  (props: IconProps) => React.ReactElement
> = {
  google_drive: GoogleDriveIcon,
  google_photos: GooglePhotosIcon,
  onedrive: OneDriveIcon,
  sharepoint: SharePointIcon,
  dropbox: DropboxIcon,
}
