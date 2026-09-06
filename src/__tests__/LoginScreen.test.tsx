import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginScreen } from '../features/auth/LoginScreen';

// Use vi.hoisted to create mocks before vi.mock hoisting
const mockAuthStore = vi.hoisted(() => ({
  getStoredClientId: vi.fn(),
  persistClientId: vi.fn(),
  login: vi.fn(),
  clearClientId: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('../features/auth/authStore', () => mockAuthStore);

const defaultProps = {
  onAuthenticated: vi.fn(),
};

describe('LoginScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders client ID input when no client ID stored', () => {
    mockAuthStore.getStoredClientId.mockReturnValue('');
    render(<LoginScreen {...defaultProps} />);

    expect(
      screen.getByLabelText('Paste your Spotify Client ID'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('renders "Log in with Spotify" button when client ID exists', () => {
    mockAuthStore.getStoredClientId.mockReturnValue('test-client-id');
    render(<LoginScreen {...defaultProps} />);

    expect(
      screen.getByRole('button', { name: 'Log in with Spotify' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Paste your Spotify Client ID'),
    ).not.toBeInTheDocument();
  });

  it('typing a client ID transitions to ready phase', async () => {
    const user = userEvent.setup();
    mockAuthStore.getStoredClientId.mockReturnValue('');

    render(<LoginScreen {...defaultProps} />);

    const input = screen.getByLabelText('Paste your Spotify Client ID');
    await user.type(input, 'new-client-id');

    // Typing auto-transitions to 'ready' phase (effect fires when clientId becomes truthy)
    expect(
      await screen.findByRole('button', { name: 'Log in with Spotify' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Save' }),
    ).not.toBeInTheDocument();
  });

  it('shows loading state during login', async () => {
    const user = userEvent.setup();
    mockAuthStore.getStoredClientId.mockReturnValue('existing-id');
    mockAuthStore.login.mockImplementation(() => new Promise(() => {})); // never resolves

    render(<LoginScreen {...defaultProps} />);

    const loginButton = screen.getByRole('button', {
      name: 'Log in with Spotify',
    });
    await user.click(loginButton);

    expect(
      screen.getByText('Opening browser for authentication...'),
    ).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });

  it('shows error message on login failure', async () => {
    const user = userEvent.setup();
    mockAuthStore.getStoredClientId.mockReturnValue('existing-id');
    mockAuthStore.login.mockRejectedValue('Invalid client ID');

    render(<LoginScreen {...defaultProps} />);

    const loginButton = screen.getByRole('button', {
      name: 'Log in with Spotify',
    });
    await user.click(loginButton);

    expect(await screen.findByText('Invalid client ID')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Try again' }),
    ).toBeInTheDocument();
  });

  it('shows premium-required message for premium errors', async () => {
    const user = userEvent.setup();
    mockAuthStore.getStoredClientId.mockReturnValue('existing-id');
    mockAuthStore.login.mockRejectedValue('Premium account required');

    render(<LoginScreen {...defaultProps} />);

    const loginButton = screen.getByRole('button', {
      name: 'Log in with Spotify',
    });
    await user.click(loginButton);

    expect(
      await screen.findByText('Premium account required'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Upgrade to Premium/)).toBeInTheDocument();
  });

  it('calls onAuthenticated after successful login', async () => {
    const user = userEvent.setup();
    const onAuth = vi.fn();
    mockAuthStore.getStoredClientId.mockReturnValue('existing-id');
    mockAuthStore.login.mockResolvedValue(undefined);

    render(<LoginScreen onAuthenticated={onAuth} />);

    const loginButton = screen.getByRole('button', {
      name: 'Log in with Spotify',
    });
    await user.click(loginButton);

    await vi.waitFor(() => {
      expect(onAuth).toHaveBeenCalled();
    });
  });

  it('has a "Change Client ID" button to reset to input mode', async () => {
    const user = userEvent.setup();
    mockAuthStore.getStoredClientId.mockReturnValue('existing-id');
    render(<LoginScreen {...defaultProps} />);

    const changeBtn = screen.getByRole('button', { name: 'Change Client ID' });
    await user.click(changeBtn);

    expect(
      screen.getByLabelText('Paste your Spotify Client ID'),
    ).toBeInTheDocument();
  });
});
