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
          "relative m-2 flex w-full max-w-full flex-col border-2 border-dashed border-line bg-surface px-6 py-4 sm:max-w-[40rem] sm:flex-row"
        }
        ref={cardRef}
      >
        <div className={"pt-2 sm:pb-2"}>
          <div className={"sm:w-48 w-full min-w-[12rem] relative"}>
            <LazyImage
              src={album.album_art_url}
              alt={`${album.album} album artwork`}
              className="h-full w-full object-cover"
              containerClassName="aspect-square border border-dashed border-line-muted bg-paper-muted"
            />
            <h1
              className={
                "absolute -left-3 -top-3 flex h-10 w-10 items-center justify-center border-2 border-dashed border-line bg-accent font-mono text-xl font-bold text-accent-ink"
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
          <h1 className={"font-display text-4xl italic leading-none"}>{album.album}</h1>
          <h3 className={"mt-1 text-sm text-ink-muted"}>{album.artist}</h3>
          {album.blurb && (
            <p className={"mt-4 text-sm leading-relaxed text-ink-muted"}>{album.blurb}</p>
          )}
        </div>
      </div>
    );
  } else {
    return (
      <div
        className={
          "relative m-2 flex w-full max-w-full flex-col border-2 border-dashed border-line bg-surface px-6 py-4 sm:max-w-[40rem] sm:flex-row"
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
                "absolute -left-3 -top-3 flex h-10 w-10 items-center justify-center border-2 border-dashed border-line bg-accent font-mono text-xl font-bold text-accent-ink"
              }
            >
              {number}
            </h1>
          </div>
        </div>
        <div className={"flex flex-col sm: p-4"}>
          <h1 className={"font-display text-4xl italic"}>Coming Soon!</h1>
          <h3 className={"font-mono text-xs uppercase tracking-wide text-ink-muted"}>{album.reveal_date}</h3>
        </div>
      </div>
    );
  }
};

export default AlbumOfTheYearListCard;
