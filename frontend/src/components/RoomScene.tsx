import { AnimatePresence, motion } from 'framer-motion';
import { AvatarPreview } from './AvatarPreview';
import type { Occupant } from '../types';

interface RoomSceneProps {
  occupant: Occupant | null;
}

/** A small pixel-art room — wall, window, door, table and chairs, Gather-style
 * — instead of a plain box. The window/wall tint shifts when someone's in,
 * and the occupant's avatar animates in/out through the door as bookings
 * start and end (see README > Design Direction). */
export function RoomScene({ occupant }: RoomSceneProps) {
  return (
    <div
      className="room-scene"
      data-occupied={occupant ? 'true' : 'false'}
      aria-label={occupant ? undefined : 'Room is free'}
    >
      <svg
        className="room-scene-bg"
        viewBox="0 0 160 120"
        preserveAspectRatio="xMidYMax meet"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        {/* wall + baseboard */}
        <rect x="0" y="0" width="160" height="80" className="room-scene-wall" />
        <rect x="0" y="76" width="160" height="4" className="room-scene-baseboard" />

        {/* floor tiles */}
        <rect x="0" y="80" width="160" height="40" className="room-scene-floor" />
        <rect x="0" y="80" width="20" height="40" className="room-scene-floor-alt" />
        <rect x="40" y="80" width="20" height="40" className="room-scene-floor-alt" />
        <rect x="80" y="80" width="20" height="40" className="room-scene-floor-alt" />
        <rect x="120" y="80" width="20" height="40" className="room-scene-floor-alt" />

        {/* window */}
        <rect x="104" y="12" width="40" height="32" className="room-scene-window" />
        <rect x="122" y="12" width="4" height="32" className="room-scene-line" />
        <rect x="104" y="26" width="40" height="4" className="room-scene-line" />

        {/* door */}
        <rect x="8" y="24" width="24" height="56" className="room-scene-door" />
        <rect x="26" y="48" width="4" height="4" className="room-scene-handle" />

        {/* table + chairs */}
        <rect x="56" y="64" width="48" height="8" className="room-scene-furniture" />
        <rect x="60" y="72" width="6" height="10" className="room-scene-furniture" />
        <rect x="98" y="72" width="6" height="10" className="room-scene-furniture" />
        <rect x="44" y="70" width="10" height="10" className="room-scene-furniture-alt" />
        <rect x="106" y="70" width="10" height="10" className="room-scene-furniture-alt" />
      </svg>

      <div className="room-scene-avatar-slot">
        <AnimatePresence mode="wait">
          {occupant && (
            <motion.div
              key={occupant.bookingId}
              className="room-scene-avatar"
              initial={{ x: 14, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -14, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              title={`${occupant.user.name} — until ${new Date(occupant.endsAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}`}
            >
              <AvatarPreview seed={occupant.user.avatarSeed} size={36} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
