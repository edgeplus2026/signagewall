#!/usr/bin/env bash
#
# Bump the native shell version and create the release tag that drives the
# `player-release` CI workflow. The tag is the source of truth — CI re-stamps
# tauri.conf.json from it — so this helper just keeps the committed files honest
# and cuts the tag for you.
#
# Usage: apps/player/scripts/release/bump.sh 0.2.0
set -euo pipefail

version="${1:-}"
if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "usage: bump.sh <x.y.z>   (e.g. bump.sh 0.2.0)" >&2
  exit 1
fi

root="$(cd "$(dirname "$0")/../../../.." && pwd)"
conf="$root/apps/player/src-tauri/tauri.conf.json"
cargo="$root/apps/player/src-tauri/Cargo.toml"
tag="player-v$version"

if git -C "$root" rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
  echo "tag $tag already exists" >&2
  exit 1
fi

# tauri.conf.json is authoritative for the app/updater version.
jq --arg v "$version" '.version = $v' "$conf" > "$conf.tmp" && mv "$conf.tmp" "$conf"

# Keep the crate metadata in sync. Anchored to the start of a line so it can only
# ever match `[package].version` — an unanchored match would happily rewrite
# `rust-version = "..."` or a dependency's version if the manifest were reordered.
perl -pi -e 'if (!$done && s/^version = "[^"]*"/version = "'"$version"'"/) { $done = 1 }' "$cargo"
if ! grep -q "^version = \"$version\"" "$cargo"; then
  echo "failed to stamp [package].version in $cargo" >&2
  exit 1
fi

git -C "$root" add "$conf" "$cargo"
git -C "$root" commit -m "chore(player): release v$version"
git -C "$root" tag "$tag"

echo "Committed and tagged $tag."
echo "Push to trigger the release:  git push && git push origin $tag"
