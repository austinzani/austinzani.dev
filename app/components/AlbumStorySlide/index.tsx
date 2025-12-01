import { useState, useEffect } from "react";
import { Database } from "../../../db_types";
import IconButton from "../IconButton";

type AlbumRow = Database["public"]["Tables"]["albums_of_the_year"]["Row"];

interface AlbumStorySlideProps {
  album: AlbumRow | null;
  isComingSoon: boolean;
  nextToReveal: number | null;
  year: number;
}

const BLURB_TRUNCATE_LENGTH = 450;

const AlbumStorySlide = ({
  album,
  isComingSoon,
  nextToReveal,
  year,
}: AlbumStorySlideProps) => {
  // Sharing functionality - must be client-side only to avoid hydration mismatch
  const [canShare, setCanShare] = useState(false);
  const [shareObject, setShareObject] = useState<ShareData>({});
  const [showBlurbModal, setShowBlurbModal] = useState(false);

  // Truncation logic for blurbs
  const shouldTruncate =
    album?.blurb && album.blurb.length > BLURB_TRUNCATE_LENGTH;
  const displayBlurb = shouldTruncate
    ? album!.blurb!.slice(0, BLURB_TRUNCATE_LENGTH) + "..."
    : album?.blurb;

  useEffect(() => {
    if (album) {
      try {
        if (
          typeof navigator !== "undefined" &&
          typeof navigator.share !== "undefined" &&
          typeof navigator.canShare === "function"
        ) {
          const shareData = {
            title: `${album.album} by ${album.artist}`,
            text: album.blurb
              ? album.blurb
              : `Check out ${album.album} by ${album.artist}!`,
            url: `https://austinzani.dev/music/story/${album.year}?album=${album.rank}`,
          };
          setShareObject(shareData);
          setCanShare(navigator.canShare(shareData));
        }
      } catch {
        setCanShare(false);
      }
    }
  }, [album]);

  if (isComingSoon) {
    return (
      <div className="w-full max-w-[400px] bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6">
          {/* Festive placeholder SVG */}
          <div className="w-full aspect-square mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 400 400"
              className="rounded-lg w-full h-full"
            >
              <rect width="400" height="400" fill="#c41e3a" />
              <pattern
                id="snowflakes-story"
                x="0"
                y="0"
                width="50"
                height="50"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M25,10 L25,40 M15,20 L35,20 M20,15 L30,25 M20,25 L30,15"
                  stroke="#d42f4a"
                  strokeWidth="2"
                  fill="none"
                />
              </pattern>
              <rect width="400" height="400" fill="url(#snowflakes-story)" />
              <circle
                cx="200"
                cy="200"
                r="150"
                fill="none"
                stroke="#a01830"
                strokeWidth="8"
              />
              <circle
                cx="200"
                cy="200"
                r="50"
                fill="none"
                stroke="#a01830"
                strokeWidth="8"
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
          </div>

          {/* Coming soon text */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Coming Soon!
            </h1>
            {nextToReveal && (
              <p className="text-gray-600 dark:text-gray-400">
                Come back tomorrow for album #{nextToReveal}
              </p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
              {year} Top 25
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!album) {
    return null;
  }

  return (
    <div className="w-full max-w-[400px] flex flex-col items-center">
      {/* Card - contains only artwork, artist, album, platform label */}
      <div className="w-[75%] max-w-[320px] bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden p-4">
        {/* Album artwork */}
        <div className="w-full aspect-square mb-3 relative">
          <img
            src={album.album_art_url}
            alt={`${album.album} album artwork`}
            className="w-full h-full object-cover rounded-lg shadow-md"
          />
        </div>

        {/* Album info inside card */}
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {album.artist}
          </p>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            {album.album}
          </h2>
        </div>
      </div>

      {/* Outside card - rank/title, blurb, buttons */}
      <h1 className="text-xl font-bold text-center text-white mt-4 mb-2 drop-shadow-lg">
        {album.rank}. {album.artist}: {album.album}
      </h1>

      {/* Blurb with Read More */}
      {album.blurb && (
        <div className="text-center mb-4 px-2">
          <p className="text-white/90 text-sm leading-relaxed drop-shadow">
            {displayBlurb}
          </p>
          {shouldTruncate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowBlurbModal(true);
              }}
              className="text-blue-400 text-sm mt-2 font-medium hover:underline"
            >
              Read more
            </button>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-center gap-2">
        <IconButton
          link={album.apple_link}
          icon="apple"
          iconPrefix="fab"
          label="Apple Music"
          className="text-white"
        />
        <IconButton
          link={album.spotify_link}
          icon="spotify"
          iconPrefix="fab"
          label="Spotify"
          className="text-white"
        />
        {album.vinyl_link && (
          <IconButton
            link={album.vinyl_link}
            icon="record-vinyl"
            label="Vinyl"
            className="text-white"
          />
        )}
        {canShare && (
          <IconButton
            onClick={() => {
              navigator.share(shareObject);
            }}
            icon="share"
            label="Share"
            className="text-white"
          />
        )}
      </div>

      {/* Read More Modal */}
      {showBlurbModal && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          onClick={() => setShowBlurbModal(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" />

          {/* Modal Content */}
          <div
            className="relative bg-white dark:bg-zinc-900 rounded-t-2xl w-full max-w-[500px] max-h-[80vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with close button */}
            <div className="sticky top-0 bg-white dark:bg-zinc-900 px-6 pt-6 pb-4 border-b border-gray-200 dark:border-zinc-700">
              <button
                onClick={() => setShowBlurbModal(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white pr-8">
                {album.rank}. {album.album}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {album.artist}
              </p>
            </div>

            {/* Full blurb */}
            <div className="px-6 py-4">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {album.blurb}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlbumStorySlide;
