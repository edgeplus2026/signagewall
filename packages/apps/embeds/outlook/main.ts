/**
 * Outlook Calendar reuses the Google Calendar renderer wholesale: the backend
 * `outlook` connector normalizes Microsoft Graph events to the shared
 * `GcalPayload`, and this app's config keys match gcal's, so the exact same
 * embed draws it. Importing gcal's entry runs its host handshake + render here.
 */
import '../gcal/main.js'
