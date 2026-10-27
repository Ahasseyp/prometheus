import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  makeCategory,
  mockDeleteCategoryError,
  mockDeleteCategoryResponse,
} from '@/test/category-helpers.js';
import { createQueryClientWrapper } from '@/test/providers.js';

import { DeleteCategoryDialog } from './DeleteCategoryDialog.js';

const category = makeCategory({ name: 'Restaurants', isSystem: false });

function renderDialog() {
  const onClose = vi.fn();
  render(<DeleteCategoryDialog category={category} onClose={onClose} />, {
    wrapper: createQueryClientWrapper(),
  });
  return { onClose };
}

describe('DeleteCategoryDialog', () => {
  it('deletes the category and closes on confirm', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(window, 'fetch');
    const { onClose } = renderDialog();
    mockDeleteCategoryResponse();

    expect(screen.getByText('Delete Restaurants?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete category' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const request = fetchSpy.mock.calls.find(([url]) => String(url).includes('category.delete'));
    expect(JSON.parse(String(request?.[1]?.body))).toEqual({ id: category.id });
  });

  it('shows the API error when deletion is blocked', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog();
    mockDeleteCategoryError('Delete this category’s subcategories first.');

    await user.click(screen.getByRole('button', { name: 'Delete category' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Delete this category’s subcategories first.'
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
