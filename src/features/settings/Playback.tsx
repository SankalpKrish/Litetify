import { useState } from 'react';
import { usePlayerStore } from '../player/playerStore';
import type { EngineType } from '../player/playerStore';
import {
  getAutoQueueEnabled,
  setAutoQueueEnabled,
  getAutoQueueSeedStrategy,
  setAutoQueueSeedStrategy,
  type SeedStrategy,
} from '../player/autoQueue';
import {
  getCrossfadeEnabled,
  setCrossfadeEnabled,
  getCrossfadeDuration,
  setCrossfadeDuration,
  getGaplessEnabled,
  setGaplessEnabled,
} from '../player/crossfade';

export function PlaybackSettings() {
  const [current, setCurrent] = useState<EngineType>(
    usePlayerStore.getState().engineType,
  );
  const [showWarning, setShowWarning] = useState(false);
  const [pending, setPending] = useState<EngineType | null>(null);
  const [autoQueueEnabled, setAutoQueueEnabledState] =
    useState(getAutoQueueEnabled);
  const [seedStrategy, setSeedStrategyState] = useState<SeedStrategy>(
    getAutoQueueSeedStrategy,
  );
  const [crossfadeOn, setCrossfadeOn] = useState(getCrossfadeEnabled);
  const [crossfadeSec, setCrossfadeSec] = useState(getCrossfadeDuration);
  const [gaplessOn, setGaplessOn] = useState(getGaplessEnabled);

  function handleToggle() {
    const next: EngineType = current === 'websdk' ? 'librespot' : 'websdk';
    if (next === 'librespot') {
      setPending(next);
      setShowWarning(true);
    } else {
      applySwitch(next);
    }
  }

  function applySwitch(t: EngineType) {
    usePlayerStore.getState().setEngineType(t);
    setCurrent(t);
    setShowWarning(false);
    setPending(null);
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>Playback Engine</h2>
      </div>

      <div className="settings-section">
        <div className="mod-item">
          <div className="mod-item-info">
            <strong>Native audio engine (experimental, unofficial)</strong>
            <p className="mod-item-desc">
              Use librespot for local audio playback instead of the Spotify Web
              Playback SDK.
              {current === 'librespot' && (
                <span
                  style={{
                    display: 'block',
                    marginTop: 4,
                    color: 'var(--lt-accent)',
                    fontWeight: 600,
                  }}
                >
                  Active — restart required to switch
                </span>
              )}
              {current === 'websdk' && (
                <span
                  style={{
                    display: 'block',
                    marginTop: 4,
                    color: 'var(--lt-fg-tertiary)',
                    fontSize: 'var(--lt-font-size-xs)',
                  }}
                >
                  Default — changes apply after restart
                </span>
              )}
            </p>
          </div>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={current === 'librespot'}
              onChange={handleToggle}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      <div
        className="settings-header"
        style={{ marginTop: 'var(--lt-space-xl)' }}
      >
        <h2>Auto-Queue</h2>
      </div>

      <div className="settings-section">
        <div className="mod-item">
          <div className="mod-item-info">
            <strong>Auto-queue similar tracks</strong>
            <p className="mod-item-desc">
              Automatically queue a similar track when the current track ends
              and the queue is empty.
            </p>
          </div>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={autoQueueEnabled}
              onChange={() => {
                const next = !autoQueueEnabled;
                setAutoQueueEnabledState(next);
                setAutoQueueEnabled(next);
              }}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      {autoQueueEnabled && (
        <>
          <div className="settings-section">
            <div className="mod-item">
              <div className="mod-item-info">
                <strong>Seed strategy</strong>
                <p className="mod-item-desc">
                  Currently:{' '}
                  {seedStrategy === 'current'
                    ? 'Current track only'
                    : 'Mixed with top tracks'}
                  . Click to switch to{' '}
                  {seedStrategy === 'current'
                    ? 'mixed seeds (more variety)'
                    : 'current track only (more consistent)'}
                  .
                </p>
              </div>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={seedStrategy === 'mix'}
                  onChange={() => {
                    const next: SeedStrategy =
                      seedStrategy === 'current' ? 'mix' : 'current';
                    setSeedStrategyState(next);
                    setAutoQueueSeedStrategy(next);
                  }}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        </>
      )}

      <div
        className="settings-header"
        style={{ marginTop: 'var(--lt-space-xl)' }}
      >
        <h2>Crossfade &amp; Gapless</h2>
      </div>

      <div className="settings-section">
        <div className="mod-item">
          <div className="mod-item-info">
            <strong>Gapless playback</strong>
            <p className="mod-item-desc">
              Remove gaps between tracks. Requires librespot engine for full
              effect.
            </p>
          </div>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={gaplessOn}
              onChange={() => {
                const n = !gaplessOn;
                setGaplessOn(n);
                setGaplessEnabled(n);
              }}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      <div className="settings-section">
        <div className="mod-item">
          <div className="mod-item-info">
            <strong>Crossfade</strong>
            <p className="mod-item-desc">
              Fade out the ending of one track into the beginning of the next.
            </p>
          </div>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={crossfadeOn}
              onChange={() => {
                const n = !crossfadeOn;
                setCrossfadeOn(n);
                setCrossfadeEnabled(n);
              }}
            />
            <span className="toggle-slider" />
          </label>
        </div>
        {crossfadeOn && (
          <div
            className="settings-slider-row"
            style={{
              marginTop: 'var(--lt-space-md)',
              paddingLeft: 'var(--lt-space-md)',
            }}
          >
            <span className="mod-item-desc">{crossfadeSec}s</span>
            <input
              type="range"
              min={0}
              max={12}
              step={1}
              value={crossfadeSec}
              onChange={(e) => {
                const v = Number(e.target.value);
                setCrossfadeSec(v);
                setCrossfadeDuration(v);
              }}
              className="settings-slider"
              aria-label="Crossfade duration in seconds"
            />
            <span className="mod-item-desc">12s</span>
          </div>
        )}
      </div>

      {showWarning && (
        <div
          className="engine-warning-overlay"
          onClick={() => setShowWarning(false)}
        >
          <div
            className="engine-warning-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Unofficial Engine Warning</h3>
            <div className="engine-warning-body">
              <p>
                <strong>librespot</strong> is an{' '}
                <strong>open-source, third-party</strong> Spotify client library
                not affiliated with or endorsed by Spotify AB.
              </p>
              <p>By enabling this engine:</p>
              <ul>
                <li>
                  Audio plays directly from your machine, not through Spotify's
                  Web Playback SDK.
                </li>
                <li>This may violate Spotify's Terms of Service.</li>
                <li>
                  Some features (Spotify Connect, remote control) may not work.
                </li>
                <li>
                  This is experimental — you may encounter bugs or audio issues.
                </li>
              </ul>
              <p className="engine-warning-disclaimer">
                Litetify is not responsible for any account actions taken by
                Spotify as a result of using this engine. Use at your own risk.
              </p>
            </div>
            <div className="engine-warning-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowWarning(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => pending && applySwitch(pending)}
              >
                I Understand, Enable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
