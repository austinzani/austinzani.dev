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
    <div className="relative w-full max-w-md flex mb-2 p-3 items-center rounded-lg bg-gray-50 dark:bg-zinc-900 shadow-sm dark:shadow-none">
      <LazyImage
        src={album.artwork_url}
        alt={`${album.album} album artwork`}
        className="w-full h-full object-cover rounded-lg shadow-sm"
        containerClassName="h-28 w-28 aspect-square rounded-lg flex-shrink-0"
      />
      <div className="h-full flex justify-between w-full pl-4">
        <div className="h-full flex flex-col">
          <h1 className="text-xl font-medium">{album.album}</h1>
          <h3 className="text-sm text-gray-600 dark:text-gray-400">{album.artist}</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
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
