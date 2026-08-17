import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection, Types } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from './../src/app.module';

/**
 * Tenancy and auth-lifecycle regression pack (audit item BE-5b).
 *
 * The unit suites prove each guard and service in isolation; this pack proves
 * the assembled application: real routes, real guards in their registered
 * order, real persistence. Every scenario is an attack or a lifecycle edge:
 * cross-org reads and writes, org-header forgery, role ceilings, token
 * rotation, lockout, and plan limits.
 *
 * Two deliberate shortcuts, both data-plane rather than code-plane: email
 * verification is flipped directly in Mongo (the token only travels by mail),
 * and the viewer membership is seeded directly (the invite token likewise
 * only travels by mail). Neither bypasses any code under test here.
 */
describe('tenancy & auth lifecycle (e2e)', () => {
  let app: INestApplication<App>;
  let db: Connection;

  interface Session {
    userId: string;
    accessToken: string;
    refreshToken: string;
  }

  const PASSWORD = 'correct-horse-battery';
  let adminA: Session;
  let adminB: Session;
  let orgA: string;
  let orgB: string;

  const api = () => request(app.getHttpServer());

  const email = (tag: string) => `${tag}-${Date.now()}@tenancy.test`;

  async function register(userEmail: string): Promise<void> {
    await api()
      .post('/api/v1/auth/register')
      .send({
        name: 'E2E User',
        email: userEmail,
        phone: '+381600000000',
        password: PASSWORD,
        acceptedLegal: true,
      })
      .expect(201);
  }

  /** Standard sign-up withholds tokens until the email is verified. */
  async function verifyEmail(userEmail: string): Promise<void> {
    await db
      .collection('users')
      .updateOne({ email: userEmail }, { $set: { isEmailVerified: true } });
  }

  async function login(userEmail: string, password = PASSWORD) {
    return api()
      .post('/api/v1/auth/login')
      .send({ email: userEmail, password });
  }

  async function signUp(tag: string): Promise<Session & { email: string }> {
    const userEmail = email(tag);
    await register(userEmail);
    await verifyEmail(userEmail);
    const res = await login(userEmail);
    expect(res.status).toBe(201);
    const { user, tokens } = res.body.data as {
      user: { id: string };
      tokens: { accessToken: string; refreshToken: string };
    };
    return {
      email: userEmail,
      userId: user.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async function createOrg(session: Session, name: string): Promise<string> {
    const res = await api()
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ name });
    expect(res.status).toBe(201);
    return (res.body.data as { id: string }).id;
  }

  /** Request builder scoped as `session` acting inside `organizationId`. */
  function as(session: Session, organizationId: string) {
    const withScope = (req: request.Test) =>
      req
        .set('Authorization', `Bearer ${session.accessToken}`)
        .set('x-organization-id', organizationId);
    return {
      get: (url: string) => withScope(api().get(url)),
      post: (url: string) => withScope(api().post(url)),
      patch: (url: string) => withScope(api().patch(url)),
      delete: (url: string) => withScope(api().delete(url)),
    };
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Mirror main.ts: prefix + URI versioning + the same validation pipe, so
    // routes and rejection behavior match production exactly.
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    db = app.get<Connection>(getConnectionToken());

    adminA = await signUp('admin-a');
    adminB = await signUp('admin-b');
    orgA = await createOrg(adminA, 'Org A');
    orgB = await createOrg(adminB, 'Org B');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('org scoping fundamentals', () => {
    it('rejects an org-scoped route without the org header', async () => {
      const res = await api()
        .get('/api/v1/screens')
        .set('Authorization', `Bearer ${adminA.accessToken}`);
      expect(res.status).toBe(401);
    });

    it('rejects a member of another org presenting a foreign org id', async () => {
      const res = await as(adminB, orgA).get('/api/v1/screens');
      expect(res.status).toBe(403);
    });

    it('rejects a forged org id that belongs to nobody', async () => {
      const ghost = new Types.ObjectId().toString();
      const res = await as(adminA, ghost).get('/api/v1/screens');
      expect(res.status).toBe(403);
    });
  });

  describe('cross-org resource isolation', () => {
    let screenA: string;
    let playlistA: string;

    beforeAll(async () => {
      const screenRes = await as(adminA, orgA)
        .post('/api/v1/screens')
        .send({ name: 'Lobby A' });
      expect(screenRes.status).toBe(201);
      screenA = (screenRes.body.data as { id: string }).id;

      const playlistRes = await as(adminA, orgA)
        .post('/api/v1/playlists')
        .send({ name: 'Playlist A' });
      expect(playlistRes.status).toBe(201);
      playlistA = (playlistRes.body.data as { id: string }).id;
    });

    it('hides org A screens from an org B read', async () => {
      const list = await as(adminB, orgB).get('/api/v1/screens');
      expect(list.status).toBe(200);
      const ids = (list.body.data as { id: string }[]).map((s) => s.id);
      expect(ids).not.toContain(screenA);

      await as(adminB, orgB).get(`/api/v1/screens/${screenA}`).expect(404);
    });

    it('blocks cross-org screen mutation and deletion', async () => {
      await as(adminB, orgB)
        .patch(`/api/v1/screens/${screenA}`)
        .send({ name: 'hijacked' })
        .expect(404);

      // Bulk delete silently skips foreign ids — the screen must survive.
      await as(adminB, orgB)
        .post('/api/v1/screens/delete')
        .send({ ids: [screenA] });
      const survived = await as(adminA, orgA).get(`/api/v1/screens/${screenA}`);
      expect(survived.status).toBe(200);
      expect((survived.body.data as { name: string }).name).toBe('Lobby A');
    });

    it('hides org A playlists from org B', async () => {
      await as(adminB, orgB)
        .get(`/api/v1/playlists/${playlistA}/items`)
        .expect(404);
    });

    it('refuses to mint a device recovery link across orgs', async () => {
      // Scoped lookup: org B simply cannot see org A's screen.
      const foreignScope = await as(adminB, orgB).post(
        `/api/v1/screens/${screenA}/device/recovery-link`,
      );
      expect(foreignScope.status).toBe(404);

      // Header forgery: org B naming org A directly fails on membership.
      const forgedHeader = await as(adminB, orgA).post(
        `/api/v1/screens/${screenA}/device/recovery-link`,
      );
      expect(forgedHeader.status).toBe(403);
    });

    it('blocks a non-member from updating the organization itself', async () => {
      const res = await api()
        .patch(`/api/v1/organizations/${orgA}`)
        .set('Authorization', `Bearer ${adminB.accessToken}`)
        .send({ name: 'Owned' });
      expect(res.status).toBe(403);
    });
  });

  describe('viewer role is read-only', () => {
    let viewer: Session;

    beforeAll(async () => {
      viewer = await signUp('viewer-a');
      // Seed the membership directly: the invite token only travels by email.
      // Role enforcement — the code under test — still runs on every request.
      await db.collection('organizationmemberships').insertOne({
        userId: new Types.ObjectId(viewer.userId),
        organizationId: new Types.ObjectId(orgA),
        role: 'viewer',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('lets a viewer read org content', async () => {
      await as(viewer, orgA).get('/api/v1/screens').expect(200);
    });

    it('blocks a viewer from any write on the content surface', async () => {
      const res = await as(viewer, orgA)
        .post('/api/v1/screens')
        .send({ name: 'viewer-made' });
      expect(res.status).toBe(403);
    });

    it('blocks a viewer from admin-only org settings', async () => {
      const res = await api()
        .patch(`/api/v1/organizations/${orgA}`)
        .set('Authorization', `Bearer ${viewer.accessToken}`)
        .send({ name: 'viewer-renamed' });
      expect(res.status).toBe(403);
    });
  });

  describe('plan limits fail closed', () => {
    it('rejects screen creation beyond the free limit', async () => {
      // signUp/createOrg minted no sponsorship, so FREE_SCREEN_LIMIT (1)
      // applies — and "Lobby A" already used it.
      const res = await as(adminA, orgA)
        .post('/api/v1/screens')
        .send({ name: 'One Too Many' });
      expect(res.status).toBe(403);

      const list = await as(adminA, orgA).get('/api/v1/screens');
      expect((list.body.data as unknown[]).length).toBe(1);
    });
  });

  describe('auth lifecycle', () => {
    it('withholds tokens until the email is verified', async () => {
      const userEmail = email('unverified');
      await register(userEmail);
      const res = await login(userEmail);
      expect(res.status).toBe(403);
    });

    it('rotates the refresh token and invalidates the one it replaced', async () => {
      const user = await signUp('rotation');

      // The refresh JWT's only variable claims are iat/exp in whole seconds:
      // refreshing within the same second as login would mint a byte-identical
      // token and make rotation unobservable. Step past the second boundary.
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const refreshed = await api()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: user.refreshToken });
      expect(refreshed.status).toBe(201);
      const next = refreshed.body.data as { refreshToken: string };
      expect(next.refreshToken).not.toBe(user.refreshToken);

      // The redeemed token must be dead: replaying a stolen-but-stale refresh
      // token is exactly the attack rotation exists to stop.
      await api()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: user.refreshToken })
        .expect(401);

      await api()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: next.refreshToken })
        .expect(201);
    });

    it('invalidates the refresh token on password change', async () => {
      const user = await signUp('pw-change');
      const newPassword = 'battery-staple-horse';

      await api()
        .post('/api/v1/settings/change-password')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          currentPassword: PASSWORD,
          password: newPassword,
          confirmPassword: newPassword,
        })
        .expect(201);

      await api()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: user.refreshToken })
        .expect(401);

      const relogin = await login(user.email, newPassword);
      expect(relogin.status).toBe(201);
    });

    it('locks the account after repeated failed logins — even for the right password', async () => {
      const user = await signUp('lockout');

      // Wrong passwords are 401 until the counter trips the lock, 429 after.
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await login(user.email, 'wrong-password').then((res) => {
          expect([401, 429]).toContain(res.status);
        });
      }

      const lockedOut = await login(user.email);
      expect(lockedOut.status).toBe(429);
    });
  });
});
