import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getStoredClientId } from '../auth/authStore';

interface FeatureScope {
  id: string;
  name: string;
  description: string;
  scopes: string[];
  enabled: boolean;
}

const FEATURES: Omit<FeatureScope, 'enabled'>[] = [
  {
    id: 'stats',
    name: 'Listening Stats',
    description: 'Shows your top artists, tracks, and listening history',
    scopes: ['user-top-read', 'user-read-recently-played'],
  },
];

export function PermissionsSettings() {
  const [features, setFeatures] = useState<FeatureScope[]>([]);
  const [grantedScopes, setGrantedScopes] = useState<string[]>([]);
  const [needsReauth, setNeedsReauth] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load granted scopes and check which features are enabled
  useEffect(() => {
    async function loadPermissions() {
      try {
        const granted = await invoke<string[]>('get_granted_scopes_command');
        setGrantedScopes(granted);

        // A feature is "enabled" if all its scopes are granted
        const loaded = FEATURES.map((f) => ({
          ...f,
          enabled: f.scopes.every((s) => granted.includes(s)),
        }));
        setFeatures(loaded);
      } catch (err) {
        console.error('Failed to load permissions:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPermissions();
  }, []);

  const handleToggle = useCallback(
    async (featureId: string) => {
      const feature = features.find((f) => f.id === featureId);
      if (!feature) return;

      const newEnabled = !feature.enabled;

      // Update UI immediately
      setFeatures((prev) =>
        prev.map((f) =>
          f.id === featureId ? { ...f, enabled: newEnabled } : f,
        ),
      );

      if (newEnabled) {
        // Check if re-auth is needed
        const enabledFeatures = features
          .filter((f) => (f.id === featureId ? newEnabled : f.enabled))
          .map((f) => f.id);

        try {
          const needed = await invoke<string[]>('check_reauth_needed', {
            enabledFeatures,
          });
          setNeedsReauth(needed);
        } catch (err) {
          console.error('Failed to check reauth:', err);
        }
      } else {
        setNeedsReauth([]);
      }
    },
    [features],
  );

  const handleReauth = useCallback(async () => {
    const clientId = getStoredClientId();
    if (!clientId) return;

    const enabledFeatures = features.filter((f) => f.enabled).map((f) => f.id);

    try {
      await invoke('login', { clientId, enabledFeatures });
      // Reload granted scopes after re-auth
      const granted = await invoke<string[]>('get_granted_scopes_command');
      setGrantedScopes(granted);
      setNeedsReauth([]);

      // Update features
      setFeatures((prev) =>
        prev.map((f) => ({
          ...f,
          enabled: f.scopes.every((s) => granted.includes(s)),
        })),
      );
    } catch (err) {
      console.error('Re-auth failed:', err);
    }
  }, [features]);

  if (loading) {
    return <div className="settings-section">Loading permissions...</div>;
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>Permissions</h2>
      </div>

      <div className="settings-section">
        <p
          style={{
            fontSize: 'var(--lt-font-size-sm)',
            color: 'var(--lt-fg-secondary)',
            marginBottom: 'var(--lt-space-lg)',
          }}
        >
          Choose which features can access additional Spotify data. You can
          enable or disable features without re-authenticating once the
          permissions have been granted.
        </p>

        {features.map((feature) => (
          <div key={feature.id} className="mod-item">
            <div className="mod-item-info">
              <strong>{feature.name}</strong>
              <p className="mod-item-desc">{feature.description}</p>
              <p
                className="mod-item-desc"
                style={{
                  fontFamily: 'monospace',
                  fontSize: 'var(--lt-font-size-xs)',
                }}
              >
                Scopes: {feature.scopes.join(', ')}
              </p>
            </div>
            <div className="mod-item-actions">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={feature.enabled}
                  onChange={() => handleToggle(feature.id)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        ))}
      </div>

      {needsReauth.length > 0 && (
        <div className="settings-section">
          <div
            style={{
              padding: 'var(--lt-space-md)',
              background: 'var(--lt-bg-highlight)',
              borderRadius: 'var(--lt-radius-md)',
              border: '1px solid var(--lt-border)',
            }}
          >
            <p
              style={{
                fontSize: 'var(--lt-font-size-sm)',
                marginBottom: 'var(--lt-space-md)',
              }}
            >
              <strong>Additional permissions needed:</strong>
            </p>
            <p
              style={{
                fontSize: 'var(--lt-font-size-xs)',
                color: 'var(--lt-fg-secondary)',
                marginBottom: 'var(--lt-space-md)',
              }}
            >
              {needsReauth.join(', ')}
            </p>
            <button className="btn btn-primary" onClick={handleReauth}>
              Authorize additional permissions
            </button>
          </div>
        </div>
      )}

      <div className="settings-section">
        <h3
          style={{
            fontSize: 'var(--lt-font-size-md)',
            marginBottom: 'var(--lt-space-sm)',
          }}
        >
          Granted Permissions
        </h3>
        {grantedScopes.length > 0 ? (
          <ul
            style={{
              fontSize: 'var(--lt-font-size-xs)',
              color: 'var(--lt-fg-secondary)',
            }}
          >
            {grantedScopes.map((scope) => (
              <li key={scope} style={{ fontFamily: 'monospace' }}>
                {scope}
              </li>
            ))}
          </ul>
        ) : (
          <p
            style={{
              fontSize: 'var(--lt-font-size-xs)',
              color: 'var(--lt-fg-tertiary)',
            }}
          >
            No permissions granted yet
          </p>
        )}
      </div>
    </div>
  );
}
