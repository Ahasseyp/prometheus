import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  makeCategory,
  mockCreateCategoryError,
  mockCreateCategoryResponse,
  mockUpdateCategoryResponse,
} from '@/test/category-helpers.js';
import { createQueryClientWrapper } from '@/test/providers.js';

import { CategoryForm } from './CategoryForm.js';

const parent = makeCategory({ name: 'Food' });

function renderForm(props: Partial<React.ComponentProps<typeof CategoryForm>> = {}) {
  return render(<CategoryForm type="expense" categories={[parent]} {...props} />, {
    wrapper: createQueryClientWrapper(),
  });
}

describe('CategoryForm', () => {
  it('creates a top-level category with the active type', async () => {
    const onSuccess = vi.fn();
    const fetchSpy = vi.spyOn(window, 'fetch');
    mockCreateCategoryResponse(makeCategory({ name: 'Restaurants', isSystem: false }));
    renderForm({ onSuccess });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/category name/i), 'Restaurants');
    await user.click(screen.getByLabelText(/category icon/i));
    await user.click(await screen.findByRole('option', { name: 'Car' }));
    await user.click(screen.getByRole('button', { name: 'Add category' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const request = fetchSpy.mock.calls.find(([url]) => String(url).includes('category.create'));
    expect(JSON.parse(String(request?.[1]?.body))).toEqual({
      name: 'Restaurants',
      type: 'expense',
      icon: 'car',
    });
  });

  it('creates a subcategory under a top-level parent', async () => {
    const onSuccess = vi.fn();
    const fetchSpy = vi.spyOn(window, 'fetch');
    mockCreateCategoryResponse(makeCategory({ name: 'Takeaway', parentId: parent.id }));
    renderForm({ onSuccess });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/category name/i), 'Takeaway');
    await user.click(screen.getByLabelText(/parent category/i));
    await user.click(await screen.findByRole('option', { name: 'Food' }));
    await user.click(screen.getByRole('button', { name: 'Add category' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const request = fetchSpy.mock.calls.find(([url]) => String(url).includes('category.create'));
    expect(JSON.parse(String(request?.[1]?.body))).toEqual({
      name: 'Takeaway',
      type: 'expense',
      parentId: parent.id,
      icon: 'shopping-cart',
    });
  });

  it('renames a category without offering a parent selector', async () => {
    const onSuccess = vi.fn();
    const fetchSpy = vi.spyOn(window, 'fetch');
    mockUpdateCategoryResponse(makeCategory({ name: 'Essentials' }));
    renderForm({ category: parent, onSuccess });
    const user = userEvent.setup();

    expect(screen.queryByLabelText(/parent category/i)).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText(/category name/i));
    await user.type(screen.getByLabelText(/category name/i), 'Essentials');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const request = fetchSpy.mock.calls.find(([url]) => String(url).includes('category.update'));
    expect(JSON.parse(String(request?.[1]?.body))).toEqual({
      id: parent.id,
      name: 'Essentials',
      icon: 'shopping-cart',
    });
  });

  it('shows mutation errors inline', async () => {
    mockCreateCategoryError('Categories can only be nested one level deep.');
    renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/category name/i), 'Invalid');
    await user.click(screen.getByRole('button', { name: 'Add category' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Categories can only be nested one level deep.'
    );
  });
});
