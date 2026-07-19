/**
 * Bridge between the NestJS DI world and the plain-object connector.
 *
 * Connectors (see connector-registry.ts) are stateless plain objects invoked by
 * the app-data scheduler with a `ctx` — they have no access to DI, so they can't
 * inject services. The PowerPoint connector, however, needs to rasterize a deck
 * and store slides in R2, both of which live behind injectable services.
 *
 * `PptxRenderService` (a Nest provider in MediaModule) registers itself here on
 * module init; the connector reads it back via {@link getPptxRenderer}. This is
 * a deliberate, single-purpose service locator — kept tiny and typed — rather
 * than widening the shared `ConnectorContext` contract with backend-only deps.
 */

export interface PptxRenderResult {
  /** R2 object keys of the rendered slides, in presentation order. */
  slideKeys: string[];
  /** Pixel dimensions of the first slide (for the player payload, optional). */
  width?: number;
  height?: number;
}

export interface PptxRenderer {
  /** Whether slide storage (R2) is configured; if not, rendering can't serve. */
  isConfigured(): boolean;
  /**
   * Fetch the deck as a PDF via Microsoft Graph, rasterize to WebP slides, and
   * upload them to R2 under `keyPrefix`. Returns the object keys in order.
   */
  render(params: {
    accessToken: string;
    driveId: string;
    itemId: string;
    /** R2 key prefix, e.g. `powerpoint/<hash>/<versionHash>`. */
    keyPrefix: string;
    signal?: AbortSignal;
  }): Promise<PptxRenderResult>;
  /** Public URL for a stored slide key (undefined when R2 is unconfigured). */
  publicUrl(key: string): string | undefined;
  /** Best-effort delete of previously-rendered slide objects. */
  deleteSlides(keys: string[]): Promise<void>;
}

let renderer: PptxRenderer | undefined;

export function setPptxRenderer(instance: PptxRenderer): void {
  renderer = instance;
}

export function getPptxRenderer(): PptxRenderer | undefined {
  return renderer;
}
