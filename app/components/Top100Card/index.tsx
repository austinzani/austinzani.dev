import { Database } from "../../../db_types";
import IconButton from "../IconButton";
import LazyImage from "../LazyImage";

const Top100Card = ({
  album,
}: {
  album: Database["public"]["Tables"]["top_100_albums"]["Row"];
}) => {
  const releaseDate = new Date(album.release_date);
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  return (
    <div className="relative mb-3 flex w-full max-w-md items-center border-2 border-dashed border-line bg-surface p-3">
      <LazyImage
        src={album.artwork_url}
        alt={`${album.album} album artwork`}
        className="h-full w-full object-cover"
        containerClassName="h-28 w-28 aspect-square flex-shrink-0 border border-dashed border-line-muted bg-paper-muted"
      />
      <div className="flex h-full w-full justify-between pl-4">
        <div className="flex h-full flex-col">
          <h1 className="font-display text-3xl italic leading-none">{album.album}</h1>
          <h3 className="mt-1 text-sm text-ink-muted">{album.artist}</h3>
          <p className="mt-2 font-mono text-xs uppercase tracking-wide text-ink-muted">
            Released: {releaseDate.toLocaleDateString("en-US", options)}
          </p>
        </div>
      </div>
      <div className="absolute flex bottom-2 right-2">
        {album.apple_music_url && (
          <IconButton
            link={album.apple_music_url}
            icon="apple"
            iconPrefix="fab"
            label="Apple Music"
          />
        )}
        {album.spotify_url && (
          <IconButton
            link={album.spotify_url}
            icon="spotify"
            iconPrefix="fab"
            label="Spotify"
          />
        )}
      </div>
    </div>
  );
};

export default Top100Card;
