/**
 * In-process domain event for in-app notifications. The service emits this via
 * `EventEmitter2` whenever the globally-visible set changes (publish / unpublish
 * / delete); the {@link CmsGateway} subscribes with `@OnEvent` and broadcasts a
 * payload-free `notifications:changed` to every authenticated `/cms` socket so
 * clients refetch their own unread count. This keeps the notifications module
 * fully decoupled from the websocket layer (it never imports the gateway).
 */
export const NotificationEvents = {
  /** The globally-visible notification set changed. */
  Changed: 'notification.changed',
} as const;

export interface NotificationChangedEvent {
  /** The notification that triggered the change, for logging/telemetry. */
  notificationId: string;
}
