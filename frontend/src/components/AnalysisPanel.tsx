import type { Arrangement } from "@/lib/types";

interface AnalysisPanelProps {
  arrangement: Arrangement;
  onTempoChange: (tempo: number) => void;
}

export function AnalysisPanel({ arrangement, onTempoChange }: AnalysisPanelProps) {
  const items: [string, string][] = [
    ["Instrument", arrangement.instrument],
    ["Key", arrangement.key],
    ["Time signature", arrangement.time_signature],
    ["Style", arrangement.style],
    ["Energy", arrangement.energy],
  ];

  return (
    <div>
      <h2>Listening result</h2>
      <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted">Tempo</dt>
          <dd className="flex items-baseline gap-1 text-base font-medium">
            <input
              type="number"
              min={20}
              max={300}
              value={arrangement.tempo}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (!Number.isNaN(value)) onTempoChange(value);
              }}
              className="w-16 border-b border-line bg-transparent outline-none focus:border-accent"
            />
            <span className="text-muted">BPM</span>
          </dd>
        </div>
        {items.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs uppercase tracking-wide text-muted">
              {label}
            </dt>
            <dd className="text-base font-medium capitalize">{value}</dd>
          </div>
        ))}
      </dl>
      {arrangement.notes && (
        <p className="mt-4 text-sm text-muted">{arrangement.notes}</p>
      )}
    </div>
  );
}
