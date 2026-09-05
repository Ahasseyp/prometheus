import type { Result } from '../types.js';

export function expectValue<T, E>(result: Result<T, E>): T {
  if (!result.ok) {
    const detail =
      result.error && typeof result.error === 'object' && 'type' in result.error
        ? (result.error as { type: string }).type
        : JSON.stringify(result.error);
    throw new Error(`Expected a successful result, but got error: ${detail}`);
  }
  return result.value;
}

export function expectError<T, E>(result: Result<T, E>): E {
  if (result.ok) {
    throw new Error(`Expected an error result, but got value: ${JSON.stringify(result.value)}`);
  }
  return result.error;
}
