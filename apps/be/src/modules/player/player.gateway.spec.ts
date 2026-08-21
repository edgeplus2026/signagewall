import { Logger } from '@nestjs/common';
import type { Socket } from 'socket.io';

import { PlayerSocketEvents } from '@signagewall/player-contract';

import { PlayerGateway } from './player.gateway';

describe('PlayerGateway — one identity, one live session', () => {
  let gateway: PlayerGateway;
  let handleConnect: jest.Mock;
  let roomSockets: { id: string }[];
  let fetchSockets: jest.Mock;
  let emitToOthers: jest.Mock;
  let disconnectSockets: jest.Mock;

  const NEW_SOCKET = 'socket-new';

  function client(auth: Record<string, unknown>): Socket {
    return {
      id: NEW_SOCKET,
      handshake: { auth },
      data: {},
      join: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
      disconnect: jest.fn(),
    } as unknown as Socket;
  }

  const paired = {
    kind: 'paired',
    displacedPreviousHolder: false,
    screenId: 'screen-1',
    organizationId: 'org-1',
    volume: 100,
    settings: {},
    snapshot: { revision: 7 },
  };

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    roomSockets = [{ id: NEW_SOCKET }];
    fetchSockets = jest.fn(() => Promise.resolve(roomSockets));
    emitToOthers = jest.fn();
    disconnectSockets = jest.fn();
    handleConnect = jest.fn();

    gateway = new PlayerGateway(
      { handleConnect } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    (gateway as unknown as { server: unknown }).server = {
      in: jest.fn(() => ({
        fetchSockets,
        except: jest.fn(() => ({ disconnectSockets })),
      })),
      to: jest.fn(() => ({
        except: jest.fn(() => ({ emit: emitToOthers })),
      })),
    };
  });

  afterEach(() => jest.restoreAllMocks());

  it('displaces a session that was already live for this device', async () => {
    roomSockets = [{ id: 'socket-old' }, { id: NEW_SOCKET }];
    handleConnect.mockResolvedValue(paired);

    await gateway.handleConnection(client({ deviceId: 'dev-1', token: 't' }));

    expect(disconnectSockets).toHaveBeenCalledWith(true);
    expect(emitToOthers).toHaveBeenCalledWith(PlayerSocketEvents.Displaced);
    // Never `Revoked`: the displaced holder's token is still valid, and a revoke
    // would wipe a working screen's identity, snapshot and cached media.
    expect(emitToOthers).not.toHaveBeenCalledWith(PlayerSocketEvents.Revoked);
  });

  it('leaves a lone session alone', async () => {
    handleConnect.mockResolvedValue(paired);

    await gateway.handleConnection(client({ deviceId: 'dev-1', token: 't' }));

    expect(disconnectSockets).not.toHaveBeenCalled();
    expect(emitToOthers).not.toHaveBeenCalled();
  });

  it('does NOT let an unpaired connection displace anyone', async () => {
    // A bare `deviceId` is not a credential. If it displaced sessions, anyone
    // who learned one could knock the real screen off its socket at will.
    roomSockets = [{ id: 'socket-old' }, { id: NEW_SOCKET }];
    handleConnect.mockResolvedValue({
      kind: 'unpaired',
      code: 'ABC-D29',
      expiresAt: new Date(),
    });

    await gateway.handleConnection(client({ deviceId: 'dev-1' }));

    expect(disconnectSockets).not.toHaveBeenCalled();
  });

  it('admits the device even if the room cannot be enumerated', async () => {
    // Best-effort: a Redis blip must not keep a legitimate screen off the air.
    fetchSockets.mockRejectedValue(new Error('adapter down'));
    handleConnect.mockResolvedValue(paired);

    const socket = client({ deviceId: 'dev-1', token: 't' });
    await gateway.handleConnection(socket);

    expect(socket.emit).toHaveBeenCalledWith(
      PlayerSocketEvents.Paired,
      expect.objectContaining({ screenId: 'screen-1' }),
    );
    expect(socket.disconnect).not.toHaveBeenCalled();
  });
});
