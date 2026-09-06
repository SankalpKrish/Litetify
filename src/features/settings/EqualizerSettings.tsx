import { useState, useEffect } from 'react';

type EqBands = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

const BAND_LABELS = [
  '60',
  '170',
  '310',
  '600',
  '1k',
  '3k',
  '6k',
  '12k',
  '14k',
  '16k',
] as const;

const BUILTIN_PRESETS: Record<string, EqBands> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Rock: [4, 3, 2, 1, 0, 0, 1, 2, 3, 4],
  Pop: [-1, 0, 2, 3, 3, 2, 1, 0, -1, -1],
  Jazz: [3, 2, 1, 0, 0, 1, 2, 3, 2, 1],
  Classical: [4, 3, 1, 0, -1, -1, 0, 1, 3, 4],
  'Bass Boost': [6, 5, 4, 2, 0, -1, -2, -2, -1, 0],
};

const FLAT: EqBands = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

function loadPresets(): Record<string, EqBands> {
  try {
    const raw = localStorage.getItem('litetify:eq:presets');
    if (raw) return JSON.parse(raw);
  } catch {
    /* noop */
  }
  return {};
}

function savePresets(presets: Record<string, EqBands>) {
  localStorage.setItem('litetify:eq:presets', JSON.stringify(presets));
}

export function EqualizerSettings() {
  const [bands, setBands] = useState<EqBands>(() => {
    try {
      const saved = localStorage.getItem('litetify:eq:current');
      if (saved) return JSON.parse(saved) as EqBands;
    } catch {
      /* noop */
    }
    return FLAT;
  });

  const [customPresets, setCustomPresets] =
    useState<Record<string, EqBands>>(loadPresets);
  const [presetName, setPresetName] = useState('');
  const [currentPreset, setCurrentPreset] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('litetify:eq:current', JSON.stringify(bands));
  }, [bands]);

  function setBand(index: number, value: number) {
    setBands((prev) => {
      const next = [...prev] as EqBands;
      next[index] = value;
      return next;
    });
    setCurrentPreset(null);
  }

  function applyPreset(name: string) {
    const all = { ...BUILTIN_PRESETS, ...customPresets };
    const p = all[name];
    if (p) {
      setBands(p);
      setCurrentPreset(name);
    }
  }

  function saveCustomPreset() {
    const name = presetName.trim();
    if (!name) return;
    const all = { ...BUILTIN_PRESETS, ...customPresets };
    if (all[name]) return;
    const updated = { ...customPresets, [name]: bands };
    setCustomPresets(updated);
    savePresets(updated);
    setCurrentPreset(name);
    setPresetName('');
  }

  function deleteCustomPreset(name: string) {
    const updated = { ...customPresets };
    delete updated[name];
    setCustomPresets(updated);
    savePresets(updated);
    if (currentPreset === name) setCurrentPreset(null);
  }

  function resetToFlat() {
    setBands(FLAT);
    setCurrentPreset('Flat');
  }

  const allPresets = { ...BUILTIN_PRESETS, ...customPresets };
  const customKeys = Object.keys(customPresets);

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>Equalizer</h2>
      </div>

      {/* 10 vertical band sliders */}
      <div className="settings-section">
        <div
          style={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}
        >
          {BAND_LABELS.map((label, i) => (
            <div
              key={label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontSize: 'var(--lt-font-size-xs)',
                  color:
                    bands[i] > 0
                      ? 'var(--lt-accent)'
                      : bands[i] < 0
                        ? 'var(--lt-danger, #e74c3c)'
                        : 'var(--lt-fg-tertiary)',
                  marginBottom: 4,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {bands[i] > 0 ? '+' : ''}
                {bands[i]}
              </span>
              <input
                type="range"
                min={-12}
                max={12}
                step={1}
                value={bands[i]}
                onChange={(e) => {
                  setBand(i, Number(e.target.value));
                }}
                style={{
                  writingMode: 'vertical-lr',
                  direction: 'rtl',
                  height: 120,
                  width: 24,
                  cursor: 'pointer',
                  accentColor: 'var(--lt-accent)',
                }}
                aria-label={`${label} Hz band`}
              />
              <span
                style={{
                  fontSize: 'var(--lt-font-size-xs)',
                  color: 'var(--lt-fg-tertiary)',
                  marginTop: 4,
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Preset grid */}
      <div
        className="settings-header"
        style={{ marginTop: 'var(--lt-space-xl)' }}
      >
        <h2>Presets</h2>
      </div>

      <div className="settings-section">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: 'var(--lt-space-md)',
          }}
        >
          {Object.keys(allPresets).map((name) => (
            <button
              key={name}
              className={`btn ${currentPreset === name ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                fontSize: 'var(--lt-font-size-xs)',
                padding: '4px 10px',
              }}
              onClick={() => applyPreset(name)}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Save custom */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveCustomPreset();
            }}
            placeholder="Save current as..."
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: 'var(--lt-radius-sm)',
              border: '1px solid var(--lt-border)',
              background: 'var(--lt-bg-secondary)',
              color: 'var(--lt-fg-primary)',
              fontSize: 'var(--lt-font-size-sm)',
            }}
          />
          <button
            className="btn btn-primary"
            onClick={saveCustomPreset}
            disabled={!presetName.trim()}
          >
            Save
          </button>
        </div>
      </div>

      {/* Reset */}
      <div className="settings-section">
        <button
          className="btn btn-secondary"
          onClick={resetToFlat}
          style={{ width: '100%' }}
        >
          Reset to Flat
        </button>
      </div>

      {/* Delete custom presets */}
      {customKeys.length > 0 && (
        <div className="settings-section">
          <p
            className="mod-item-desc"
            style={{ marginBottom: 'var(--lt-space-sm)' }}
          >
            Custom presets (click × to delete):
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {customKeys.map((name) => (
              <div
                key={name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'var(--lt-bg-secondary)',
                  borderRadius: 'var(--lt-radius-sm)',
                  padding: '2px 8px',
                }}
              >
                <span style={{ fontSize: 'var(--lt-font-size-xs)' }}>
                  {name}
                </span>
                <button
                  onClick={() => deleteCustomPreset(name)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--lt-danger, #e74c3c)',
                    cursor: 'pointer',
                    fontSize: 14,
                    padding: 0,
                    lineHeight: 1,
                  }}
                  aria-label={`Delete preset ${name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
