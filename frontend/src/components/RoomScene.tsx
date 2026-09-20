import { AnimatePresence, motion } from 'framer-motion';
import { AvatarPreview } from './AvatarPreview';
import type { Occupant } from '../types';

interface RoomSceneProps {
  occupant: Occupant | null;
  quirks?: string[];
  amenities?: string[];
  capacity?: number;
}

function hasBrokenAC(quirks: string[]): boolean {
  return quirks.some((quirk) => /broken ac/i.test(quirk));
}

function hasScreen(amenities: string[]): boolean {
  return amenities.some((amenity) => /projector|tv/i.test(amenity));
}

/** Roughly how furnished the scene looks, driven by capacity rather than an
 * exact seat count — this is an illustration, not a floor plan. */
function furnitureTier(capacity: number): 'small' | 'medium' | 'large' {
  if (capacity <= 4) return 'small';
  if (capacity <= 8) return 'medium';
  return 'large';
}

/** A small pixel-art room — wall, window, door, table and chairs, Gather-style
 * — instead of a plain box. The window/wall tint shifts when someone's in,
 * and the occupant's avatar animates in/out through the door as bookings
 * start and end (see README > Design Direction). Quirks/amenities/capacity
 * are optional so existing call sites (and older tests) keep working with
 * a plain, trait-less room. */
export function RoomScene({ occupant, quirks = [], amenities = [], capacity = 6 }: RoomSceneProps) {
  const tier = furnitureTier(capacity);

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

        {/* rug — a flat border-in-border rect, a common pixel-art shading trick */}
        <rect x="46" y="84" width="68" height="30" className="room-scene-rug-border" />
        <rect x="49" y="86" width="62" height="26" className="room-scene-rug" />

        {/* window */}
        <rect x="104" y="12" width="40" height="32" className="room-scene-window" />
        <rect x="122" y="12" width="4" height="32" className="room-scene-line" />
        <rect x="104" y="26" width="40" height="4" className="room-scene-line" />

        {/* door, with a small pane for a bit of depth */}
        <rect x="8" y="24" width="24" height="56" className="room-scene-door" />
        <rect x="12" y="30" width="16" height="10" className="room-scene-line" />
        <rect x="26" y="48" width="4" height="4" className="room-scene-handle" />

        {/* ceiling light — warms up along with the window when someone's in */}
        <rect x="72" y="0" width="16" height="3" className="room-scene-light" />

        {/* potted plant — purely decorative, every room gets one */}
        <rect x="4" y="106" width="12" height="4" className="room-scene-plant-pot" />
        <rect x="6" y="102" width="8" height="4" className="room-scene-plant-pot" />
        <rect x="2" y="92" width="4" height="10" className="room-scene-plant-leaf" />
        <rect x="14" y="92" width="4" height="10" className="room-scene-plant-leaf" />
        <rect x="7" y="88" width="6" height="12" className="room-scene-plant-leaf" />

        {/* wall-mounted screen — shown when the room has a projector or TV */}
        {hasScreen(amenities) && (
          <>
            <rect x="40" y="4" width="56" height="18" className="room-scene-screen-frame" />
            <rect x="43" y="7" width="50" height="12" className="room-scene-screen" />
            <rect x="64" y="22" width="8" height="3" className="room-scene-screen-mount" />
            <rect x="92" y="9" width="2" height="2" className="room-scene-screen-led" />
          </>
        )}

        {/* AC unit — vented, shown broken (with a drip) when the room carries that quirk */}
        {hasBrokenAC(quirks) ? (
          <>
            <rect x="112" y="2" width="24" height="8" className="room-scene-ac" />
            <rect x="115" y="4" width="18" height="1" className="room-scene-ac-vent" />
            <rect x="115" y="6" width="18" height="1" className="room-scene-ac-vent" />
            <path d="M112 2 L136 10 M136 2 L112 10" className="room-scene-ac-broken" />
            <rect x="123" y="10" width="2" height="4" className="room-scene-ac-drip" />
          </>
        ) : (
          <>
            <rect x="112" y="2" width="24" height="8" className="room-scene-ac" />
            <rect x="115" y="4" width="18" height="1" className="room-scene-ac-vent" />
            <rect x="115" y="6" width="18" height="1" className="room-scene-ac-vent" />
          </>
        )}

        {/* table + chairs, roughly scaled to how many people the room seats */}
        <rect x="54" y="74" width="52" height="3" className="room-scene-table-shadow" />
        <rect x="56" y="64" width="48" height="8" className="room-scene-furniture" />
        <rect x="60" y="72" width="6" height="10" className="room-scene-furniture" />
        <rect x="59" y="70" width="8" height="3" className="room-scene-chair-back" />
        <rect x="98" y="72" width="6" height="10" className="room-scene-furniture" />
        <rect x="97" y="70" width="8" height="3" className="room-scene-chair-back" />
        {tier !== 'small' && (
          <>
            <rect x="44" y="70" width="10" height="10" className="room-scene-furniture-alt" />
            <rect x="43" y="68" width="12" height="3" className="room-scene-chair-back" />
            <rect x="106" y="70" width="10" height="10" className="room-scene-furniture-alt" />
            <rect x="105" y="68" width="12" height="3" className="room-scene-chair-back" />
          </>
        )}
        {tier === 'large' && (
          <>
            <rect x="32" y="72" width="8" height="8" className="room-scene-furniture-alt" />
            <rect x="120" y="72" width="8" height="8" className="room-scene-furniture-alt" />
          </>
        )}
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
