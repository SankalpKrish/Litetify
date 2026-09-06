import { useState, useCallback } from 'react';
import { apiCreatePlaylist } from '../../lib/api';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function CreatePlaylistDialog({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);

  const create = useCallback(async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await apiCreatePlaylist(name.trim(), desc.trim() || undefined, false);
      onCreated();
      onClose();
    } catch {
      /* noop */
    }
    setBusy(false);
  }, [name, desc, onCreated, onClose]);

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="dialog-title">Create Playlist</h3>
        <input
          className="dialog-input"
          placeholder="Playlist name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <input
          className="dialog-input"
          placeholder="Description (optional)"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={create}
            disabled={!name.trim() || busy}
          >
            {busy ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
