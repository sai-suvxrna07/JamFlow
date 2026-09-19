import type { Arrangement } from "@/lib/types";

interface ArrangementTrackListProps {
  arrangement: Arrangement;
}

interface TrackRow {
  name: string;
  enabled: boolean;
  detail: string;
  level: number;
}

export function ArrangementTrackList({ arrangement }: ArrangementTrackListProps) {
  const rows: TrackRow[] = [
    { name: "Guitar", enabled: true, detail: "Original recording", level: 1 },
  ];

  if (arrangement.drums) {
    rows.push({
      name: "Drums",
      enabled: arrangement.drums.enabled,
      detail: arrangement.drums.style,
      level: arrangement.drums.intensity,
    });
  }
  if (arrangement.bass) {
    rows.push({
      name: "Bass",
      enabled: arrangement.bass.enabled,
      detail: arrangement.bass.style,
      level: arrangement.bass.intensity,
    });
  }
  if (arrangement.saxophone) {
    rows.push({
      name: "Saxophone",
      enabled: arrangement.saxophone.enabled,
      detail: arrangement.saxophone.role.replaceAll("_", " "),
      level: arrangement.saxophone.notes.length > 0 ? 1 : 0.3,
    });
  }

  return (
    <div>
      <h2>Arrangement</h2>
      <ul className="mt-4 divide-y divide-line">
        {rows.map((row) => (
          <li
            key={row.name}
            className="flex items-center justify-between gap-4 py-3"
          >
            <div>
              <p className="text-base font-medium">{row.name}</p>
              <p className="text-sm text-muted">{row.detail}</p>
            </div>
            <div className="h-1.5 w-24 rounded-full bg-line">
              <div
                className="h-1.5 rounded-full bg-accent"
                style={{
                  width: `${row.enabled ? Math.round(row.level * 100) : 0}%`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
