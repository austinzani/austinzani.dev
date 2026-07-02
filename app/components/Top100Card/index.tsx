import { Database } from "../../../db_types";
import LazyImage from "../LazyImage";

const Top100Card = ({
  album,
  onSelect,
  showDateBadge = false,
}: {
  album: Database["public"]["Tables"]["top_100_albums"]["Row"];
  onSelect?: () => void;
  showDateBadge?: boolean;
}) => {
  const releaseDate = new Date(album.release_date).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  return (
    <button className="group w-full text-left" type="button" onClick={onSelect}>
      <div className="relative">
        <LazyImage
          src={album.artwork_url}
          alt={`${album.album} album artwork`}
          className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
          containerClassName="aspect-square overflow-hidden rounded-md bg-paper-muted"
        />
        {showDateBadge ? (
          <span className="absolute right-2 top-2 rounded-full bg-black/75 px-2 py-1 font-mono text-[10px] font-semibold text-white shadow-sm backdrop-blur">
            {releaseDate}
          </span>
        ) : null}
      </div>
      <h2 className="mt-2 line-clamp-1 text-sm font-semibold leading-tight">
        {album.album}
      </h2>
      <p className="mt-0.5 line-clamp-1 font-mono text-xs text-ink-muted">
        {album.artist}
      </p>
    </button>
  );
};

export default Top100Card;
