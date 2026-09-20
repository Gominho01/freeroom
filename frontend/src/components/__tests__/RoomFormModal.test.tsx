import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { RoomFormModal } from '../RoomFormModal';

describe('RoomFormModal', () => {
  it('submits a new room combining checked known traits with free-text ones', () => {
    const onSave = vi.fn();
    render(<RoomFormModal onSave={onSave} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Conference Room A' } });
    fireEvent.change(screen.getByLabelText(/nickname/i), { target: { value: 'The Fridge' } });
    fireEvent.change(screen.getByLabelText(/capacity/i), { target: { value: '6' } });

    fireEvent.click(screen.getByRole('checkbox', { name: /broken ac/i }));
    fireEvent.change(screen.getByLabelText(/other quirks/i), { target: { value: 'Glass walls' } });

    fireEvent.click(screen.getByRole('checkbox', { name: /^projector/i }));
    fireEvent.change(screen.getByLabelText(/other amenities/i), { target: { value: 'standing desk' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).toHaveBeenCalledWith({
      name: 'Conference Room A',
      nickname: 'The Fridge',
      quirks: ['Broken AC', 'Glass walls'],
      capacity: 6,
      amenities: ['projector', 'standing desk'],
    });
  });

  it('shows a hint next to traits that change the room scene', () => {
    render(<RoomFormModal onSave={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText(/shows a broken ac unit/i)).toBeInTheDocument();
    expect(screen.getAllByText(/renders a wall screen/i)).toHaveLength(2);
  });

  it('pre-fills the form when editing an existing room, splitting known traits from custom ones', () => {
    render(
      <RoomFormModal
        room={{
          id: '1',
          name: 'Room B',
          nickname: 'The Aquarium',
          quirks: ['Broken AC', 'Glass walls'],
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
    expect(screen.getByRole('checkbox', { name: /broken ac/i })).toBeChecked();
    expect(screen.getByLabelText(/other quirks/i)).toHaveValue('Glass walls');
    expect(screen.getByRole('heading', { name: /edit room/i })).toBeInTheDocument();
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<RoomFormModal onSave={vi.fn()} onClose={onClose} />);

    fireEvent.click(container.querySelector('.modal-backdrop')!);
    expect(onClose).toHaveBeenCalled();
  });
});
