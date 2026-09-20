import { useQuery } from '@tanstack/react-query';
import { getOccupancy } from '../services/analytics';
import { useAuthStore } from '../store/auth';
import type { DayOfWeek } from '../types';

interface OccupancyDashboardModalProps {
  onClose: () => void;
}

const DAYS: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function OccupancyDashboardModal({ onClose }: OccupancyDashboardModalProps) {
  const token = useAuthStore((s) => s.token)!;

  const occupancyQuery = useQuery({
    queryKey: ['occupancy'],
    queryFn: () => getOccupancy(token),
  });

  const entries = occupancyQuery.data ?? [];
  const maxMinutes = Math.max(1, ...entries.flatMap((entry) => DAYS.map((day) => entry.minutesByDay[day])));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content dashboard-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Occupancy by day of week</h2>

        {occupancyQuery.isLoading && <p className="rooms-status">Loading…</p>}
        {entries.length === 0 && !occupancyQuery.isLoading && (
          <p className="rooms-status">No bookings recorded yet.</p>
        )}

        <div className="occupancy-rooms">
          {entries.map((entry) => (
            <div key={entry.roomId} className="occupancy-room">
              <p className="occupancy-room-name">{entry.nickname}</p>
              <div className="occupancy-chart">
                {DAYS.map((day) => {
                  const minutes = entry.minutesByDay[day];
                  const heightPct = (minutes / maxMinutes) * 100;
                  return (
                    <div key={day} className="occupancy-bar-column">
                      <div
                        className="occupancy-bar"
                        style={{ height: `${heightPct}%` }}
                        title={`${day}: ${Math.round(minutes)} min`}
                      />
                      <span className="occupancy-bar-label">{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button type="button" className="link-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
