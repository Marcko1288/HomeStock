import { AlertCircle, CheckCircle2, Info } from "lucide-react";

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };

export function Toast({ toast, onAction }) {
  const Icon = ICONS[toast.tone] || Info;
  return (
    <div className={`toast toast--${toast.tone}`}>
      <Icon aria-hidden="true" className="toast__icon" />
      <span className="toast__msg">{toast.message}</span>
      {toast.action && (
        <button type="button" className="toast__action" onClick={onAction}>
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
