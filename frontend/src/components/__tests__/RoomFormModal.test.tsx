import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RoomFormModal } from '../RoomFormModal';

describe('RoomFormModal', () => {
  it('submits a new room with parsed comma-separated lists', () => {
    const onSave = vi.fn();
    render(<RoomFormModal onSave={onSave} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Conference Room A' } });
    fireEvent.change(screen.getByLabelText(/nickname/i), { target: { value: 'The Fridge' } });
    fireEvent.change(screen.getByLabelText(/quirks/i), { target: { value: 'Broken AC, Weak Wi-Fi' } });
    fireEvent.change(screen.getByLabelText(/capacity/i), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText(/amenities/i), { target: { value: 'projector, tv' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).toHaveBeenCalledWith({
      name: 'Conference Room A',
      nickname: 'The Fridge',
      quirks: ['Broken AC', 'Weak Wi-Fi'],
      capacity: 6,
      amenities: ['projector', 'tv'],
    });
  });

  it('pre-fills the form when editing an existing room', () => {
    render(
      <RoomFormModal
        room={{
          id: '1',
          name: 'Room B',
          nickname: 'The Aquarium',
          quirks: ['Glass walls'],
          capacity: 4,
          amenities: [],
          createdAt: '2026-01-01T00:00:00.000Z',
        }}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Room B');
    expect(screen.getByLabelText(/nickname/i)).toHaveValue('The Aquarium');
    expect(screen.getByRole('heading', { name: /edit room/i })).toBeInTheDocument();
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<RoomFormModal onSave={vi.fn()} onClose={onClose} />);

    fireEvent.click(container.querySelector('.modal-backdrop')!);
    expect(onClose).toHaveBeenCalled();
  });
});
