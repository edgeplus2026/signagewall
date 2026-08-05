export type NormalizedOpsBoardStatus =
  | 'neutral'
  | 'planned'
  | 'active'
  | 'warning'
  | 'blocked'
  | 'done';

const STATUS_ALIASES: Record<NormalizedOpsBoardStatus, readonly string[]> = {
  neutral: [
    'neutral',
    'unknown',
    'none',
    'n/a',
    'na',
    '-',
    'nepoznato',
    'непознато',
  ],
  planned: [
    'planned',
    'plan',
    'scheduled',
    'queued',
    'planirano',
    'zakazano',
    'планирано',
    'заказано',
    'geplant',
  ],
  active: [
    'active',
    'in progress',
    'in-progress',
    'running',
    'underway',
    'open',
    'aktivno',
    'u toku',
    'активно',
    'у току',
    'aktiv',
  ],
  warning: [
    'warning',
    'attention',
    'at risk',
    'at-risk',
    'delayed',
    'late',
    'upozorenje',
    'paznja',
    'kasnjenje',
    'kasni',
    'упозорење',
    'пажња',
    'касни',
    'warnung',
    'verspatet',
  ],
  blocked: [
    'blocked',
    'stopped',
    'cancelled',
    'canceled',
    'on hold',
    'problem',
    'blokirano',
    'zaustavljeno',
    'otkazano',
    'блокирано',
    'заустављено',
    'отказано',
    'blockiert',
    'gestoppt',
  ],
  done: [
    'done',
    'complete',
    'completed',
    'finished',
    'closed',
    'delivered',
    'zavrseno',
    'gotovo',
    'isporuceno',
    'завршено',
    'готово',
    'испоручено',
    'erledigt',
    'fertig',
  ],
};

function comparableStatus(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[_/]+/g, ' ')
    .replace(/\s+/g, ' ');
}

const STATUS_BY_ALIAS = new Map<string, NormalizedOpsBoardStatus>();
for (const [status, aliases] of Object.entries(STATUS_ALIASES) as Array<
  [NormalizedOpsBoardStatus, readonly string[]]
>) {
  for (const alias of aliases)
    STATUS_BY_ALIAS.set(comparableStatus(alias), status);
}

/** Blank and unrecognized source values are deliberately non-fatal. */
export function normalizeOpsBoardStatus(
  value: unknown,
): NormalizedOpsBoardStatus {
  if (typeof value !== 'string') return 'neutral';
  return STATUS_BY_ALIAS.get(comparableStatus(value)) ?? 'neutral';
}
