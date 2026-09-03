import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Room, RoomInput } from '../types';

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

interface RoomFormModalProps {
  room?: Room;
  onSave: (data: RoomInput) => void;
  onClose: () => void;
}

export function RoomFormModal({ room, onSave, onClose }: RoomFormModalProps) {
  const [name, setName] = useState(room?.name ?? '');
  const [nickname, setNickname] = useState(room?.nickname ?? '');
  const [quirks, setQuirks] = useState(room?.quirks.join(', ') ?? '');
  const [capacity, setCapacity] = useState(room?.capacity.toString() ?? '4');
  const [amenities, setAmenities] = useState(room?.amenities.join(', ') ?? '');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !nickname.trim()) return;

    onSave({
      name: name.trim(),
      nickname: nickname.trim(),
      quirks: splitList(quirks),
      capacity: Number(capacity),
      amenities: splitList(amenities),
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal-content" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>{room ? 'Edit room' : 'New room'}</h2>

        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        <label>
          Nickname
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} required />
        </label>

        <label>
          Quirks (comma-separated)
          <input value={quirks} onChange={(e) => setQuirks(e.target.value)} placeholder="Broken AC, Weak Wi-Fi" />
        </label>

        <label>
          Capacity
          <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} required />
        </label>

        <label>
          Amenities (comma-separated)
          <input value={amenities} onChange={(e) => setAmenities(e.target.value)} placeholder="projector, tv" />
        </label>

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
