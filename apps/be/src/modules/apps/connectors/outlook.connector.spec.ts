import { outlookConnector } from './outlook.connector';

describe('outlookConnector.webhookResource', () => {
  it('watches the picked calendar event collection for create/update/delete', () => {
    expect(
      outlookConnector.webhookResource!({
        connectionId: 'conn-1',
        calendar: { id: 'AAMk=', label: 'Team' },
      }),
    ).toEqual({
      provider: 'microsoft',
      graphResource: '/me/calendars/AAMk%3D/events',
      changeType: 'created,updated,deleted',
    });
  });

  it('accepts a bare string calendar id and url-encodes it', () => {
    expect(outlookConnector.webhookResource!({ calendar: 'a/b+c' })).toEqual({
      provider: 'microsoft',
      graphResource: '/me/calendars/a%2Fb%2Bc/events',
      changeType: 'created,updated,deleted',
    });
  });

  it('falls back to the default calendar when none is picked', () => {
    expect(
      outlookConnector.webhookResource!({ connectionId: 'conn-1' }),
    ).toEqual({
      provider: 'microsoft',
      graphResource: '/me/events',
      changeType: 'created,updated,deleted',
    });
  });
});
