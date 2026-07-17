import type { AppManifest } from '@edge/apps-contract'

const LIVE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="m10 11 5 3-5 3z" fill="currentColor" stroke="none"/><path d="M8 3l2 3M16 3l-2 3"/></svg>'

/**
 * Live channel — a `static` app that embeds a live Twitch or Kick channel from
 * just a channel name. Where the `stream` app plays a raw HLS (`.m3u8`) feed,
 * these platforms only expose their own iframe players, so this builds the right
 * embed URL per platform. Twitch's player requires a `parent` naming the host it
 * runs on; the bundle supplies the player's own hostname at runtime.
 *
 * Like YouTube/Stream it `requiresNetwork`, and the player is torn down while
 * off-screen and mounted on activation so a hidden slot never plays audio.
 */
export const livechannelManifest: AppManifest = {
  slug: 'livechannel',
  name: 'Live channel',
  tagline: 'Embed a live Twitch or Kick channel',
  description:
    'Show a live Twitch or Kick channel on your screens — just enter the channel name and it plays live.',
  runtimeKind: 'embed',
  dataSource: 'static',
  version: 1,
  requiresNetwork: true,
  icon: LIVE_ICON,
  color: '#9146FF',
  configSchema: [
    {
      key: 'platform',
      type: 'select',
      label: 'Platform',
      default: 'twitch',
      options: [
        { label: 'Twitch', value: 'twitch' },
        { label: 'Kick', value: 'kick' },
      ],
    },
    {
      key: 'channel',
      type: 'text',
      label: 'Channel',
      required: true,
      placeholder: 'shroud',
      help: 'The channel name — the last part of its address, e.g. twitch.tv/shroud or kick.com/xqc. You can paste the full link too.',
    },
    {
      key: 'audio',
      type: 'switch',
      label: 'Play audio',
      // Live channels autoplay muted (browsers block audible autoplay); say both.
      help: "Off by default. On to play the channel's sound — it still follows the screen's own volume.",
      default: false,
    },
  ],
}
