"use client";

export interface DebugEntry {
  time: string;
  action: "analyze" | "command";
  status: "success" | "error";
  detail: string;
}

interface DebugPanelProps {
  entries: DebugEntry[];
  apiUrl: string;
}

export function DebugPanel({ entries, apiUrl }: DebugPanelProps) {
  return (
    <details className="mt-10 border-t border-line pt-6">
      <summary className="cursor-pointer text-sm font-semibold text-muted hover:text-foreground">
        Debug log
      </summary>
      <div className="mt-4 space-y-3">
        <p className="text-xs text-muted">
          Backend: <span className="font-mono">{apiUrl}</span>
        </p>
        {entries.length === 0 ? (
          <p className="text-sm text-muted">No requests yet.</p>
        ) : (
          <ul className="space-y-2">
            {entries
              .slice()
              .reverse()
              .map((entry, i) => (
                <li key={i} className="text-sm">
                  <span className="font-mono text-xs text-muted">
                    {entry.time}
                  </span>{" "}
                  <span
                    className={
                      entry.status === "error"
                        ? "font-semibold text-accent"
                        : "font-semibold"
                    }
                  >
                    {entry.action} — {entry.status}
                  </span>
                  <pre className="mt-1 whitespace-pre-wrap break-words rounded bg-[#f2efe9] p-2 font-mono text-xs text-foreground">
                    {entry.detail}
                  </pre>
                </li>
              ))}
          </ul>
        )}
      </div>
    </details>
  );
}
