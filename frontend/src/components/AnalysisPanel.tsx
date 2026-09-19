import type { Arrangement } from "@/lib/types";

interface AnalysisPanelProps {
  arrangement: Arrangement;
}

export function AnalysisPanel({ arrangement }: AnalysisPanelProps) {
  const items: [string, string][] = [
    ["Tempo", `${arrangement.tempo} BPM`],
    ["Key", arrangement.key],
    ["Time signature", arrangement.time_signature],
    ["Style", arrangement.style],
    ["Energy", arrangement.energy],
  ];

  return (
    <div>
      <h2>Listening result</h2>
      <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
        {items.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs uppercase tracking-wide text-muted">
              {label}
            </dt>
            <dd className="text-base font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      {arrangement.notes && (
        <p className="mt-4 text-sm text-muted">{arrangement.notes}</p>
      )}
    </div>
  );
}
