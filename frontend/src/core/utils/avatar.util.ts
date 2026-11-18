/**
 * Resolves avatar identifier/path from profiles table or selection to an accessible URL.
 * Handles database defaults ('guest_avatar'), asset folder images, and full external URLs.
 */
export function resolveAvatarUrl(rawUrl?: string | null): string {
  if (!rawUrl) {
    return '/avatar/avatar.jpeg';
  }
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return '/avatar/avatar.jpeg';
  }
  // Database column default: 'guest_avatar'
  if (
    trimmed === 'guest_avatar' ||
    trimmed === 'guest_avatar.webp' ||
    trimmed === '/avatar/guest_avatar.webp' ||
    trimmed === '/assets/avatar/guest_avatar.webp' ||
    trimmed === 'assets/avatar/guest_avatar.webp'
  ) {
    return '/avatar/guest_avatar.webp';
  }
  // Cool donkey avatar
  if (
    trimmed === 'avatar' ||
    trimmed === 'avatar.jpeg' ||
    trimmed === '/avatar/avatar.jpeg' ||
    trimmed === '/assets/avatar/avatar.jpeg' ||
    trimmed === 'assets/avatar/avatar.jpeg'
  ) {
    return '/avatar/avatar.jpeg';
  }
  // External URLs (e.g. Google profile pictures)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  // Absolute paths
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  // Relative asset/avatar paths
  if (trimmed.startsWith('assets/') || trimmed.startsWith('avatar/')) {
    return `/${trimmed}`;
  }
  return `/avatar/${trimmed}`;
}
