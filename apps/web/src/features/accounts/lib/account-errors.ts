const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export function getAccountMutationErrorMessage(error: Error): string {
  return error.message || DEFAULT_ERROR_MESSAGE;
}
