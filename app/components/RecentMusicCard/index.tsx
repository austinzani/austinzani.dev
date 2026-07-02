import { Database } from "../../../db_types";
import Icon from "../Icon";
import LazyImage from "../LazyImage";

const RecentMusicCard = ({
  recentObject,
  relativeTime,
  onSelect,
  onShare,
}: {
  recentObject: Database["public"]["Tables"]["music_history"]["Row"];
  relativeTime?: string;
  onSelect?: () => void;
  onShare?: () => void;
}) => {
  const isAlbum = recentObject.type === "ALBUM";

  return (
    <div className="flex gap-4 px-1 py-5 sm:gap-6">
      <button
        type="button"
        className="group h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-paper-muted sm:h-28 sm:w-28"
        onClick={onSelect}
        aria-label={`Open ${recentObject.title}`}
      >
        <LazyImage
          src={recentObject.album_art_url}
          alt={`${recentObject.title} artwork`}
          className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
          containerClassName="h-full w-full"
        />
      </button>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-line-muted px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
            {isAlbum ? "Album" : "Song"}
          </span>
          {relativeTime ? (
            <span className="font-mono text-xs text-ink-muted">{relativeTime}</span>
          ) : null}
        </div>
        <button
          type="button"
          className="block max-w-full text-left font-display text-3xl leading-none hover:text-accent"
          onClick={onSelect}
        >
          <span className="line-clamp-2">{recentObject.title}</span>
        </button>
        <p className="mt-1 text-sm font-medium text-ink-muted">{recentObject.artist}</p>
        {recentObject.blurb ? (
          <p className="mt-3 max-w-[44rem] text-[15px] leading-relaxed text-ink-muted">
            {recentObject.blurb}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {recentObject.apple_music_url ? (
            <a
              href={recentObject.apple_music_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-white transition hover:bg-zinc-800"
              onClick={(event) => event.stopPropagation()}
            >
              <Icon name="apple" prefix="fab" className="h-3.5 w-3.5" />
              Play on Apple Music
            </a>
          ) : null}
          {recentObject.spotify_url ? (
            <a
              href={recentObject.spotify_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#1DB954] px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-black transition hover:bg-[#1ed760]"
              onClick={(event) => event.stopPropagation()}
            >
              <Icon name="spotify" prefix="fab" className="h-3.5 w-3.5" />
              Play on Spotify
            </a>
          ) : null}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onShare?.();
            }}
            className="rounded-full border border-line-muted px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-muted transition hover:border-accent hover:text-accent"
          >
            Share
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecentMusicCard;
