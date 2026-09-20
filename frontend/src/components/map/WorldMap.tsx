import { useEffect, useMemo, useRef, useState } from 'react';
import { AvatarPreview } from '../AvatarPreview';
import { BookingCalendarModal } from '../BookingCalendarModal';
import { MyBookingsModal } from '../MyBookingsModal';
import { ReceptionistPanel } from './ReceptionistPanel';
import { joinWorld, sendWorldMove, watchRoom } from '../../services/socket';
import { useAuthStore } from '../../store/auth';
import type { Occupant, Room, WorldPlayer } from '../../types';
import { clampToMap, computeLayout, distance, INTERACT_RADIUS, MOVE_SPEED, PLAYER_SIZE, resolveMove } from './layout';

const MOVE_KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0],
};

type Nearby = { kind: 'room'; room: Room } | { kind: 'receptionist' } | null;

interface WorldMapProps {
  rooms: Room[];
}

export function WorldMap({ rooms }: WorldMapProps) {
  const token = useAuthStore((s) => s.token)!;
  const user = useAuthStore((s) => s.user)!;

  const layout = useMemo(() => computeLayout(rooms.length), [rooms.length]);

  const [pos, setPos] = useState(layout.spawn);
  const [players, setPlayers] = useState<Record<string, WorldPlayer>>({});
  const [occupants, setOccupants] = useState<Record<string, Occupant | null>>({});
  const [bookingRoom, setBookingRoom] = useState<Room | null>(null);
  const [showReceptionist, setShowReceptionist] = useState(false);
  const [showMyBookings, setShowMyBookings] = useState(false);

  const posRef = useRef(pos);
  const pressedKeys = useRef(new Set<string>());
  const lastSentPos = useRef(pos);
  const lastSentAt = useRef(0);

  let nearby: Nearby = null;
  for (let i = 0; i < rooms.length; i++) {
    if (distance(pos, layout.doors[i]!) <= INTERACT_RADIUS) {
      nearby = { kind: 'room', room: rooms[i]! };
      break;
    }
  }
  if (!nearby && distance(pos, layout.receptionistDoor) <= INTERACT_RADIUS) {
    nearby = { kind: 'receptionist' };
  }

  const nearbyRef = useRef(nearby);

  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  useEffect(() => {
    nearbyRef.current = nearby;
  }, [nearby]);

  // Live occupancy per room, same feed the card view uses — drives the
  // free/occupied dot on each building.
  useEffect(() => {
    const unsubscribers = rooms.map((room) =>
      watchRoom(token, room.id, (payload) => {
        setOccupants((prev) => ({ ...prev, [payload.roomId]: payload.occupant }));
      }),
    );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [rooms, token]);

  // Other players' avatars, broadcast over the shared world channel.
  useEffect(() => {
    const unsubscribe = joinWorld(token, {
      onPlayers: (snapshot) => {
        const others: Record<string, WorldPlayer> = {};
        for (const player of snapshot) {
          if (player.id !== user.id) others[player.id] = player;
        }
        setPlayers(others);
      },
      onPlayerJoined: (player) => {
        if (player.id === user.id) return;
        setPlayers((prev) => ({ ...prev, [player.id]: player }));
      },
      onPlayerMoved: (payload) => {
        setPlayers((prev) => (prev[payload.id] ? { ...prev, [payload.id]: { ...prev[payload.id]!, ...payload } } : prev));
      },
      onPlayerLeft: (payload) => {
        setPlayers((prev) => {
          const next = { ...prev };
          delete next[payload.id];
          return next;
        });
      },
    });
    return unsubscribe;
  }, [token, user.id]);

  // Keyboard movement — a single rAF loop reads which keys are currently
  // held (via a ref, so this effect never needs to re-run) and advances the
  // player each frame, resolving collisions against every building and the
  // receptionist desk.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key in MOVE_KEYS) pressedKeys.current.add(e.key);
      if (e.key === 'e' || e.key === 'E') {
        const target = nearbyRef.current;
        if (target?.kind === 'room') setBookingRoom(target.room);
        if (target?.kind === 'receptionist') setShowReceptionist(true);
      }
    }
    function handleKeyUp(e: KeyboardEvent) {
      pressedKeys.current.delete(e.key);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let raf = requestAnimationFrame(tick);
    let lastTime = performance.now();

    function tick(time: number) {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      let dx = 0;
      let dy = 0;
      for (const key of pressedKeys.current) {
        const vector = MOVE_KEYS[key];
        if (vector) {
          dx += vector[0];
          dy += vector[1];
        }
      }

      if (dx !== 0 || dy !== 0) {
        const length = Math.hypot(dx, dy) || 1;
        const step = MOVE_SPEED * dt;
        const proposed = {
          x: posRef.current.x + (dx / length) * step,
          y: posRef.current.y + (dy / length) * step,
        };
        const obstacles = [...layout.buildings, layout.receptionist];
        const resolved = clampToMap(
          resolveMove(posRef.current, proposed, PLAYER_SIZE, obstacles),
          layout.mapWidth,
          layout.mapHeight,
          PLAYER_SIZE,
        );

        if (resolved.x !== posRef.current.x || resolved.y !== posRef.current.y) {
          posRef.current = resolved;
          setPos(resolved);

          const now = performance.now();
          if (now - lastSentAt.current > 50 || distance(resolved, lastSentPos.current) > 4) {
            lastSentAt.current = now;
            lastSentPos.current = resolved;
            sendWorldMove(token, resolved.x, resolved.y);
          }
        }
      }

      raf = requestAnimationFrame(tick);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(raf);
    };
  }, [layout, token]);

  return (
    <div className="world-viewport">
      <div className="world-map" style={{ width: layout.mapWidth, height: layout.mapHeight }}>
        {rooms.map((room, i) => {
          const building = layout.buildings[i]!;
          const occupant = occupants[room.id];
          return (
            <div
              key={room.id}
              className="world-building"
              data-occupied={occupant ? 'true' : 'false'}
              style={{ left: building.x, top: building.y, width: building.w, height: building.h }}
            >
              <div className="world-building-door" />
              <span className="world-building-status" aria-hidden="true" />
              <p className="world-building-label">{room.nickname}</p>
            </div>
          );
        })}

        <div
          className="world-receptionist"
          style={{
            left: layout.receptionist.x,
            top: layout.receptionist.y,
            width: layout.receptionist.w,
            height: layout.receptionist.h,
          }}
        >
          <AvatarPreview seed="freeroom-receptionist" size={layout.receptionist.w} />
          <p className="world-receptionist-label">Front desk</p>
        </div>

        {Object.values(players).map((player) => (
          <div key={player.id} className="world-avatar" style={{ left: player.x, top: player.y }}>
            <AvatarPreview seed={player.avatarSeed} size={PLAYER_SIZE} />
            <span className="world-avatar-name">{player.name}</span>
          </div>
        ))}

        <div className="world-avatar world-avatar-self" style={{ left: pos.x, top: pos.y }}>
          <AvatarPreview seed={user.avatarSeed} size={PLAYER_SIZE} />
          <span className="world-avatar-name">{user.name}</span>
        </div>

        {nearby && (
          <div
            className="world-hint"
            style={{
              left: nearby.kind === 'room' ? layout.doors[rooms.indexOf(nearby.room)]!.x : layout.receptionistDoor.x,
              top: (nearby.kind === 'room' ? layout.doors[rooms.indexOf(nearby.room)]!.y : layout.receptionistDoor.y) - 34,
            }}
          >
            Press E to {nearby.kind === 'room' ? `book ${nearby.room.nickname}` : 'talk to the front desk'}
          </div>
        )}
      </div>

      <p className="world-controls-hint">Move with arrow keys or WASD. Press E near a door or the front desk.</p>

      {bookingRoom && <BookingCalendarModal room={bookingRoom} onClose={() => setBookingRoom(null)} />}

      {showReceptionist && (
        <ReceptionistPanel
          rooms={rooms}
          occupants={occupants}
          onBook={(room) => {
            setShowReceptionist(false);
            setBookingRoom(room);
          }}
          onMyBookings={() => {
            setShowReceptionist(false);
            setShowMyBookings(true);
          }}
          onClose={() => setShowReceptionist(false)}
        />
      )}

      {showMyBookings && <MyBookingsModal rooms={rooms} onClose={() => setShowMyBookings(false)} />}
    </div>
  );
}
