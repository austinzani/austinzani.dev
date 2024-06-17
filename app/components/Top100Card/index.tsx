import { Database } from "../../../db_types";
import Icon from "../Icon";

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
        "relative max-w-md w-full flex mb-2 border border-gray-300 dark:border-zinc-700 p-2 items-center rounded bg-gray-100 dark:bg-zinc-800"
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
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={album.apple_music_url}
              className={
                "h-10 text-2xl w-10 p-2.5 mx-1 flex items-center justify-c  enter hover:bg-orange-500/60 hover:cursor-pointer rounded-md"
              }
            >
              <Icon name={"apple"} prefix={"fab"} />
            </a>
          )}
          {album.spotify_url && (
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={album.spotify_url}
              className={
                "h-10 text-2xl w-10 p-2.5 mx-1 flex items-center justify-center hover:bg-orange-500/60 hover:cursor-pointer rounded-md"
              }
            >
              <Icon name={"spotify"} prefix={"fab"} />
            </a>
          )}
        </div>
    </div>
  );
};

export default Top100Card;
