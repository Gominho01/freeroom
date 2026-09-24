import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

  it('renders a broken AC unit when the room has that quirk', () => {
    const { container } = render(<RoomScene occupant={null} quirks={['Broken AC']} />);
    expect(container.querySelector('.room-scene-ac-broken')).not.toBeNull();
  });

  it('renders no AC unit when the room has no such quirk', () => {
    const { container } = render(<RoomScene occupant={null} quirks={['Weak Wi-Fi']} />);
    expect(container.querySelector('.room-scene-ac-broken')).toBeNull();
  });

  it('renders a wall screen for a projector or TV amenity', () => {
    const { container } = render(<RoomScene occupant={null} amenities={['projector']} />);
    expect(container.querySelector('.room-scene-screen')).not.toBeNull();
  });

  it('renders no wall screen when there is no projector or TV', () => {
    const { container } = render(<RoomScene occupant={null} amenities={['whiteboard']} />);
    expect(container.querySelector('.room-scene-screen')).toBeNull();
  });

  it('shows a clickable photo frame only when there are photos to view', () => {
    const onViewPhotos = vi.fn();
    const { rerender } = render(<RoomScene occupant={null} photos={[]} onViewPhotos={onViewPhotos} />);
    expect(screen.queryByRole('button', { name: /view room photos/i })).not.toBeInTheDocument();

    rerender(
      <RoomScene occupant={null} photos={['https://images.example.com/a.jpg']} onViewPhotos={onViewPhotos} />,
    );
    const frame = screen.getByRole('button', { name: /view room photos/i });
    fireEvent.click(frame);
    expect(onViewPhotos).toHaveBeenCalledTimes(1);
  });

  it('draws fewer extra seats for a small room than a large one', () => {
    const small = render(<RoomScene occupant={null} capacity={2} />);
    const large = render(<RoomScene occupant={null} capacity={12} />);

    const smallSeats = small.container.querySelectorAll('.room-scene-furniture-alt').length;
    const largeSeats = large.container.querySelectorAll('.room-scene-furniture-alt').length;

    expect(smallSeats).toBe(0);
    expect(largeSeats).toBeGreaterThan(smallSeats);
  });
});
