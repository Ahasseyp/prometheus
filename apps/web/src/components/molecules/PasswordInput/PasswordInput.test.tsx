import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PasswordInput } from './PasswordInput.js';

function renderPasswordInput(props: Partial<React.ComponentProps<typeof PasswordInput>> = {}) {
  return render(
    <PasswordInput
      value=""
      onChange={() => {}}
      aria-label="Password"
      data-testid="password-input"
      {...props}
    />
  );
}

describe('PasswordInput', () => {
  it('renders a password input and a show-password button', () => {
    renderPasswordInput();

    const input = screen.getByLabelText('Password') as HTMLInputElement;
    expect(input.type).toBe('password');
    expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument();
  });

  it('toggles the input type between password and text', async () => {
    renderPasswordInput();
    const user = userEvent.setup();

    const input = screen.getByLabelText('Password') as HTMLInputElement;
    const showButton = screen.getByRole('button', { name: /show password/i });

    await user.click(showButton);
    expect(input.type).toBe('text');
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();

    const hideButton = screen.getByRole('button', { name: /hide password/i });
    await user.click(hideButton);
    expect(input.type).toBe('password');
    expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument();
  });

  it('forwards the onChange handler', async () => {
    const handleChange = vi.fn();
    renderPasswordInput({ onChange: handleChange });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Password'), 'a');
    expect(handleChange).toHaveBeenCalled();
  });

  it('disables the input and toggle button when disabled', () => {
    renderPasswordInput({ disabled: true });

    expect(screen.getByLabelText('Password')).toBeDisabled();
    expect(screen.getByRole('button', { name: /show password/i })).toBeDisabled();
  });
});
