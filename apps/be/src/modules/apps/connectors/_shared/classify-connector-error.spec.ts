import { ConnectorError } from '@signagewall/apps-contract';

import {
  classifyConnectorError,
  classifyConnectorMessage,
} from './classify-connector-error';

describe('classifyConnectorError', () => {
  it('honors a typed ConnectorError above all heuristics', () => {
    const error = new ConnectorError(
      'capacity_required',
      'export needs a capacity-backed workspace (403)',
    );
    // The message alone would classify as permission_denied; the code wins.
    expect(classifyConnectorError(error)).toBe('capacity_required');
  });

  it('maps an aborted fetch to timeout', () => {
    const abort = new Error('The operation was aborted');
    abort.name = 'AbortError';
    expect(classifyConnectorError(abort)).toBe('timeout');
  });

  it('maps HTTP statuses carried on common error shapes', () => {
    expect(classifyConnectorError({ status: 401 })).toBe('auth_expired');
    expect(classifyConnectorError({ statusCode: 403 })).toBe(
      'permission_denied',
    );
    expect(classifyConnectorError({ response: { status: 404 } })).toBe(
      'not_found',
    );
    expect(classifyConnectorError({ status: 429 })).toBe('throttled');
    expect(classifyConnectorError({ status: 504 })).toBe('timeout');
    expect(classifyConnectorError({ status: 500 })).toBe('upstream_error');
  });

  it('falls back to message classification for plain errors', () => {
    // The codebase's fetch helpers embed the status in the message.
    expect(
      classifyConnectorError(new Error('graph workbook upstream 403')),
    ).toBe('permission_denied');
    expect(classifyConnectorError(new Error('sheet upstream 401'))).toBe(
      'auth_expired',
    );
    expect(classifyConnectorError(new Error('something odd'))).toBe(
      'upstream_error',
    );
    expect(classifyConnectorError('not even an Error')).toBe('upstream_error');
  });
});

describe('classifyConnectorMessage', () => {
  it('names the common provider failures', () => {
    expect(classifyConnectorMessage('token expired, invalid_grant')).toBe(
      'auth_expired',
    );
    expect(classifyConnectorMessage('admin consent required')).toBe(
      'consent_required',
    );
    expect(classifyConnectorMessage('export requires capacity')).toBe(
      'capacity_required',
    );
    expect(classifyConnectorMessage('429 too many requests')).toBe('throttled');
    expect(classifyConnectorMessage('request timed out')).toBe('timeout');
    expect(classifyConnectorMessage('boom')).toBe('upstream_error');
  });
});
