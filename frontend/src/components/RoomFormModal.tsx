import { useState } from 'react';
import type { FormEvent } from 'react';
import { useDialogA11y } from '../hooks/useDialogA11y';
import { KNOWN_AMENITIES, KNOWN_QUIRKS, type RoomTraitOption } from '../constants/roomTraits';
import type { Room, RoomInput } from '../types';

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Existing values that match a known option become checkboxes; anything
 * else (a custom quirk/amenity from before this picker existed, or just a
 * one-off) rides along in the "other" free-text field. */
function partition(values: string[], known: RoomTraitOption[]): { checked: Set<string>; other: string } {
  const knownValues = new Set(known.map((option) => option.value));
  return {
    checked: new Set(values.filter((value) => knownValues.has(value))),
    other: values.filter((value) => !knownValues.has(value)).join(', '),
  };
}

function combine(checked: Set<string>, otherText: string): string[] {
  return [...checked, ...splitList(otherText)];
}

function toggle(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

function isImageUrl(value: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

interface PhotoPickerProps {
  photos: string[];
  onAdd: (url: string) => void;
  onRemove: (index: number) => void;
}

/** Free-text URLs, not a picker from a known list — there's no fixed set of
 * photos to choose from like there is for quirks/amenities. Validates
 * dynamically on Add rather than on submit, per entering-data.md. */
function PhotoPicker({ photos, onAdd, onRemove }: PhotoPickerProps) {
  const [draftUrl, setDraftUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    const trimmed = draftUrl.trim();
    if (!trimmed) return;
    if (!isImageUrl(trimmed)) {
      setError('Enter a valid URL starting with http:// or https://.');
      return;
    }
    onAdd(trimmed);
    setDraftUrl('');
    setError(null);
  }

  return (
    <fieldset className="photo-picker">
      <legend>Photos</legend>

      {photos.length > 0 && (
        <ul className="photo-list">
          {photos.map((url, index) => (
            <li key={`${url}-${index}`} className="photo-list-item">
              <img src={url} alt="" className="photo-thumb" />
              <button
                type="button"
                className="photo-remove"
                aria-label={`Remove photo ${index + 1}`}
                onClick={() => onRemove(index)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="photo-add-row">
        <input
          type="url"
          value={draftUrl}
          onChange={(e) => {
            setDraftUrl(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="https://images.example.com/room.jpg"
          aria-label="Photo URL"
        />
        <button type="button" className="link-button" onClick={handleAdd} disabled={!draftUrl.trim()}>
          Add
        </button>
      </div>

      {error && <p className="auth-error">{error}</p>}
    </fieldset>
  );
}

interface TraitPickerProps {
  legend: string;
  options: RoomTraitOption[];
  checked: Set<string>;
  onToggle: (value: string) => void;
  otherLabel: string;
  otherValue: string;
  onOtherChange: (value: string) => void;
  otherPlaceholder: string;
}

function TraitPicker({
  legend,
  options,
  checked,
  onToggle,
  otherLabel,
  otherValue,
  onOtherChange,
  otherPlaceholder,
}: TraitPickerProps) {
  return (
    <fieldset className="trait-picker">
      <legend>{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className="trait-checkbox">
          <input type="checkbox" checked={checked.has(option.value)} onChange={() => onToggle(option.value)} />
          {option.label}
          {option.visual && <span className="trait-hint"> — {option.visual}</span>}
        </label>
      ))}
      <label>
        {otherLabel}
        <input value={otherValue} onChange={(e) => onOtherChange(e.target.value)} placeholder={otherPlaceholder} />
      </label>
    </fieldset>
  );
}

interface RoomFormModalProps {
  room?: Room;
  onSave: (data: RoomInput) => void;
  onClose: () => void;
}

export function RoomFormModal({ room, onSave, onClose }: RoomFormModalProps) {
  const { ref, titleId } = useDialogA11y<HTMLFormElement>(onClose);
  const [name, setName] = useState(room?.name ?? '');
  const [nickname, setNickname] = useState(room?.nickname ?? '');
  const [capacity, setCapacity] = useState(room?.capacity.toString() ?? '4');

  const initialQuirks = partition(room?.quirks ?? [], KNOWN_QUIRKS);
  const [quirkChecks, setQuirkChecks] = useState(initialQuirks.checked);
  const [otherQuirks, setOtherQuirks] = useState(initialQuirks.other);

  const initialAmenities = partition(room?.amenities ?? [], KNOWN_AMENITIES);
  const [amenityChecks, setAmenityChecks] = useState(initialAmenities.checked);
  const [otherAmenities, setOtherAmenities] = useState(initialAmenities.other);

  const [photos, setPhotos] = useState<string[]>(room?.photos ?? []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !nickname.trim()) return;

    onSave({
      name: name.trim(),
      nickname: nickname.trim(),
      quirks: combine(quirkChecks, otherQuirks),
      capacity: Number(capacity),
      amenities: combine(amenityChecks, otherAmenities),
      photos,
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        ref={ref}
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 id={titleId}>{room ? 'Edit room' : 'New room'}</h2>

        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        <label>
          Nickname
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} required />
        </label>

        <label>
          Capacity
          <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} required />
        </label>

        <TraitPicker
          legend="Quirks"
          options={KNOWN_QUIRKS}
          checked={quirkChecks}
          onToggle={(value) => setQuirkChecks((prev) => toggle(prev, value))}
          otherLabel="Other quirks (comma-separated)"
          otherValue={otherQuirks}
          onOtherChange={setOtherQuirks}
          otherPlaceholder="Glass walls"
        />

        <TraitPicker
          legend="Amenities"
          options={KNOWN_AMENITIES}
          checked={amenityChecks}
          onToggle={(value) => setAmenityChecks((prev) => toggle(prev, value))}
          otherLabel="Other amenities (comma-separated)"
          otherValue={otherAmenities}
          onOtherChange={setOtherAmenities}
          otherPlaceholder="Standing desk"
        />

        <PhotoPicker
          photos={photos}
          onAdd={(url) => setPhotos((prev) => [...prev, url])}
          onRemove={(index) => setPhotos((prev) => prev.filter((_, i) => i !== index))}
        />

        <div className="modal-actions">
          <button type="button" className="link-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit">Save</button>
        </div>
      </form>
    </div>
  );
}
