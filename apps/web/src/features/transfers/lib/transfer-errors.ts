const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export function getTransferMutationErrorMessage(error: Error): string {
  return error.message || DEFAULT_ERROR_MESSAGE;
}
