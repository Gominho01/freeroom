import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RoomScene } from '../RoomScene';

describe('RoomScene', () => {
  it('marks itself as free and shows no avatar when there is no occupant', () => {
    render(<RoomScene occupant={null} />);

    expect(screen.getByLabelText(/room is free/i)).toHaveAttribute('data-occupied', 'false');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('marks itself as occupied and shows the avatar when there is one', () => {
    render(
      <RoomScene
        occupant={{
          bookingId: 'b1',
          endsAt: '2030-01-01T11:00:00.000Z',
          user: { id: 'u1', name: 'Ada', avatarSeed: 'ada-seed' },
        }}
      />,
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://api.dicebear.com/9.x/pixel-art/svg?seed=ada-seed');
    expect(img.closest('[data-occupied]')).toHaveAttribute('data-occupied', 'true');
  });
});
