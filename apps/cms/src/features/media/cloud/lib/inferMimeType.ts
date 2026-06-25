/** Best-effort MIME type from a file name, for providers that omit it. */
export function inferMimeType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase()
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg"
    case "png":
      return "image/png"
    case "webp":
      return "image/webp"
    case "gif":
      return "image/gif"
    case "mp4":
      return "video/mp4"
    case "webm":
      return "video/webm"
    case "mov":
      return "video/quicktime"
    default:
      return "application/octet-stream"
  }
}
