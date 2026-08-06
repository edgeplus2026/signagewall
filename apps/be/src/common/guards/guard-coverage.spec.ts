import 'reflect-metadata';

import { readdirSync, statSync } from 'fs';
import * as path from 'path';

import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Authorization regression net.
 *
 * The global JwtAuthGuard makes every route *authenticated*, but tenant and
 * admin scoping are convention: each controller opts in with
 * `@UseGuards(OrgMembershipGuard | SuperAdminGuard | PlayerTokenGuard)`. A new
 * controller that forgets the guard would ship an authenticated-but-unscoped
 * surface and nothing would catch it — this spec does. It sweeps every
 * `*.controller.ts` under `src/modules` via decorator metadata (no Nest app,
 * no DB). A route passes when it is authorization-guarded or explicitly
 * `@Public()` — the deliberate, reviewable opt-out that anonymous endpoints
 * (webhooks, OAuth redirects, public forms) already carry. Controllers whose
 * routes are deliberately plain-JWT (own-data only) go on the reviewed
 * allowlist below.
 */

const MODULES_DIR = path.resolve(__dirname, '../../modules');

/** Guards that scope a route beyond "any valid JWT". */
const AUTHORIZING_GUARDS = new Set([
  'OrgMembershipGuard',
  'SuperAdminGuard',
  'PlayerTokenGuard',
  'GoogleAuthGuard',
]);

/**
 * Controllers that are deliberately JWT-only or public. Adding a name here is
 * a reviewed decision: it asserts every route either operates strictly on the
 * authenticated user's own data or verifies its caller internally (webhook
 * secrets, single-use tokens, throttled public forms).
 */
const REVIEWED_JWT_ONLY_OR_PUBLIC = new Set([
  'AuthController', // public auth flows + own-session routes
  'HealthController', // public liveness probe
  'LegalController', // public documents + own acceptance state
  'WebhooksController', // Google push channels, verified via channel id/token
  'GraphWebhookController', // Microsoft Graph, verified via clientState
  'InvitationsController', // single-use invite-token accept/decline
  'NotificationsController', // own notifications/receipts only
  'PlansController', // own entitlement + own upgrade request
  'SettingsController', // own profile, password, export, feedback
]);

function findControllerFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...findControllerFiles(full));
    } else if (entry.endsWith('.controller.ts') && !entry.endsWith('.spec.ts')) {
      found.push(full);
    }
  }
  return found.sort();
}

type ClassLike = { name: string; prototype: Record<string, unknown> };

function guardNames(target: object): string[] {
  const guards: unknown[] =
    (Reflect.getMetadata(GUARDS_METADATA, target) as unknown[]) ?? [];
  return guards.map((guard) =>
    typeof guard === 'function'
      ? guard.name
      : ((guard as { constructor?: { name?: string } })?.constructor?.name ??
        'unknown'),
  );
}

/** Route handlers are the prototype methods that carry HTTP path metadata. */
function routeHandlers(cls: ClassLike): object[] {
  return Object.getOwnPropertyNames(cls.prototype)
    .filter((name) => name !== 'constructor')
    .map((name) => cls.prototype[name])
    .filter(
      (member): member is object =>
        typeof member === 'function' &&
        Reflect.getMetadata(PATH_METADATA, member) !== undefined,
    );
}

function controllersIn(file: string): ClassLike[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamic sweep over compiled-on-the-fly TS modules
  const mod = require(file) as Record<string, unknown>;
  return Object.values(mod).filter(
    (exported): exported is ClassLike =>
      typeof exported === 'function' &&
      Reflect.getMetadata(PATH_METADATA, exported) !== undefined,
  );
}

describe('guard coverage sweep', () => {
  const files = findControllerFiles(MODULES_DIR);

  it('sees the whole controller surface (catches a broken glob, not a shrunken app)', () => {
    expect(files.length).toBeGreaterThanOrEqual(25);
  });

  it('every route is authorization-guarded, @Public, or explicitly reviewed', () => {
    const offenders: string[] = [];

    for (const file of files) {
      for (const controller of controllersIn(file)) {
        if (REVIEWED_JWT_ONLY_OR_PUBLIC.has(controller.name)) {
          continue;
        }

        const classGuarded = guardNames(controller).some((name) =>
          AUTHORIZING_GUARDS.has(name),
        );
        if (classGuarded) {
          continue;
        }

        const uncovered = routeHandlers(controller).filter((handler) => {
          const routeGuarded = guardNames(handler).some((name) =>
            AUTHORIZING_GUARDS.has(name),
          );
          const routePublic =
            Reflect.getMetadata(IS_PUBLIC_KEY, handler) === true;
          return !routeGuarded && !routePublic;
        });

        if (uncovered.length > 0) {
          offenders.push(
            `${controller.name} (${path.relative(MODULES_DIR, file)}): ${uncovered.length} unscoped non-public route(s)`,
          );
        }
      }
    }

    // A name listed here means: add an authorization guard, mark the route
    // @Public on purpose, or allowlist the controller above with a reason.
    expect(offenders).toEqual([]);
  });

  it('allowlist holds no stale entries', () => {
    const seen = new Set(
      files.flatMap((file) => controllersIn(file).map((c) => c.name)),
    );
    const stale = [...REVIEWED_JWT_ONLY_OR_PUBLIC].filter(
      (name) => !seen.has(name),
    );
    expect(stale).toEqual([]);
  });
});
