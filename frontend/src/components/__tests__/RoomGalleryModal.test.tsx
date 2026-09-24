import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RoomGalleryModal } from '../RoomGalleryModal';

describe('RoomGalleryModal', () => {
  it('shows the first photo and no nav controls when there is only one', () => {
    render(<RoomGalleryModal roomNickname="The Fridge" photos={['https://images.example.com/a.jpg']} onClose={vi.fn()} />);

    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://images.example.com/a.jpg');
    expect(screen.queryByRole('button', { name: /next photo/i })).not.toBeInTheDocument();
    expect(screen.queryByText('1 / 1')).not.toBeInTheDocument();
  });

  it('navigates between photos with the nav buttons and wraps around', () => {
    const photos = ['https://images.example.com/a.jpg', 'https://images.example.com/b.jpg'];
    render(<RoomGalleryModal roomNickname="The Fridge" photos={photos} onClose={vi.fn()} />);

    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next photo/i }));
    expect(screen.getByRole('img')).toHaveAttribute('src', photos[1]);
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next photo/i }));
    expect(screen.getByRole('img')).toHaveAttribute('src', photos[0]);

    fireEvent.click(screen.getByRole('button', { name: /previous photo/i }));
    expect(screen.getByRole('img')).toHaveAttribute('src', photos[1]);
  });

  it('navigates with the arrow keys and closes on Escape', () => {
    const photos = ['https://images.example.com/a.jpg', 'https://images.example.com/b.jpg'];
    const onClose = vi.fn();
    render(<RoomGalleryModal roomNickname="The Fridge" photos={photos} onClose={onClose} />);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowRight' });
    expect(screen.getByRole('img')).toHaveAttribute('src', photos[1]);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowLeft' });
    expect(screen.getByRole('img')).toHaveAttribute('src', photos[0]);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when the backdrop or Close button is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <RoomGalleryModal roomNickname="The Fridge" photos={['https://images.example.com/a.jpg']} onClose={onClose} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(container.querySelector('.modal-backdrop')!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
