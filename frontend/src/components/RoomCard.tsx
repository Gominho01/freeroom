import type { Room } from '../types';

interface RoomCardProps {
  room: Room;
  isAdmin: boolean;
  onEdit: (room: Room) => void;
  onDelete: (room: Room) => void;
}

export function RoomCard({ room, isAdmin, onEdit, onDelete }: RoomCardProps) {
  return (
    <article className="room-card">
      <header className="room-card-header">
        <h2>{room.nickname}</h2>
        <span className="room-card-capacity">{room.capacity} seats</span>
      </header>

      <p className="room-card-name">{room.name}</p>

      {room.quirks.length > 0 && (
        <ul className="room-card-quirks">
          {room.quirks.map((quirk) => (
            <li key={quirk}>{quirk}</li>
          ))}
        </ul>
      )}

      {room.amenities.length > 0 && <p className="room-card-amenities">{room.amenities.join(' · ')}</p>}

      {isAdmin && (
        <div className="room-card-actions">
          <button type="button" className="link-button" onClick={() => onEdit(room)}>
            Edit
          </button>
          <button type="button" className="link-button danger-link" onClick={() => onDelete(room)}>
            Delete
          </button>
        </div>
      )}
    </article>
  );
}
