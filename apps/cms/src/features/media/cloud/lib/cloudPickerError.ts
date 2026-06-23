export type CloudPickerErrorCode =
  | "not_configured" // missing VITE_* credentials for this provider
  | "cancelled" // user dismissed the picker (handle silently)
  | "signed_in_retry" // just signed in; ask the user to click again to browse
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
