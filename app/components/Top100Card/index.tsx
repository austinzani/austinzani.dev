import { Database } from "../../../db_types";
import Icon from "../Icon";
import IconButton from "../IconButton";

const Top100Card = ({
  album,
}: {
  album: Database["public"]["Tables"]["top_100_albums"]["Row"];
}) => {
    // Format the album release date to be formated as "Month Day, Year"
    const releaseDate = new Date(album.release_date)
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
  return (
    <div
      className={
        "relative max-w-md w-full flex mb-2 border border-gray-300 dark:border-zinc-700 p-2 items-center rounded bg-gray-100 dark:bg-zinc-900"
      }
    >
      <img className={"h-28 w-28"} src={album.artwork_url} />
      <div className={"h-full flex justify-between w-full p-1"}>
        <div className={"h-full flex flex-col pl-1"}>
          <h1 className={"text-xl font-medium"}>{album.album}</h1>
          <h3 className={"text-sm text-gray-500 dark:text-gray-400"}>{album.artist}</h3>
          <p className={"text-xs text-gray-500 dark:text-gray-400"}>Released: {releaseDate.toLocaleDateString('en-US', options)}</p>
        </div>
      </div>
      <div className={"absolute flex bottom-1 right-1"}>
          {album.apple_music_url && (
            <IconButton
              link={album.apple_music_url}
              icon={"apple"}
              iconPrefix="fab"
              label={"Apple Music"}
            />
          )}
          {album.spotify_url && (
            <IconButton
              link={album.spotify_url}
              icon={"spotify"}
              iconPrefix="fab"
              label={"Spotify"}
              />
          )}
        </div>
    </div>
  );
};

export default Top100Card;
