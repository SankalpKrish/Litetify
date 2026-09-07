# Testing

## 1. Testing Philosophy

Litetify follows a pragmatic, layered testing strategy:

- **Test behavior, not implementation** - focus on what the code does, not internal details.
- **Co-locate tests with code** - `__tests__` directories sit next to the modules they test.
- **Mock at module boundaries** - mock Tauri APIs, HTTP clients, and external stores; test business logic in isolation.
- **Parallelism matters** - Rust tests use mutexes to avoid keyring contention; Vitest runs frontend tests in parallel by default.
- **Gates, not gates that block unreasonably** - lint, typecheck, and test jobs must pass before a build can merge. Code quality diagnostics (knip, cspell, cargo-udeps) are informational and allowed to fail.

---

## 2. Frontend Testing (Vitest + Testing Library)

### Stack

| Tool                                                                                   | Purpose                                                            |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [Vitest](https://vitest.dev/)                                                          | Test runner (configured in `vite.config.ts`)                       |
| [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro) | Render components and query the DOM                                |
| [@testing-library/jest-dom](https://github.com/testing-library/jest-dom)               | Custom DOM matchers (`toBeInTheDocument`, `toHaveAttribute`, etc.) |
| [@testing-library/user-event](https://testing-library.com/docs/user-event/intro)       | Simulate realistic user interactions                               |
| [jsdom](https://github.com/jsdom/jsdom)                                                | Browser-like environment for tests                                 |

### Configuration

Vitest is configured in `vite.config.ts`:

```ts
test: {
  environment: 'jsdom',
  setupFiles: ['./src/test-setup.ts'],
  globals: true,
  css: true,
}
```

The setup file (`src/test-setup.ts`) provides browser API mocks:

- **`matchMedia`** - stub that matches nothing, used by components with media queries.
- **`IntersectionObserver`** - no-op mock for components using intersection observation.
- **`requestAnimationFrame` / `cancelAnimationFrame`** - backed by `setTimeout`/`clearTimeout` so rAF-based animations can be tested without a real frame loop. Cleaned up after each test via `afterEach`.

### Test Types

#### Component Tests

Located in `src/__tests__/` - render a component, query rendered output, and simulate interaction.

**Example pattern** (`TransportControls.test.tsx`):

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransportControls } from '../features/player/TransportControls';
import { usePlayerStore } from '../features/player/playerStore';

describe('TransportControls', () => {
  beforeEach(() => {
    usePlayerStore.setState(usePlayerStore.getInitialState(), true);
  });

  it('renders play button when not playing', () => {
    render(<TransportControls />);
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  it('play button toggles to pause when clicked', async () => {
    const user = userEvent.setup();
    const engine = mockEngine();
    usePlayerStore.getState().setEngine(engine);
    render(<TransportControls />);
    await user.click(screen.getByRole('button', { name: 'Play' }));
    expect(engine.resume).toHaveBeenCalled();
  });
});
```

**Existing component tests:**

- `src/__tests__/ErrorBoundary.test.tsx`
- `src/__tests__/LoginScreen.test.tsx`
- `src/__tests__/ProgressBar.test.tsx`
- `src/__tests__/TransportControls.test.tsx`
- `src/__tests__/VolumeControl.test.tsx`
- `src/__tests__/PinnedList.test.tsx`
- `src/__tests__/LogoMark.test.tsx`
- `src/__tests__/BrandSpinner.test.tsx`
- `src/__tests__/boot.test.ts`
- `src/__tests__/modsStore.test.ts`

#### Query Hook Tests

Located in `src/lib/queries/__tests__/` - test React Query hooks in isolation using `renderHook` from `@testing-library/react`.

**Example pattern** (`useAlbum.test.tsx`):

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useAlbum } from '../useAlbum';
import { createWrapper } from './test-utils';
import { apiGetAlbum } from '../../api';

vi.mock('../../api', () => ({ apiGetAlbum: vi.fn() }));

describe('useAlbum', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches album data by id', async () => {
    vi.mocked(apiGetAlbum).mockResolvedValue(mockAlbum);
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAlbum('album1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe('Test Album');
  });

  it('returns error state on API failure', async () => {
    vi.mocked(apiGetAlbum).mockRejectedValue(new Error('Album not found'));
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAlbum('bad-id'), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBeDefined();
  });
});
```

**Existing query hook tests:**

- `src/lib/queries/__tests__/useAlbum.test.tsx`
- `src/lib/queries/__tests__/useArtist.test.tsx`
- `src/lib/queries/__tests__/useHome.test.tsx`
- `src/lib/queries/__tests__/useLikedTracks.test.tsx`
- `src/lib/queries/__tests__/useMe.test.tsx`
- `src/lib/queries/__tests__/usePlayer.test.tsx`
- `src/lib/queries/__tests__/usePlaylist.test.tsx`
- `src/lib/queries/__tests__/usePlaylists.test.tsx`
- `src/lib/queries/__tests__/usePlaylistTracks.test.tsx`
- `src/lib/queries/__tests__/useSearch.test.tsx`
- `src/lib/queries/__tests__/useShows.test.tsx`
- `src/lib/queries/__tests__/useTrackSaved.test.tsx`

#### Store Tests

Located next to the store module (`src/features/player/__tests__/playerStore.test.ts`) - test Zustand store state mutations and interactions directly.

**Example pattern** (`playerStore.test.ts`):

```tsx
import { usePlayerStore } from '@/features/player/playerStore';

describe('playerStore', () => {
  beforeEach(() => {
    usePlayerStore.setState(usePlayerStore.getInitialState(), true);
  });

  it('updates partial state', () => {
    usePlayerStore.getState().setState({ volume: 80, isPlaying: true });
    const state = usePlayerStore.getState();
    expect(state.volume).toBe(80);
    expect(state.isPlaying).toBe(true);
  });

  it('calls engine.play() when engine is set', async () => {
    const engine = mockEngine('websdk');
    usePlayerStore.getState().setEngine(engine);
    await usePlayerStore.getState().playTrack('spotify:track:abc123');
    expect(engine.play).toHaveBeenCalledWith('spotify:track:abc123', undefined);
  });
});
```

**Existing store tests:**

- `src/features/player/__tests__/playerStore.test.ts`
- `src/features/pins/__tests__/pinsStore.test.ts`
- `src/features/pins/__tests__/reorder.test.ts`

#### Smoke Test

A minimal baseline test (`src/smoke.test.ts`) ensures the test pipeline has a green state before real tests are written per phase.

```ts
describe('phase 0 baseline', () => {
  it('runs the test pipeline', () => {
    expect(1 + 1).toBe(2);
  });
});
```

---

## 3. Rust Testing (Cargo)

### Stack

| Tool                       | Purpose                                  |
| -------------------------- | ---------------------------------------- |
| `cargo test`               | Standard Rust test runner                |
| `mockito` (dev-dependency) | HTTP mocking for API tests               |
| `tokio::test`              | Async runtime for tests                  |
| `serde_json`               | JSON serialization/deserialization tests |

### Unit Tests

Inline `#[cfg(test)] mod tests { ... }` blocks co-located with source modules. Pure logic tests (no I/O) run as standard `#[test]` functions.

**Example** (`src-tauri/src/auth/pkce.rs`):

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_known_pkce_vector() {
        let verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
        let challenge = code_challenge(verifier);
        assert_eq!(challenge, "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
    }

    #[test]
    fn test_generates_verifier_length() {
        let v = generate_code_verifier();
        assert!((43..=128).contains(&v.len()));
    }
}
```

### HTTP Mocking with mockito

Tests that involve HTTP calls use `mockito` to simulate the Spotify Web API.

**Example** (`src-tauri/src/api/req.rs`):

```rust
async fn mock_server() -> mockito::ServerGuard {
    tokio::task::spawn_blocking(move || mockito::Server::new())
        .await
        .unwrap()
}

#[tokio::test]
async fn test_parse_retry_after_header_found() {
    let mut server = mock_server().await;
    let _m = server
        .mock("GET", "/retry-test")
        .with_status(200)
        .with_header("retry-after", "7")
        .with_body("ok")
        .create();

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .unwrap();

    let resp = client
        .get(format!("{}/retry-test", server.url()))
        .send()
        .await
        .unwrap();
    assert_eq!(parse_retry_after(&resp), 7);
}
```

For synchronous tests that need a tokio runtime (e.g. token refresh tests in `tokens.rs`), a separate runtime is created:

```rust
#[test]
fn test_refresh_success() {
    let (server, mock) = mock_token_server();
    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
        let result = do_refresh(&server.url(), "client1", "refresh_token_1").await.unwrap();
        assert_eq!(result.access_token, "refreshed");
    });
    mock.assert();
}
```

### Token Refresh + Keyring Tests

Tests that touch the OS keyring (in `tokens.rs`) use a global `MUTEX` to serialize access and a separate test keyring service (`com.litetify.test`) to avoid polluting real credentials.

### Existing Rust Test Modules

| Module                         | What's tested                                                             |
| ------------------------------ | ------------------------------------------------------------------------- |
| `src-tauri/src/auth/pkce.rs`   | PKCE code verifier generation, code challenge derivation                  |
| `src-tauri/src/auth/tokens.rs` | Token serialization/expiry, token refresh over HTTP, keyring storage      |
| `src-tauri/src/auth/server.rs` | OAuth callback server (code capture, state validation)                    |
| `src-tauri/src/api/req.rs`     | API response deserialization, retry-after parsing, rate-limit retry logic |

---

## 4. Running Tests

All test commands are defined in `package.json` and run via `bun`.

### Frontend Tests

```bash
bun run test
```

Runs Vitest in run mode (single pass, no watch). All `*.test.ts*` files under `src/` are picked up automatically.

### Rust Tests

```bash
bun run test:rust
```

Equivalent to `cargo test --manifest-path src-tauri/Cargo.toml`. Runs all Rust unit tests including those that use mockito.

### Type Checking

```bash
bun run typecheck
```

Runs `tsc --noEmit` to verify TypeScript types without producing output files. This is the same check that runs in CI.

### Linting

```bash
bun run lint
```

Runs ESLint across the entire `src/` directory with `--max-warnings 0` - any warning or error fails the run.

### Additional Diagnostics

```bash
bun run format:check    # Prettier formatting check (CI)
bun run knip            # Detect unused exports/files (informational)
bun run spellcheck      # cspell spell check (informational)
```

---

## 5. Test File Organization

```
src/
├── smoke.test.ts                                    # Smoke test (pipeline baseline)
├── test-setup.ts                                    # Vitest setup (browser API mocks)
├── __tests__/                                       # Component tests
│   ├── ErrorBoundary.test.tsx
│   ├── LoginScreen.test.tsx
│   ├── ProgressBar.test.tsx
│   ├── TransportControls.test.tsx
│   ├── VolumeControl.test.tsx
│   ├── PinnedList.test.tsx
│   ├── LogoMark.test.tsx
│   ├── BrandSpinner.test.tsx
│   ├── boot.test.ts
│   └── modsStore.test.ts
├── features/
│   ├── player/
│   │   └── __tests__/
│   │       └── playerStore.test.ts                  # Store tests
│   └── pins/
│       └── __tests__/
│           ├── pinsStore.test.ts
│           └── reorder.test.ts
└── lib/
    └── queries/
        └── __tests__/
            ├── test-utils.tsx                       # Shared test utilities
            ├── useAlbum.test.tsx
            ├── useArtist.test.tsx
            ├── useHome.test.tsx
            ├── ...                                  # One file per query hook
            └── useTrackSaved.test.tsx

src-tauri/
└── src/
    ├── auth/
    │   ├── pkce.rs                                  # #[cfg(test)] inline
    │   ├── tokens.rs                                # #[cfg(test)] inline
    │   └── server.rs                                # #[cfg(test)] inline
    └── api/
        └── req.rs                                   # #[cfg(test)] inline
```

### `__tests__` Conventions

- Co-located with source: `__tests__/` directories sit at the same level as the module being tested.
- Each test file mirrors the source module name (e.g. `useAlbum.ts` → `__tests__/useAlbum.test.tsx`).
- Shared utilities live in `__tests__/test-utils.tsx` within each test group.

### Shared Test Utilities (`test-utils.tsx`)

**`src/lib/queries/__tests__/test-utils.tsx`** provides three helpers for query hook tests:

```tsx
// Creates a QueryClient with retry disabled (tests should not retry on failure)
export function createTestQueryClient();

// Renders UI wrapped in a QueryClientProvider
export function renderWithClient(ui: ReactNode);

// Returns a Wrapper component for renderHook
export function createWrapper();
```

When writing a new query hook test, import `createWrapper` and pass it via `renderHook`'s options:

```tsx
const wrapper = createWrapper();
const { result } = renderHook(() => useMyHook(), { wrapper });
```

---

## 6. CI Integration

### GitHub Actions (`ci.yml`)

Every push and pull request to `main` triggers the CI pipeline with these jobs:

| Job         | Command                         | What it verifies                                            |
| ----------- | ------------------------------- | ----------------------------------------------------------- |
| `lint`      | `bun run lint` + `cargo clippy` | TypeScript ESLint (0 warnings) + Rust Clippy (no warnings)  |
| `format`    | `bun run format:check`          | Prettier formatting consistency                             |
| `typecheck` | `bun run typecheck`             | TypeScript compilation (`tsc --noEmit`)                     |
| `test`      | `bun run test` + `cargo test`   | Vitest frontend tests + Cargo Rust tests                    |
| `build`     | `bun run build`                 | Full Tauri build (depends on lint, format, typecheck, test) |

Additional non-blocking jobs:

| Job                 | What it verifies                                                      |
| ------------------- | --------------------------------------------------------------------- |
| `pre-release-gates` | No `devMode` references remain; generated types are in sync with Rust |
| `security-audit`    | `cargo audit` for Rust dependency vulnerabilities                     |
| `code-quality`      | (informational) knip, cspell, cargo-udeps                             |

The `test` job runs Rust tests through `dbus-run-session` with a pre-unlocked `gnome-keyring` daemon so keyring-backed token tests work on CI runners.

### PR Requirements

Before merging to `main`:

1. The `lint`, `format`, `typecheck`, `test`, and `build` jobs must all pass.
2. Security audit and pre-release gates should be clean (pre-release gates fail on dev-mode remnants).

---

## 7. Writing New Tests

### General Guidelines

- **One `describe` block per component/hook/function** - use nested `describe` for method grouping when helpful.
- **Reset state in `beforeEach`** - clear mocks (`vi.clearAllMocks()`), reset stores (`usePlayerStore.setState(usePlayerStore.getInitialState(), true)`), restore console spies (`vi.restoreAllMocks()`).
- **Use `userEvent` over `fireEvent`** - `userEvent` produces more realistic interaction sequences (focus, blur, keyboard events).
- **Prefer `screen.getByRole`, `getByLabelText`, `getByText`** - avoid test IDs unless the element has no semantic role or accessible label.
- **Async assertions use `waitFor` or `findBy*` queries** - never use bare timeouts (`setTimeout` / `sleep`).

### Patterns by Test Type

#### Component Tests

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '../path/MyComponent';

// Mock external dependencies
vi.mock('../../lib/api', () => ({ apiCall: vi.fn() }));

describe('MyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the expected content', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('responds to user interaction', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(screen.getByText('Submitted')).toBeInTheDocument();
  });
});
```

#### Query Hook Tests

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMyQuery } from '../useMyQuery';
import { createWrapper } from './test-utils';
import { apiFetchData } from '../../api';

vi.mock('../../api', () => ({ apiFetchData: vi.fn() }));

describe('useMyQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches data successfully', async () => {
    vi.mocked(apiFetchData).mockResolvedValue({ name: 'test' });
    const wrapper = createWrapper();
    const { result } = renderHook(() => useMyQuery('param'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ name: 'test' });
  });

  it('handles errors', { timeout: 15000 }, async () => {
    vi.mocked(apiFetchData).mockRejectedValue(new Error('fail'));
    const wrapper = createWrapper();
    const { result } = renderHook(() => useMyQuery('bad'), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('error'), {
      timeout: 10000,
    });
  });
});
```

#### Store Tests

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { useMyStore } from '../myStore';

describe('myStore', () => {
  beforeEach(() => {
    useMyStore.setState(useMyStore.getInitialState(), true);
  });

  it('has correct defaults', () => {
    const state = useMyStore.getState();
    expect(state.value).toBe(0);
  });

  it('updates via action', () => {
    useMyStore.getState().increment();
    expect(useMyStore.getState().value).toBe(1);
  });
});
```

#### Mocking Strategies

| Scenario                                 | Approach                                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| Module import                            | `vi.mock('../../path/module', () => ({ exportFn: vi.fn() }))`                                |
| Hoisted factory (needed before hoisting) | `const mocks = vi.hoisted(() => ({ ... }))` then `vi.mock('...', () => mocks)`               |
| Typed mock                               | `vi.mocked(importedFunction)` for proper TypeScript inference                                |
| Tauri API                                | `vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))`                               |
| Zustand store                            | Reset in `beforeEach` with `store.setState(store.getInitialState(), true)`                   |
| localStorage                             | `vi.stubGlobal('localStorage', createLocalStorageMock())` with a `Map`-backed implementation |

#### Rust Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    // Pure logic test
    #[test]
    fn test_some_logic() {
        let result = my_function("input");
        assert_eq!(result, "expected");
    }

    // Async test with mockito
    #[tokio::test]
    async fn test_http_call() {
        let mut server = tokio::task::spawn_blocking(|| mockito::Server::new()).await.unwrap();
        let _mock = server.mock("GET", "/path")
            .with_status(200)
            .with_body(r#"{"key": "value"}"#)
            .create();

        let result = my_http_fn(&server.url()).await.unwrap();
        assert_eq!(result.key, "value");
    }

    // Sync test with async runtime
    #[test]
    fn test_async_fn_sync() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let result = my_async_fn().await;
            assert!(result.is_ok());
        });
    }
}
```

### Adding a New Test File

1. Create `__tests__/` next to the source module (if it doesn't exist).
2. Create a test file following the naming convention: `{moduleName}.test.tsx` for frontend.
3. Import dependencies following the existing patterns above.
4. Run `bun run test` to verify the new test passes.
5. For Rust tests, add a `#[cfg(test)] mod tests { ... }` block inline in the source file.
6. Run `bun run test:rust` to verify Rust tests pass.
