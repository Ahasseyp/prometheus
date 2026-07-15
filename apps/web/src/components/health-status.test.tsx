import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createHealthGateway, type HealthStatus as HealthStatusData } from '@/gateways/health.js';
import { createQueryClientWrapper } from '@/test/providers.js';

import { HealthStatus } from './health-status.js';

function renderWithProviders(element: React.ReactElement) {
  return render(element, { wrapper: createQueryClientWrapper() });
}

function createGateway(response: HealthStatusData) {
  return createHealthGateway({
    query: () => Promise.resolve(response),
  });
}

function createFailingGateway() {
  return createHealthGateway({
    query: () => Promise.reject(new Error('failed')),
  });
}

describe('HealthStatus', () => {
  it('shows the backend status when healthy', async () => {
    renderWithProviders(<HealthStatus gateway={createGateway({ status: 'ok' })} />);

    expect(await screen.findByText('Status: ok')).toBeInTheDocument();
  });

  it('shows an error when the backend is unreachable', async () => {
    renderWithProviders(<HealthStatus gateway={createFailingGateway()} />);

    expect(await screen.findByText('Backend unreachable')).toBeInTheDocument();
  });
});
