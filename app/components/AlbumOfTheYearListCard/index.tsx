import { useEffect, useRef } from "react";
import { Database } from "../../../db_types";
import IconButton from "../IconButton";
import LazyImage from "../LazyImage";

export type UpcomingAlbum = {
  upcoming: true;
  rank: number;
  reveal_date: string;
  year: number;
};

const AlbumOfTheYearListCard = ({
  album,
  number,
  shouldScroll = false,
}: {
  album:
    | Database["public"]["Tables"]["albums_of_the_year"]["Row"]
    | UpcomingAlbum;
  number: number;
  shouldScroll?: boolean;
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  let canShare = false;
  let shareObject = {};

  useEffect(() => {
    if (shouldScroll && cardRef.current) {
      setTimeout(() => {
        if (cardRef.current) {
          const topOffset = cardRef.current.getBoundingClientRect().top + window.scrollY - 58;
          window.scrollTo({
            top: topOffset,
            behavior: "smooth",
          });
        }
      }, 100);
    }
  }, [shouldScroll]);
  try {
    if ("album" in album) {
      // First check if the Share API is supported at all
      if (
        typeof navigator.share !== "undefined" &&
        typeof navigator.canShare === "function"
      ) {
        shareObject = {
          title: `${album.album} by ${album.artist}`,
          url: `https://austinzani.dev/music?year=${album.year}&album=${album.rank}`,
        };

        // Check if this specific content can be shared
        canShare = navigator.canShare(shareObject);
        console.log("Can share:", canShare);
      }
    }
  } catch (error) {
    console.error("Share error:", error);
    canShare = false;
  }

  if (!("upcoming" in album)) {
    return (
      <div
        className={
          "flex flex-col sm:flex-row w-full max-w-full sm:max-w-[40rem] relative py-4 px-6 rounded-lg bg-gray-50 dark:bg-zinc-900 m-2 shadow-sm dark:shadow-none"
        }
        ref={cardRef}
      >
        <div className={"pt-2 sm:pb-2"}>
          <div className={"sm:w-48 w-full min-w-[12rem] relative"}>
            <LazyImage
              src={album.album_art_url}
              alt={`${album.album} album artwork`}
              className="w-full h-full object-cover rounded-lg shadow-sm"
              containerClassName="aspect-square rounded-lg"
            />
            <h1
              className={
                "absolute -top-3 -left-3 w-10 h-10 text-xl bg-orange-500 rounded-md flex items-center justify-center text-white font-bold shadow-sm"
              }
            >
              {number}
            </h1>
          </div>
          <div className={"flex flex-row justify-center mt-2"}>
            <IconButton
              link={album.apple_link}
              icon={"apple"}
              iconPrefix="fab"
              label="Apple Music"
            />
            <IconButton
              link={album.spotify_link}
              icon={"spotify"}
              iconPrefix="fab"
              label="Spotify"
            />
            {album.vinyl_link && (
              <IconButton
                link={album.vinyl_link}
                icon={"record-vinyl"}
                label="Vinyl"
              />
            )}
            {canShare && (
              <IconButton
                onClick={() => {
                  navigator.share(shareObject);
                }}
                icon="share"
                label="Share"
              />
            )}
          </div>
        </div>
        <div className={"flex flex-col sm:p-4 sm:pl-6"}>
          <h1 className={"text-2xl font-medium"}>{album.album}</h1>
          <h3 className={"text-sm text-gray-600 dark:text-gray-400"}>{album.artist}</h3>
          {album.blurb && (
            <p className={"text-sm mt-4 text-gray-600 dark:text-gray-400 leading-relaxed"}>{album.blurb}</p>
          )}
        </div>
      </div>
    );
  } else {
    return (
      <div
        className={
          "flex flex-col sm:flex-row w-full max-w-full sm:max-w-[40rem] relative py-4 px-6 rounded-lg bg-gray-50 dark:bg-zinc-900 m-2 shadow-sm dark:shadow-none"
        }
        ref={cardRef}
      >
        <div className={"pt-4 sm:pb-2"}>
          <div className={"sm:w-48 w-full min-w-[12rem] relative"}>
            <img
              src="/images/christmas-present.svg"
              alt="Coming soon gift"
              className="aspect-square rounded-lg"
            />
            <h1
              className={
                "absolute -top-3 -left-3 w-10 h-10 text-xl bg-orange-500 rounded-md flex items-center justify-center text-white font-bold shadow-sm"
              }
            >
              {number}
            </h1>
          </div>
        </div>
        <div className={"flex flex-col sm: p-4"}>
          <h1 className={"text-2xl"}>Coming Soon!</h1>
          <h3 className={"text-md text-zinc-400"}>{album.reveal_date}</h3>
        </div>
      </div>
    );
  }
};

export default AlbumOfTheYearListCard;
