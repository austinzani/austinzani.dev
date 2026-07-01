import { Accent, accents, useAccent } from "~/utils/accent-provider";

const swatchHex: Record<Accent, string> = {
  [Accent.ORANGE]: "#ff8200",
  [Accent.BLUE]: "#2f80ed",
  [Accent.GREEN]: "#1aa36f",
  [Accent.PINK]: "#e84a8a",
};

const swatchLabels: Record<Accent, string> = {
  [Accent.ORANGE]: "Orange accent",
  [Accent.BLUE]: "Blue accent",
  [Accent.GREEN]: "Green accent",
  [Accent.PINK]: "Pink accent",
};

/**
 * Compact accent-color picker backed by the persisted accent preference.
 */
const AccentSwatchPicker = () => {
  const [accent, setAccent] = useAccent();

  return (
    <div
      className="flex items-center gap-1 rounded-full border border-dashed border-line-muted bg-surface px-1.5 py-1"
      aria-label="Accent color"
    >
      {accents.map((option) => {
        const isSelected = option === accent;
        return (
          <button
            key={option}
            type="button"
            aria-label={swatchLabels[option]}
            aria-pressed={isSelected}
            title={swatchLabels[option]}
            onClick={() => setAccent(option)}
            className={`h-6 w-6 rounded-full border transition ${
              isSelected
                ? "border-ink ring-2 ring-accent ring-offset-2 ring-offset-paper"
                : "border-line-muted hover:scale-110"
            }`}
            style={{ backgroundColor: swatchHex[option] }}
          />
        );
      })}
    </div>
  );
};

export default AccentSwatchPicker;
