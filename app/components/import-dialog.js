"use client";

import ImportWorkspace from "./import-workspace-v2";

export default function ImportDialog({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="import-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="import-dialog-surface"
        role="dialog"
        aria-modal="true"
        aria-label="导入学习素材"
        onClick={(event) => event.stopPropagation()}
      >
        <ImportWorkspace variant="dialog" onClose={onClose} />
      </div>
    </div>
  );
}
