import { useState, useCallback } from 'react';
import { getStoredClientId } from '../../features/auth/authStore';
import { ModsSettings } from './Mods';
import { PlaybackSettings } from './Playback';
import { PermissionsSettings } from './Permissions';
import { EqualizerSettings } from './EqualizerSettings';
import { logout } from '../../features/auth/authStore';

interface SettingsViewProps {
  onLogout: () => void;
}

type SettingsTab =
  'playback' | 'mods' | 'permissions' | 'equalizer' | 'account';

export function SettingsView({ onLogout }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('playback');
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const handleLogout = useCallback(async () => {
    await logout();
    onLogout();
  }, [onLogout]);

  return (
    <div className="settings-view">
      <h1 className="page-title" style={{ marginBottom: 'var(--lt-space-xl)' }}>
        Settings
      </h1>
      <nav
        className="settings-tabs"
        aria-label="Settings"
        role="tablist"
        onKeyDown={(e) => {
          const settingsTabs: SettingsTab[] = [
            'playback',
            'mods',
            'permissions',
            'equalizer',
            'account',
          ];
          const idx = settingsTabs.indexOf(activeTab);
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            setActiveTab(settingsTabs[(idx + 1) % settingsTabs.length]);
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            setActiveTab(
              settingsTabs[
                (idx - 1 + settingsTabs.length) % settingsTabs.length
              ],
            );
          }
        }}
      >
        <button
          id="settings-tab-playback"
          role="tab"
          aria-selected={activeTab === 'playback'}
          aria-controls="settings-panel"
          className={`settings-tab${activeTab === 'playback' ? ' settings-tab-active' : ''}`}
          onClick={() => setActiveTab('playback')}
        >
          Playback
        </button>
        <button
          id="settings-tab-mods"
          role="tab"
          aria-selected={activeTab === 'mods'}
          aria-controls="settings-panel"
          className={`settings-tab${activeTab === 'mods' ? ' settings-tab-active' : ''}`}
          onClick={() => setActiveTab('mods')}
        >
          Mods
        </button>
        <button
          id="settings-tab-permissions"
          role="tab"
          aria-selected={activeTab === 'permissions'}
          aria-controls="settings-panel"
          className={`settings-tab${activeTab === 'permissions' ? ' settings-tab-active' : ''}`}
          onClick={() => setActiveTab('permissions')}
        >
          Permissions
        </button>
        <button
          id="settings-tab-equalizer"
          role="tab"
          aria-selected={activeTab === 'equalizer'}
          aria-controls="settings-panel"
          className={`settings-tab${activeTab === 'equalizer' ? ' settings-tab-active' : ''}`}
          onClick={() => setActiveTab('equalizer')}
        >
          Equalizer
        </button>
        <button
          id="settings-tab-account"
          role="tab"
          aria-selected={activeTab === 'account'}
          aria-controls="settings-panel"
          className={`settings-tab${activeTab === 'account' ? ' settings-tab-active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          Account
        </button>
      </nav>
      <div
        className="settings-content"
        role="tabpanel"
        id="settings-panel"
        aria-labelledby={`settings-tab-${activeTab}`}
      >
        {activeTab === 'playback' && <PlaybackSettings />}
        {activeTab === 'mods' && <ModsSettings />}
        {activeTab === 'permissions' && <PermissionsSettings />}
        {activeTab === 'equalizer' && <EqualizerSettings />}
        {activeTab === 'account' && (
          <div className="settings-page">
            <div className="settings-header">
              <h2>Account</h2>
            </div>
            <div className="settings-section">
              <div className="mod-item">
                <div className="mod-item-info">
                  <strong>Client ID</strong>
                  <p
                    className="mod-item-desc"
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 'var(--lt-font-size-xs)',
                    }}
                  >
                    {getStoredClientId() || 'Not configured'}
                  </p>
                </div>
              </div>
            </div>
            <div className="settings-section">
              {!confirmingLogout ? (
                <button
                  className="btn btn-secondary"
                  onClick={() => setConfirmingLogout(true)}
                  style={{
                    color: 'var(--lt-danger, #e74c3c)',
                    borderColor: 'var(--lt-danger, #e74c3c)',
                  }}
                >
                  Log out
                </button>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    gap: 'var(--lt-space-md)',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 'var(--lt-font-size-sm)' }}>
                    Are you sure?
                  </span>
                  <button className="btn btn-primary" onClick={handleLogout}>
                    Confirm logout
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setConfirmingLogout(false)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
