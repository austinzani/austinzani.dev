const avatarPalette = [
  { background: "#ff8200", foreground: "#19130d" },
  { background: "#2f80ed", foreground: "#f6efe3" },
  { background: "#1aa36f", foreground: "#f6efe3" },
  { background: "#e84a8a", foreground: "#f6efe3" },
  { background: "#f5c542", foreground: "#19130d" },
  { background: "#7c5cff", foreground: "#f6efe3" },
];

function hashManagerKey(value: string) {
  return [...value].reduce((hash, character) => {
    return (hash * 31 + character.charCodeAt(0)) >>> 0;
  }, 7);
}

/**
 * Returns a deterministic avatar color for a manager identifier or name.
 */
function getManagerAvatarColor(managerKey: string | number | null | undefined) {
  const normalizedKey = `${managerKey ?? "unknown"}`.trim().toLowerCase();
  return avatarPalette[hashManagerKey(normalizedKey) % avatarPalette.length];
}

function getInitial(name: string | null | undefined) {
  const trimmedName = name?.trim();
  return trimmedName ? trimmedName.charAt(0).toUpperCase() : "?";
}

type ManagerAvatarProps = {
  id?: string | number | null;
  name: string | null | undefined;
  className?: string;
};

const ManagerAvatar = ({ id, name, className }: ManagerAvatarProps) => {
  const color = getManagerAvatarColor(id ?? name);

  return (
    <div
      aria-label={name ? `${name} avatar` : "Manager avatar"}
      className={`flex items-center justify-center rounded-lg border border-dashed border-line font-mono font-bold ${className ?? "h-10 w-10 text-sm"}`}
      style={{ backgroundColor: color.background, color: color.foreground }}
    >
      {getInitial(name)}
    </div>
  );
};

export { getManagerAvatarColor };
export default ManagerAvatar;
