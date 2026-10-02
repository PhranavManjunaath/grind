import { useRef } from 'react';
import { Download, Upload, Trash2, Moon } from 'lucide-react';

export default function Settings({ onClearData, onExport, onImport }) {
  const fileRef = useRef(null);

  function handleImportClick() {
    fileRef.current?.click();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) onImport(file);
    e.target.value = '';
  }

  function handleClear() {
    if (window.confirm('Clear all habit data? This cannot be undone.')) {
      onClearData();
    }
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-text mb-2">Settings</h2>

      <div className="bg-panel border border-panel-border rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-panel-soft text-text-muted">
            <Moon size={16} />
          </div>
          <div>
            <div className="text-sm text-text font-medium">Theme</div>
            <div className="text-xs text-text-dim">Dark (default for this dashboard)</div>
          </div>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-text-dim px-2 py-1 rounded-full bg-panel-soft">
          Dark
        </span>
      </div>

      <div className="bg-panel border border-panel-border rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-panel-soft text-text-muted">
            <Download size={16} />
          </div>
          <div>
            <div className="text-sm text-text font-medium">Export Data</div>
            <div className="text-xs text-text-dim">Download all habits and completions as JSON</div>
          </div>
        </div>
        <button
          onClick={onExport}
          className="text-xs font-medium text-accent hover:text-week-6 bg-accent/10 hover:bg-accent/20 px-3 py-1.5 rounded-lg transition-colors"
        >
          Export
        </button>
      </div>

      <div className="bg-panel border border-panel-border rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-panel-soft text-text-muted">
            <Upload size={16} />
          </div>
          <div>
            <div className="text-sm text-text font-medium">Import Data</div>
            <div className="text-xs text-text-dim">Restore from a previously exported JSON file</div>
          </div>
        </div>
        <button
          onClick={handleImportClick}
          className="text-xs font-medium text-week-2 hover:brightness-110 bg-week-2/10 hover:bg-week-2/20 px-3 py-1.5 rounded-lg transition-colors"
        >
          Import
        </button>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={handleFileChange} />
      </div>

      <div className="bg-panel border border-panel-border rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-week-4/10 text-week-4">
            <Trash2 size={16} />
          </div>
          <div>
            <div className="text-sm text-text font-medium">Clear All Data</div>
            <div className="text-xs text-text-dim">Permanently delete all habits and progress</div>
          </div>
        </div>
        <button
          onClick={handleClear}
          className="text-xs font-medium text-week-4 hover:brightness-110 bg-week-4/10 hover:bg-week-4/20 px-3 py-1.5 rounded-lg transition-colors"
        >
          Clear Data
        </button>
      </div>
    </div>
  );
}
