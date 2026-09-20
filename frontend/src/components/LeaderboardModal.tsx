import { useQuery } from '@tanstack/react-query';
import { getLeaderboard } from '../services/analytics';
import { useAuthStore } from '../store/auth';

interface LeaderboardModalProps {
  onClose: () => void;
}

const MEDALS = ['🥇', '🥈', '🥉'];

function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function LeaderboardModal({ onClose }: LeaderboardModalProps) {
  const token = useAuthStore((s) => s.token)!;

  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => getLeaderboard(token),
  });

  const entries = leaderboardQuery.data ?? [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Busiest rooms this month</h2>

        {leaderboardQuery.isLoading && <p className="rooms-status">Loading…</p>}
        {entries.length === 0 && !leaderboardQuery.isLoading && (
          <p className="rooms-status">No bookings yet this month.</p>
        )}

        <ol className="leaderboard-list">
          {entries.map((entry, index) => (
            <li key={entry.roomId}>
              <span className="leaderboard-rank">{MEDALS[index] ?? `#${index + 1}`}</span>
              <div className="leaderboard-room">
                <p className="leaderboard-nickname">{entry.nickname}</p>
                <p className="leaderboard-count">
                  {entry.bookingCount} booking{entry.bookingCount === 1 ? '' : 's'}
                </p>
              </div>
              <span className="leaderboard-duration">{formatDuration(entry.totalMinutes)}</span>
            </li>
          ))}
        </ol>

        <div className="modal-actions">
          <button type="button" className="link-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
