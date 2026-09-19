/**
 * Curated (not free-form) profile avatars — each key maps to a bundled
 * cartoon illustration shipped in the frontend app (assets/avatars/), the
 * same way category icons are a key the frontend maps to a Flutter
 * IconData. The backend only ever stores/validates the key string, never
 * an image — no upload/storage/moderation surface at all. Mirrored in
 * frontend/lib/core/constants/avatar_presets.dart — keep both in sync if
 * this set ever changes.
 */
const AVATAR_KEYS = [
  'avatar_01', 'avatar_02', 'avatar_03', 'avatar_04',
  'avatar_05', 'avatar_06', 'avatar_07', 'avatar_08',
  'avatar_09', 'avatar_10', 'avatar_11', 'avatar_12',
];

export { AVATAR_KEYS };
