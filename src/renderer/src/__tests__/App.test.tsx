import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// ── mock components ─────────────────────────────────────────────────────────
vi.mock('../components/Toast', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../components/WindowControls', () => ({
  WindowControls: () => <div data-testid="window-controls" />,
}));

vi.mock('../tabs/AlertsTab', () => ({
  AlertsTab: () => <div data-testid="alerts-tab" />,
}));

describe('App', () => {
  it('renders without crashing', async () => {
    const { default: App } = await import('../App');
    expect(() => render(<App />)).not.toThrow();
  });

  it('renders window controls and alerts tab', async () => {
    const { default: App } = await import('../App');
    render(<App />);
    expect(screen.getByTestId('window-controls')).toBeInTheDocument();
    expect(screen.getByTestId('alerts-tab')).toBeInTheDocument();
  });
});
