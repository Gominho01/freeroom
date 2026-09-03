import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AvatarPreview } from '../AvatarPreview';

describe('AvatarPreview', () => {
  it('renders an image built from the seed', () => {
    render(<AvatarPreview seed="jane-doe" />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://api.dicebear.com/9.x/avataaars/svg?seed=jane-doe');
  });

  it('renders an empty placeholder when the seed is blank', () => {
    render(<AvatarPreview seed="  " />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
