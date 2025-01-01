import { useEffect, useRef, useState } from "react";
import { Database } from "../../../db_types";
import Icon from "../Icon";
import Modal from "../Modal";
import IconButton from "../IconButton";

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
  const [imageLoaded, setImageLoaded] = useState(false);
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
          text: album.blurb
            ? album.blurb
            : `Check out ${album.album} by ${album.artist}!`,
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
            <div className="aspect-square relative">
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gray-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
              )}
              <img 
                className={`min-h-48 min-w-48 rounded-lg shadow-sm ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                src={album.album_art_url}
                onLoad={() => setImageLoaded(true)}
                alt={`${album.album} album artwork`}
              />
            </div>
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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
              <rect width="400" height="400" fill="#c41e3a" />

              <pattern
                id="snowflakes"
                x="0"
                y="0"
                width="50"
                height="50"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M25,10 L25,40 M15,20 L35,20 M20,15 L30,25 M20,25 L30,15"
                  stroke="#d42f4a"
                  stroke-width="2"
                  fill="none"
                />
              </pattern>
              <rect width="400" height="400" fill="url(#snowflakes)" />

              <circle
                cx="200"
                cy="200"
                r="150"
                fill="none"
                stroke="#a01830"
                stroke-width="8"
              />

              <circle
                cx="200"
                cy="200"
                r="50"
                fill="none"
                stroke="#a01830"
                stroke-width="8"
              />

              <rect x="0" y="175" width="400" height="50" fill="#2f8f3f" />
              <rect x="0" y="180" width="400" height="40" fill="#3aa14f" />
              <rect x="175" y="0" width="50" height="400" fill="#2f8f3f" />
              <rect x="180" y="0" width="40" height="400" fill="#3aa14f" />

              <g transform="translate(200,200)">
                <path
                  d="M-30,-20 C-60,-20 -60,20 -30,20 C-15,20 -15,-20 -30,-20"
                  fill="#3aa14f"
                />
                <path
                  d="M30,-20 C60,-20 60,20 30,20 C15,20 15,-20 30,-20"
                  fill="#3aa14f"
                />
                <rect
                  x="-15"
                  y="-25"
                  width="30"
                  height="50"
                  fill="#2f8f3f"
                  rx="5"
                />
                <path d="M-10,25 L-20,70 L0,70 Z" fill="#3aa14f" />
                <path d="M10,25 L20,70 L0,70 Z" fill="#3aa14f" />
              </g>

              <rect
                x="0"
                y="175"
                width="400"
                height="2"
                fill="rgba(0,0,0,0.1)"
              />
              <rect
                x="175"
                y="0"
                width="2"
                height="400"
                fill="rgba(0,0,0,0.1)"
              />
            </svg>
            <h1
              className={
                "absolute -top-2 -left-2 w-8 h-8 text-xl bg-orange-500 rounded-full flex items-center justify-center text-white"
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
