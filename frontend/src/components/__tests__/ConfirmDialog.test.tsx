import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders the title and message', () => {
    render(
      <ConfirmDialog title="Delete room" message='Delete "The Fridge"?' onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );

    expect(screen.getByRole('heading', { name: 'Delete room' })).toBeInTheDocument();
    expect(screen.getByText('Delete "The Fridge"?')).toBeInTheDocument();
  });

  it('calls onConfirm when the confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog title="Delete room" message="Sure?" confirmLabel="Delete" onConfirm={onConfirm} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when the cancel button or backdrop is clicked', () => {
    const onCancel = vi.fn();
    const { container } = render(
      <ConfirmDialog title="Delete room" message="Sure?" onConfirm={vi.fn()} onCancel={onCancel} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(container.querySelector('.modal-backdrop')!);
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});
