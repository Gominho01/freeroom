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

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !nickname.trim()) return;

    onSave({
      name: name.trim(),
      nickname: nickname.trim(),
      quirks: combine(quirkChecks, otherQuirks),
      capacity: Number(capacity),
      amenities: combine(amenityChecks, otherAmenities),
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
