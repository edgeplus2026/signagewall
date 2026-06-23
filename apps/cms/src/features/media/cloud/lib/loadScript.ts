const cache = new Map<string, Promise<void>>()

interface LoadScriptOptions {
  /** Extra attributes, e.g. `{ id: "dropboxjs", "data-app-key": key }`. */
  attrs?: Record<string, string>
}

/**
 * Lazily injects a third-party `<script>` once and caches the promise so repeat
 * calls (e.g. clicking a provider button again) reuse the same load. Used to
 * keep provider SDKs out of the app bundle and off the boot path.
 */
export function loadScript(
  src: string,
  options: LoadScriptOptions = {},
): Promise<void> {
  const key = src + JSON.stringify(options.attrs ?? {})
  const existing = cache.get(key)
  if (existing) {
    return existing
  }

  const promise = new Promise<void>((resolve, reject) => {
    const el = document.createElement("script")
    el.src = src
    el.async = true
    for (const [name, value] of Object.entries(options.attrs ?? {})) {
      el.setAttribute(name, value)
    }
    el.addEventListener("load", () => {
      resolve()
    })
    el.addEventListener("error", () => {
      cache.delete(key) // allow a retry after a transient failure
      reject(new Error(`Failed to load script: ${src}`))
    })
    document.head.appendChild(el)
  })

  cache.set(key, promise)
  return promise
}

/** Loads a gapi module (e.g. "picker") after the gapi script has resolved. */
export function loadGapiModule(moduleName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!window.gapi) {
      reject(new Error("gapi is not available"))
      return
    }
    window.gapi.load(moduleName, () => {
      resolve()
    })
  })
}
