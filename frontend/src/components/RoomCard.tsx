import { useEffect, useState } from 'react';
import { RoomScene } from './RoomScene';
import { watchRoom } from '../services/socket';
import { useAuthStore } from '../store/auth';
import type { Occupant, Room } from '../types';

interface RoomCardProps {
  room: Room;
  isAdmin: boolean;
  onBook: (room: Room) => void;
  onEdit: (room: Room) => void;
  onDelete: (room: Room) => void;
  onViewPhotos: (room: Room) => void;
}

export function RoomCard({ room, isAdmin, onBook, onEdit, onDelete, onViewPhotos }: RoomCardProps) {
  const token = useAuthStore((s) => s.token)!;
  const [occupant, setOccupant] = useState<Occupant | null>(null);

  useEffect(() => {
    return watchRoom(token, room.id, (payload) => setOccupant(payload.occupant));
  }, [token, room.id]);

  return (
    <article className="room-card">
      <header className="room-card-header">
        <h2>{room.nickname}</h2>
        <span className="room-card-capacity">{room.capacity} seats</span>
      </header>

      <RoomScene
        occupant={occupant}
        quirks={room.quirks}
        amenities={room.amenities}
        capacity={room.capacity}
        photos={room.photos}
        onViewPhotos={() => onViewPhotos(room)}
      />

      <p className="room-card-name">{room.name}</p>

      {room.quirks.length > 0 && (
        <ul className="room-card-quirks">
          {room.quirks.map((quirk) => (
            <li key={quirk}>{quirk}</li>
          ))}
        </ul>
      )}

      {room.amenities.length > 0 && <p className="room-card-amenities">{room.amenities.join(' · ')}</p>}

      <div className="room-card-actions">
        <button type="button" className="link-button" onClick={() => onBook(room)}>
          Book
        </button>
        {isAdmin && (
          <>
            <button type="button" className="link-button" onClick={() => onEdit(room)}>
              Edit
            </button>
            <button type="button" className="link-button danger-link" onClick={() => onDelete(room)}>
              Delete
            </button>
          </>
        )}
      </div>
    </article>
  );
}
