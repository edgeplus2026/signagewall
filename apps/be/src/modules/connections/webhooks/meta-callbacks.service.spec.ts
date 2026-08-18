import { createHmac } from 'node:crypto';

import { MetaCallbacksService } from './meta-callbacks.service';
import { ConnectionProvider } from '../schemas/app-connection.schema';

const APP_SECRET = 'meta-app-secret';

/** Build a `signed_request` exactly the way Meta does. */
function signedRequest(
  payload: Record<string, unknown>,
  secret = APP_SECRET,
): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    'base64url',
  );
  const signature = createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');
  return `${signature}.${encodedPayload}`;
}

function buildService(
  options: {
    owners?: Array<{ organizationId: string; instanceId: string }>;
    secret?: string | undefined;
    disconnect?: jest.Mock;
  } = {},
) {
  const findOwnersByProviderAccount = jest
    .fn()
    .mockResolvedValue(options.owners ?? []);
  const connectionsService = { findOwnersByProviderAccount };
  const disconnect =
    options.disconnect ?? jest.fn().mockResolvedValue(undefined);
  const appInstancesService = { disconnect };
  const secret = 'secret' in options ? options.secret : APP_SECRET;
  const configService = {
    get: (key: string) =>
      key === 'meta.clientSecret'
        ? secret
        : key === 'publicApiUrl'
          ? 'https://api.signagewall.com'
          : key === 'apiPrefix'
            ? 'api'
            : undefined,
  };

  const service = new MetaCallbacksService(
    connectionsService as never,
    configService as never,
    appInstancesService as never,
  );
  return { service, findOwnersByProviderAccount, disconnect };
}

describe('MetaCallbacksService signed_request verification', () => {
  it('tears down every connection made with the deauthorized account', async () => {
    const owners = [
      { organizationId: 'org-1', instanceId: 'instance-1' },
      { organizationId: 'org-2', instanceId: 'instance-2' },
    ];
    const { service, findOwnersByProviderAccount, disconnect } = buildService({
      owners,
    });

    await service.handleDeauthorize(
      signedRequest({ algorithm: 'HMAC-SHA256', user_id: '61591354598487' }),
    );

    expect(findOwnersByProviderAccount).toHaveBeenCalledWith(
      ConnectionProvider.META,
      '61591354598487',
    );
    // Through disconnect(), not a raw delete: the owning instance must also lose
    // its config's connectionId or it renders an error on screen forever.
    expect(disconnect).toHaveBeenCalledTimes(2);
    expect(disconnect).toHaveBeenCalledWith('org-1', 'instance-1');
    expect(disconnect).toHaveBeenCalledWith('org-2', 'instance-2');
  });

  it('refuses a forged signature and deletes nothing', async () => {
    const { service, disconnect } = buildService({
      owners: [{ organizationId: 'org-1', instanceId: 'instance-1' }],
    });

    await expect(
      service.handleDeauthorize(
        signedRequest({ user_id: '999' }, 'not-the-app-secret'),
      ),
    ).rejects.toThrow();
    expect(disconnect).not.toHaveBeenCalled();
  });

  it('refuses a malformed signed_request', async () => {
    const { service, disconnect } = buildService();

    await expect(service.handleDeauthorize('garbage')).rejects.toThrow();
    await expect(service.handleDeauthorize('')).rejects.toThrow();
    expect(disconnect).not.toHaveBeenCalled();
  });

  it('refuses to act when the app secret is not configured', async () => {
    // Unverifiable is not the same as authentic: without the secret a stranger
    // could name any user id, so nothing may be deleted and nothing confirmed.
    const { service, disconnect } = buildService({ secret: undefined });

    await expect(
      service.handleDataDeletion(signedRequest({ user_id: '123' })),
    ).rejects.toThrow();
    expect(disconnect).not.toHaveBeenCalled();
  });

  it('refuses a payload claiming an algorithm it was not signed with', async () => {
    const { service, disconnect } = buildService();

    await expect(
      service.handleDeauthorize(
        signedRequest({ algorithm: 'RSA-SHA256', user_id: '123' }),
      ),
    ).rejects.toThrow();
    expect(disconnect).not.toHaveBeenCalled();
  });
});

describe('MetaCallbacksService data deletion receipt', () => {
  it('answers with a reachable status URL carrying the confirmation code', async () => {
    const { service } = buildService({
      owners: [{ organizationId: 'org-1', instanceId: 'instance-1' }],
    });

    const receipt = await service.handleDataDeletion(
      signedRequest({ user_id: '61591354598487' }),
    );

    expect(receipt.confirmationCode).toMatch(/^[0-9a-f]{24}$/);
    expect(receipt.url).toBe(
      'https://api.signagewall.com/api/v1/connections/meta/data-deletion' +
        `?code=${receipt.confirmationCode}`,
    );
  });

  it('still confirms when the account had nothing left to delete', async () => {
    // Meta retries and re-sends; a repeat request must not look like a failure.
    const { service, disconnect } = buildService({ owners: [] });

    const receipt = await service.handleDataDeletion(
      signedRequest({ user_id: '123' }),
    );

    expect(disconnect).not.toHaveBeenCalled();
    expect(receipt.confirmationCode).toHaveLength(24);
  });

  it('reports the same code for the same account, so a retry is idempotent', async () => {
    const { service } = buildService();

    const first = await service.handleDataDeletion(
      signedRequest({ user_id: '42' }),
    );
    const second = await service.handleDataDeletion(
      signedRequest({ user_id: '42' }),
    );
    const other = await service.handleDataDeletion(
      signedRequest({ user_id: '43' }),
    );

    expect(second.confirmationCode).toBe(first.confirmationCode);
    expect(other.confirmationCode).not.toBe(first.confirmationCode);
  });

  it('keeps going when one organization fails to disconnect', async () => {
    // An account that asked to be forgotten must not keep live tokens in the
    // orgs that came after the one that threw.
    const disconnect = jest
      .fn()
      .mockRejectedValueOnce(new Error('instance gone'))
      .mockResolvedValue(undefined);
    const { service } = buildService({
      owners: [
        { organizationId: 'org-1', instanceId: 'instance-1' },
        { organizationId: 'org-2', instanceId: 'instance-2' },
      ],
      disconnect,
    });

    await service.handleDeauthorize(signedRequest({ user_id: '7' }));

    expect(disconnect).toHaveBeenCalledTimes(2);
    expect(disconnect).toHaveBeenLastCalledWith('org-2', 'instance-2');
  });
});
