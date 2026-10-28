import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { mockDeleteTransferResponse } from '@/test/transfer-helpers.js';
import { createQueryClientWrapper } from '@/test/providers.js';

import { DeleteTransferDialog } from './DeleteTransferDialog.js';

function renderDialog(transferId: string | null) {
  const onClose = vi.fn();
  render(<DeleteTransferDialog transferId={transferId} onClose={onClose} />, {
    wrapper: createQueryClientWrapper(),
  });
  return { onClose };
}

describe('DeleteTransferDialog', () => {
  it('renders nothing without a transfer', () => {
    const { container } = render(<DeleteTransferDialog transferId={null} onClose={vi.fn()} />, {
      wrapper: createQueryClientWrapper(),
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('deletes the transfer and closes', async () => {
    const user = userEvent.setup();
    mockDeleteTransferResponse();
    const fetchSpy = vi.spyOn(window, 'fetch');
    const { onClose } = renderDialog('d4e5f6a7-b8c9-0123-defa-234567890123');

    expect(screen.getByText('Delete transfer?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete transfer' }));

    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
    const deleteCall = fetchSpy.mock.calls.find(([url]) => String(url).includes('transfer.delete'));
    expect(deleteCall).toBeDefined();
    expect(JSON.parse(String(deleteCall![1]?.body))).toEqual({
      id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
    });
    fetchSpy.mockRestore();
  });
});
