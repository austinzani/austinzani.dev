import React, { useCallback, useEffect, useRef, useState } from "react";
import { LoaderFunctionArgs, MetaFunction, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import supabase from "~/utils/supabase";

type NormalizedAlbum = {
  album: string;
  artist: string;
  spotifyUrl: string | null;
  appleMusicUrl: string | null;
  artworkUrl: string;
};

export const meta: MetaFunction = () => {
  return [
    { title: "Random Album | Austin's Music" },
    { property: "og:title", content: "Random Album Picker" },
    { property: "og:description", content: "Let fate choose your next album" },
  ];
};

// Convert Spotify web URL to app URI (used in loader for direct redirect)
function getSpotifyAppUriFromUrl(webUrl: string | null): string | null {
  if (!webUrl) return null;
  const match = webUrl.match(/open\.spotify\.com\/album\/([a-zA-Z0-9]+)/);
  if (match) {
    return `spotify:album:${match[1]}`;
  }
  return webUrl;
}

// Convert Apple Music web URL to app URL (used in loader for direct redirect)
function getAppleMusicAppUrlFromUrl(webUrl: string | null): string | null {
  if (!webUrl) return null;
  return webUrl.replace(/^https?:\/\//, "music://");
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const service = url.searchParams.get("service");

  // Fetch top 100 albums
  const { data: top100, error: top100Error } = await supabase
    .from("top_100_albums")
    .select("album, artist, spotify_url, apple_music_url, artwork_url")
    .limit(100);

  // Fetch albums of the year (top 25 from each year)
  const { data: yearAlbums, error: yearError } = await supabase
    .from("albums_of_the_year")
    .select("album, artist, spotify_link, apple_link, album_art_url")
    .limit(1000);

  if (top100Error || yearError) {
    return { albums: [] as NormalizedAlbum[] };
  }

  // Normalize top 100 albums
  const normalizedTop100: NormalizedAlbum[] = (top100 || []).map((a) => ({
    album: a.album,
    artist: a.artist,
    spotifyUrl: a.spotify_url,
    appleMusicUrl: a.apple_music_url,
    artworkUrl: a.artwork_url,
  }));

  // Normalize year albums
  const normalizedYear: NormalizedAlbum[] = (yearAlbums || []).map((a) => ({
    album: a.album,
    artist: a.artist,
    spotifyUrl: a.spotify_link,
    appleMusicUrl: a.apple_link,
    artworkUrl: a.album_art_url,
  }));

  // Combine and deduplicate by album + artist
  const allAlbums = [...normalizedTop100, ...normalizedYear];
  const seen = new Set<string>();
  const uniqueAlbums = allAlbums.filter((a) => {
    const key = `${a.album}-${a.artist}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // If service param is provided, pick random album and redirect immediately
  if (service === "spotify" || service === "apple") {
    const randomIndex = Math.floor(Math.random() * uniqueAlbums.length);
    const chosen = uniqueAlbums[randomIndex];

    const redirectUrl =
      service === "spotify"
        ? getSpotifyAppUriFromUrl(chosen.spotifyUrl)
        : getAppleMusicAppUrlFromUrl(chosen.appleMusicUrl);

    if (redirectUrl) {
      return redirect(redirectUrl);
    }
  }

  return { albums: uniqueAlbums };
};

type Service = "spotify" | "apple";

// Convert Spotify web URL to app URI
// https://open.spotify.com/album/xxx -> spotify:album:xxx
function getSpotifyAppUri(webUrl: string | null): string | null {
  if (!webUrl) return null;
  const match = webUrl.match(/open\.spotify\.com\/album\/([a-zA-Z0-9]+)/);
  if (match) {
    return `spotify:album:${match[1]}`;
  }
  return webUrl;
}

// Convert Apple Music web URL to app URL
// Apple Music app responds to music:// scheme
function getAppleMusicAppUrl(webUrl: string | null): string | null {
  if (!webUrl) return null;
  // Replace https:// with music:// to open in Apple Music app
  return webUrl.replace(/^https?:\/\//, "music://");
}

export default function RandomAlbum() {
  const { albums } = useLoaderData<typeof loader>();
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentDisplayIndex, setCurrentDisplayIndex] = useState(0);
  const [finalAlbum, setFinalAlbum] = useState<NormalizedAlbum | null>(null);
  const [showResult, setShowResult] = useState(false);
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startSpin = useCallback(
    (service: Service) => {
      if (albums.length === 0) return;

      setSelectedService(service);
      setIsSpinning(true);
      setShowResult(false);
      setFinalAlbum(null);

      // Pick the final album upfront
      const finalIndex = Math.floor(Math.random() * albums.length);
      const chosen = albums[finalIndex];

      // Spinning animation - start fast, slow down
      let spinCount = 0;
      const totalSpins = 30;
      let delay = 50;

      const spin = () => {
        spinCount++;
        setCurrentDisplayIndex(Math.floor(Math.random() * albums.length));

        if (spinCount < totalSpins) {
          // Gradually slow down
          delay = 50 + Math.pow(spinCount, 1.8);
          spinIntervalRef.current = setTimeout(spin, delay);
        } else {
          // Done spinning - show final result
          setIsSpinning(false);
          setFinalAlbum(chosen);
          setShowResult(true);

          // Redirect after 2 seconds using app URI schemes
          setTimeout(() => {
            const appUrl =
              service === "spotify"
                ? getSpotifyAppUri(chosen.spotifyUrl)
                : getAppleMusicAppUrl(chosen.appleMusicUrl);
            if (appUrl) {
              window.location.href = appUrl;
            }
          }, 2000);
        }
      };

      spin();
    },
    [albums]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) {
        clearTimeout(spinIntervalRef.current);
      }
    };
  }, []);

  const currentAlbum = finalAlbum || albums[currentDisplayIndex];

  // Initial state - service selection
  if (!selectedService && !isSpinning && !showResult) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-950">
        <h1 className="text-4xl md:text-5xl font-['Outfit'] font-bold text-center mb-4">
          Random Album
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-12 text-center">
          Choose your service and let fate decide what you listen to
        </p>

        <div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg">
          {/* Spotify Button */}
          <button
            onClick={() => startSpin("spotify")}
            className="flex-1 flex flex-col items-center justify-center gap-4 p-8 rounded-2xl bg-[#1DB954] hover:bg-[#1ed760] text-white transition-all transform hover:scale-105 shadow-lg"
          >
            <svg className="w-16 h-16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            <span className="text-xl font-semibold">Spotify</span>
          </button>

          {/* Apple Music Button */}
          <button
            onClick={() => startSpin("apple")}
            className="flex-1 flex flex-col items-center justify-center gap-4 p-8 rounded-2xl bg-gradient-to-br from-[#FA2D48] to-[#A12E6B] hover:from-[#ff3d58] hover:to-[#b13e7b] text-white transition-all transform hover:scale-105 shadow-lg"
          >
            <svg className="w-16 h-16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.4-1.336.53-2.3 1.452-2.865 2.78-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.801.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03c.525 0 1.048-.034 1.57-.1.823-.106 1.597-.35 2.296-.81a5.046 5.046 0 001.88-2.207c.186-.42.293-.87.37-1.324.113-.675.138-1.358.137-2.04-.002-3.8 0-7.595-.003-11.393zm-6.423 3.99v5.712c0 .417-.058.827-.244 1.206-.29.59-.76.962-1.388 1.14-.35.1-.706.157-1.07.173-.95.042-1.8-.335-2.22-1.1-.38-.69-.376-1.51.052-2.2.34-.545.84-.878 1.46-1.02.345-.078.695-.14 1.045-.196.378-.06.758-.116 1.132-.194.29-.06.49-.263.538-.554.01-.063.02-.127.018-.19 0-1.665 0-3.33-.004-4.994a.453.453 0 00-.09-.267.37.37 0 00-.262-.123c-.07-.007-.14.003-.21.02-.56.13-1.12.26-1.68.39l-3.836.89c-.39.09-.782.18-1.172.276a.39.39 0 00-.305.39c-.003.062 0 .125 0 .187v7.69c0 .406-.05.804-.23 1.17-.29.6-.76.98-1.4 1.16-.34.1-.69.15-1.04.17-.95.04-1.8-.34-2.22-1.1-.38-.69-.38-1.51.05-2.2.34-.55.84-.88 1.46-1.02.35-.08.7-.14 1.05-.2.38-.06.76-.12 1.13-.2.32-.07.52-.29.54-.62V5.62c0-.18.03-.35.1-.51.1-.2.28-.33.5-.38.17-.04.33-.07.5-.1l5.2-1.2 2.96-.69c.3-.07.6-.14.9-.2.21-.04.42 0 .6.14.16.12.24.3.25.5V10.11z" />
            </svg>
            <span className="text-xl font-semibold">Apple Music</span>
          </button>
        </div>

        <p className="mt-8 text-sm text-gray-500 dark:text-gray-500">
          {albums.length} albums to choose from
        </p>
      </div>
    );
  }

  // Spinning or result state
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-950">
      <div className="flex flex-col items-center">
        {/* Album artwork */}
        <div
          className={`relative w-64 h-64 md:w-80 md:h-80 rounded-lg overflow-hidden shadow-2xl ${
            isSpinning ? "animate-pulse" : ""
          }`}
        >
          {currentAlbum && (
            <img
              src={currentAlbum.artworkUrl}
              alt={currentAlbum.album}
              className="w-full h-full object-cover"
            />
          )}
          {isSpinning && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Album info */}
        {showResult && finalAlbum && (
          <div className="mt-8 text-center animate-fade-in">
            <h2 className="text-2xl md:text-3xl font-['Outfit'] font-bold">
              {finalAlbum.album}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
              {finalAlbum.artist}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
              Opening in {selectedService === "spotify" ? "Spotify" : "Apple Music"}...
            </p>
          </div>
        )}

        {isSpinning && (
          <p className="mt-8 text-lg text-gray-600 dark:text-gray-400 animate-pulse">
            Choosing your album...
          </p>
        )}
      </div>
    </div>
  );
}
