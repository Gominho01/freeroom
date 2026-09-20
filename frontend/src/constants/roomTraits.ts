export interface RoomTraitOption {
  value: string;
  label: string;
  /** What it changes in the pixel-art room scene, if anything — shown as a hint next to the checkbox. */
  visual?: string;
}

export const KNOWN_AMENITIES: RoomTraitOption[] = [
  { value: 'projector', label: 'Projector', visual: 'renders a wall screen' },
  { value: 'tv', label: 'TV', visual: 'renders a wall screen' },
  { value: 'whiteboard', label: 'Whiteboard' },
  { value: 'video conferencing', label: 'Video conferencing' },
  { value: 'phone', label: 'Phone' },
];

export const KNOWN_QUIRKS: RoomTraitOption[] = [
  { value: 'Broken AC', label: 'Broken AC', visual: 'shows a broken AC unit' },
  { value: 'Weak Wi-Fi', label: 'Weak Wi-Fi' },
  { value: 'Squeaky door', label: 'Squeaky door' },
  { value: 'No natural light', label: 'No natural light' },
];
