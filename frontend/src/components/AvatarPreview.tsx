import { avatarUrl } from '../services/avatar';

export function AvatarPreview({ seed, size = 64 }: { seed: string; size?: number }) {
  if (!seed.trim()) {
    return (
      <div
        className="avatar-preview avatar-preview-empty"
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    );
  }

  return (
    <img
      src={avatarUrl(seed)}
      alt={`Avatar preview for "${seed}"`}
      className="avatar-preview"
      width={size}
      height={size}
    />
  );
}
