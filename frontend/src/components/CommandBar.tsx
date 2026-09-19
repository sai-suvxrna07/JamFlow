"use client";

import { useState } from "react";

interface CommandBarProps {
  onSubmit: (instruction: string) => void;
  disabled?: boolean;
}

const SUGGESTIONS = [
  "Add drums that sit in the pocket without crowding the melody",
  "Add a bass line that locks in with the kick drum",
  "Add saxophone that answers my melody instead of playing over it",
  "Layer the arrangement so each instrument has its own space",
  "Add dynamics — build energy into the second half",
  "Make the mix feel less cluttered and more focused",
];

export function CommandBar({ onSubmit, disabled }: CommandBarProps) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue("");
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          placeholder="Tell JamFlow what to change…"
          className="flex-1 border-b border-line bg-transparent py-2 text-base outline-none placeholder:text-muted focus:border-accent disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={disabled}
          className="text-sm font-semibold text-accent disabled:opacity-40"
        >
          Send
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onSubmit(s)}
            className="text-sm text-muted underline decoration-line underline-offset-4 hover:text-foreground disabled:opacity-40"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
