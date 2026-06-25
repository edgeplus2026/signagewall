export type CloudPickerErrorCode =
  | "not_configured" // missing VITE_* credentials for this provider
  | "cancelled" // user dismissed the picker (handle silently)
  | "failed" // SDK/auth/network failure

export class CloudPickerError extends Error {
  constructor(
    readonly code: CloudPickerErrorCode,
    message?: string,
  ) {
    super(message ?? code)
    this.name = "CloudPickerError"
  }
}
