import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Money } from './Money';

describe('Money', () => {
  it('formats a positive MXN amount', () => {
    render(<Money value={{ amount: 1234.5, currency: 'MXN' }} />);
    expect(screen.getByText(/\$1,234\.50/)).toBeInTheDocument();
  });

  it('renders expenses in red', () => {
    render(<Money value={{ amount: 150, currency: 'USD' }} direction="expense" />);
    const el = screen.getByText('-$150.00');
    expect(el.className).toContain('text-red-600');
  });
});
