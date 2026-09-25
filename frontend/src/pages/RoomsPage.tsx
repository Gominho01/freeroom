import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { AvatarPreview } from '../components/AvatarPreview';
import { BookingCalendarModal } from '../components/BookingCalendarModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LeaderboardModal } from '../components/LeaderboardModal';
import { WorldMap } from '../components/map/WorldMap';
import { MyBookingsModal } from '../components/MyBookingsModal';
import { NotificationsBell } from '../components/NotificationsBell';
import { OccupancyDashboardModal } from '../components/OccupancyDashboardModal';
import { RoomCard } from '../components/RoomCard';
import { RoomFormModal } from '../components/RoomFormModal';
import { RoomGalleryModal } from '../components/RoomGalleryModal';
import { createRoom, deleteRoom, listRooms, updateRoom } from '../services/rooms';
import { useAuthStore } from '../store/auth';
import type { Room, RoomInput } from '../types';

export function RoomsPage() {
  const token = useAuthStore((s) => s.token)!;
  const user = useAuthStore((s) => s.user)!;
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = user.role === 'ADMIN';

  const queryClient = useQueryClient();
  const [modalState, setModalState] = useState<{ room?: Room } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Room | null>(null);
  const [bookingRoom, setBookingRoom] = useState<Room | null>(null);
  const [galleryRoom, setGalleryRoom] = useState<Room | null>(null);
  const [showMyBookings, setShowMyBookings] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showOccupancy, setShowOccupancy] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const roomsQuery = useQuery({
    queryKey: ['rooms'],
    queryFn: () => listRooms(token),
  });

  function invalidateRooms() {
    queryClient.invalidateQueries({ queryKey: ['rooms'] });
  }

  const createMutation = useMutation({
    mutationFn: (data: RoomInput) => createRoom(token, data),
    onSuccess: invalidateRooms,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: RoomInput }) => updateRoom(token, id, data),
    onSuccess: invalidateRooms,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRoom(token, id),
    onSuccess: invalidateRooms,
  });

  function handleSave(data: RoomInput) {
    if (modalState?.room) {
      updateMutation.mutate({ id: modalState.room.id, data });
    } else {
      createMutation.mutate(data);
    }
    setModalState(null);
  }

  function handleConfirmDelete() {
    if (!pendingDelete) return;
    deleteMutation.mutate(pendingDelete.id);
    setPendingDelete(null);
  }

  return (
    <div className="rooms-page">
      <header className="rooms-header">
        <div className="rooms-header-user">
          <AvatarPreview seed={user.avatarSeed} size={40} />
          <span>{user.name}</span>
        </div>
        <div className="rooms-header-actions">
          <NotificationsBell />
          <button type="button" className="link-button" onClick={() => setShowMyBookings(true)}>
            My bookings
          </button>
          <button type="button" className="link-button" onClick={() => setShowLeaderboard(true)}>
            Leaderboard
          </button>
          <button type="button" className="link-button" onClick={() => setShowMap((v) => !v)}>
            {showMap ? 'List view' : 'Map view'}
          </button>
          {isAdmin && (
            <button type="button" className="link-button" onClick={() => setShowOccupancy(true)}>
              Occupancy dashboard
            </button>
          )}
          <button type="button" className="link-button" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      {roomsQuery.isLoading && <p className="rooms-status">Loading rooms…</p>}
      {roomsQuery.isError && <p className="rooms-status">Failed to load rooms.</p>}

      {roomsQuery.data && !showMap && roomsQuery.data.length === 0 && !isAdmin && (
        <p className="rooms-status">No rooms yet.</p>
      )}

      {roomsQuery.data &&
        (showMap ? (
          <WorldMap rooms={roomsQuery.data} isAdmin={isAdmin} onCreateRoom={() => setModalState({})} />
        ) : (
          (roomsQuery.data.length > 0 || isAdmin) && (
            <div className="rooms-grid">
              {roomsQuery.data.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  isAdmin={isAdmin}
                  onBook={setBookingRoom}
                  onEdit={(r) => setModalState({ room: r })}
                  onDelete={setPendingDelete}
                  onViewPhotos={setGalleryRoom}
                />
              ))}
              {isAdmin && (
                <button type="button" className="room-card-add" onClick={() => setModalState({})}>
                  <span className="room-card-add-icon" aria-hidden="true">
                    +
                  </span>
                  <span>New room</span>
                </button>
              )}
            </div>
          )
        ))}

      {modalState && (
        <RoomFormModal room={modalState.room} onSave={handleSave} onClose={() => setModalState(null)} />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete room"
          message={`Delete "${pendingDelete.nickname}"? This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {bookingRoom && <BookingCalendarModal room={bookingRoom} onClose={() => setBookingRoom(null)} />}

      {galleryRoom && (
        <RoomGalleryModal
          roomNickname={galleryRoom.nickname}
          photos={galleryRoom.photos}
          onClose={() => setGalleryRoom(null)}
        />
      )}

      {showMyBookings && (
        <MyBookingsModal rooms={roomsQuery.data ?? []} onClose={() => setShowMyBookings(false)} />
      )}

      {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} />}

      {showOccupancy && <OccupancyDashboardModal onClose={() => setShowOccupancy(false)} />}
    </div>
  );
}
