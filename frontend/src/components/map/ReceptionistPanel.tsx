import type { Occupant, Room } from '../../types';

interface ReceptionistPanelProps {
  rooms: Room[];
  occupants: Record<string, Occupant | null>;
  onBook: (room: Room) => void;
  onMyBookings: () => void;
  onClose: () => void;
}

export function ReceptionistPanel({ rooms, occupants, onBook, onMyBookings, onClose }: ReceptionistPanelProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>"Welcome! Here's what's free right now."</h2>

        <ul className="receptionist-list">
          {rooms.map((room) => {
            const occupant = occupants[room.id];
            const isFree = occupant === null || occupant === undefined;
            return (
              <li key={room.id}>
                <div>
                  <p className="receptionist-room-name">{room.nickname}</p>
                  <p className={isFree ? 'receptionist-status-free' : 'receptionist-status-busy'}>
                    {isFree ? 'Free' : `With ${occupant.user.name} until ${new Date(occupant.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                </div>
                <button type="button" className="link-button" onClick={() => onBook(room)}>
                  Book
                </button>
              </li>
            );
          })}
        </ul>

        <div className="modal-actions">
          <button type="button" className="link-button" onClick={onMyBookings}>
            My bookings
          </button>
          <button type="button" className="link-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
