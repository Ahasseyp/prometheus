import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group.js';

export type PasswordInputProps = Omit<React.ComponentProps<'input'>, 'type'>;

export function PasswordInput({ disabled, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <InputGroup>
      <InputGroupInput type={showPassword ? 'text' : 'password'} disabled={disabled} {...props} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={() => setShowPassword((prev) => !prev)}
          disabled={disabled}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
        >
          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
