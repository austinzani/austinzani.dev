import { useCallback, useMemo, useRef, useState } from "react";
import { Link, useLoaderData } from "@remix-run/react";
import { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import AlbumModal, { AlbumModalDetails } from "~/components/AlbumModal";
import EmptyState from "~/components/EmptyState";
import ErrorState from "~/components/ErrorState";
import Modal from "~/components/Modal";
import RecentMusicCard from "~/components/RecentMusicCard";
import ScrollablePills from "~/components/ScrollablePills";
import Top100Card from "~/components/Top100Card";
import six from "~/images/memoji_6.png";
import { createNewDateInTimeZone } from "~/utils/helpers";
import supabase from "~/utils/supabase";
import { Database } from "../../db_types";

export const meta: MetaFunction<typeof loader> = ({ matches, data }) => {
  const parentMeta = matches
    .flatMap((match) => match.meta ?? [])
    // @ts-ignore Remix's meta union does not narrow property/name consistently.
    .filter(
      (meta) =>
        !["og:title", "og:image", "og:description"].includes(meta.property || meta.name) &&
        !("title" in meta)
    );

  let title = "Austin's Music";
  let description = "Some of the music that I love";
  let image = six;
  let url = "https://austinzani.dev/music";

  if (data && data.year && data.album && data.yearList) {
    if (data.year in data.yearList) {
      const year = data.year;
      const album = data.yearList[parseInt(year)].find(
        (album) => album.rank === parseInt(data.album!)
      );
      if (album && "artist" in album) {
        title = `#${album.rank} - ${album.album} by ${album.artist}`;
        image = album.album_art_url;
        url = `https://austinzani.dev/music?year=${year}&album=${album.rank}`;
        if (album.blurb) {
          description = album.blurb;
        }
      }
    }
  }

  return [
    { title },
    { property: "og:title", content: title },
    { property: "og:image", content: image },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
    ...parentMeta,
  ];
};

type UpcomingAlbum = {
  upcoming: true;
  rank: number;
  reveal_date: string;
  year: number;
};

type AnnualAlbum = Database["public"]["Tables"]["albums_of_the_year"]["Row"];
type Top100Album = Database["public"]["Tables"]["top_100_albums"]["Row"];
type MusicHistoryItem = Database["public"]["Tables"]["music_history"]["Row"];
type Filter = "Tier" | "Artist" | "Date" | "Genre";
type MainTab = "top-100" | "year" | "feed";
type ShuffleService = "spotify" | "apple";
type ShuffleStage = "closed" | "picker" | "spinning" | "result";

type ShuffleAlbum = {
  album: string;
  artist: string;
  spotifyUrl: string | null;
  appleMusicUrl: string | null;
  artworkUrl: string;
};

const hideUpcomingAlbums = (album: AnnualAlbum): AnnualAlbum | UpcomingAlbum => {
  const today = createNewDateInTimeZone("America/New_York");
  const todayDelta = 25 - today.getDate();
  const upcomingAlbum: UpcomingAlbum = {
    upcoming: true,
    rank: album.rank,
    reveal_date: `Dec ${26 - album.rank}`,
    year: album.year,
  };

  if (today.getFullYear() == album.year && today.getMonth() != 11) {
    return upcomingAlbum;
  } else if (album.rank > todayDelta) {
    return album;
  } else {
    return upcomingAlbum;
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const year = url.searchParams.get("year") || "";
  const parsedYear = parseInt(year);
  const album = url.searchParams.get("album") || "";
  const parsedAlbum = parseInt(album);

  const { data: music_response, error: music_error } = await supabase
    .from("music_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10)
    .range(0, 100);

  const { data: year_response, error: year_error } = await supabase
    .from("albums_of_the_year")
    .select("*")
    .order("rank", { ascending: true })
    .limit(1000);

  const { data: top_response, error: top_error } = await supabase
    .from("top_100_albums")
    .select("*")
    .limit(100);

  if (music_error || year_error || top_error) {
    return {
      error: music_error || year_error || top_error,
      music: null,
      year: null,
      album: null,
      yearList: null,
      top100: null,
    };
  }

  const topAlbums: Record<number, Array<AnnualAlbum | UpcomingAlbum>> = {};

  year_response?.forEach((album) => {
    const today = new Date();
    const filteredAlbum =
      album.year === today.getFullYear() ? hideUpcomingAlbums(album) : album;
    if (topAlbums[album.year]) {
      topAlbums[album.year].push(filteredAlbum);
    } else {
      topAlbums[album.year] = [filteredAlbum];
    }
  });

  Object.keys(topAlbums).forEach((year) => {
    topAlbums[parseInt(year)] = topAlbums[parseInt(year)].sort(
      (a, b) => b.rank - a.rank
    );
  });

  return {
    error: null,
    music: music_response,
    year: parsedYear ? year : null,
    album: parsedAlbum && parsedAlbum < 26 ? album : null,
    yearList: topAlbums,
    top100: top_response,
  };
};

const mainTabs: Array<{ key: MainTab; value: string }> = [
  { key: "top-100", value: "Top 100" },
  { key: "year", value: "Annual Countdown" },
  { key: "feed", value: "Feed" },
];

const top100Filters: Array<{ key: Filter; value: string }> = [
  { key: "Tier", value: "Tier" },
  { key: "Artist", value: "Artist" },
  { key: "Date", value: "Date" },
  { key: "Genre", value: "Genre" },
];

const tierLabels = [
  "GOAT Tier",
  "Tier 1",
  "Tier 2",
  "Tier 3",
  "Tier 4",
  "Tier 5",
];

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

const formatRelativeTime = (dateString: string | null) => {
  if (!dateString) return "";

  const then = new Date(dateString).getTime();
  const now = Date.now();
  const diffSeconds = Math.round((then - now) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, seconds] of units) {
    if (Math.abs(diffSeconds) >= seconds) {
      return relativeTimeFormatter.format(Math.round(diffSeconds / seconds), unit);
    }
  }

  return relativeTimeFormatter.format(diffSeconds, "second");
};

const sortTop100 = (top100: Top100Album[], filter: Filter): Record<string, Top100Album[]> => {
  const sortedTop100: Record<string, Top100Album[]> = {};

  switch (filter) {
    case "Tier":
      top100.forEach((album) => {
        const label = tierLabels[parseInt(album.tier)];
        if (sortedTop100[label]) {
          sortedTop100[label].push(album);
        } else {
          sortedTop100[label] = [album];
        }
      });
      tierLabels.forEach((label) => {
        const value = sortedTop100[label];
        delete sortedTop100[label];
        sortedTop100[label] = value;
      });
      break;
    case "Genre":
      top100.forEach((album) => {
        if (sortedTop100[album.genre]) {
          sortedTop100[album.genre].push(album);
        } else {
          sortedTop100[album.genre] = [album];
        }
      });
      Object.keys(sortedTop100)
        .sort()
        .forEach((key) => {
          const value = sortedTop100[key];
          delete sortedTop100[key];
          sortedTop100[key] = value;
        });
      break;
    case "Date":
      sortedTop100.Chronological = top100.sort(
        (a, b) =>
          new Date(b.release_date).getTime() -
          new Date(a.release_date).getTime()
      );
      break;
    case "Artist":
      sortedTop100["All Artists"] = top100.sort((a, b) =>
        a.artist.localeCompare(b.artist)
      );
      break;
  }

  return sortedTop100;
};

const getSpotifyAppUri = (webUrl: string | null): string | null => {
  if (!webUrl) return null;
  const match = webUrl.match(/open\.spotify\.com\/album\/([a-zA-Z0-9]+)/);
  return match ? `spotify:album:${match[1]}` : webUrl;
};

const getAppleMusicAppUrl = (webUrl: string | null): string | null => {
  if (!webUrl) return null;
  return webUrl.replace(/^https?:\/\//, "music://");
};

const shareLink = async (title: string, url: string) => {
  const absoluteUrl = url.startsWith("http") ? url : `https://austinzani.dev${url}`;
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, url: absoluteUrl });
      return;
    } catch (_error) {
      // Copying below gives users a deterministic fallback after cancel/errors.
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(absoluteUrl);
  }
};

const isAnnualAlbum = (album: AnnualAlbum | UpcomingAlbum): album is AnnualAlbum =>
  !("upcoming" in album);

const Music = () => {
  const { album, error, music, top100, year, yearList } = useLoaderData<typeof loader>();
  const hasLoadError = Boolean(error || !top100 || !yearList);
  const safeTop100 = top100 ?? [];
  const safeYearList = yearList ?? {};

  const yearTabs = Object.keys(safeYearList)
    .sort((a, b) => parseInt(b) - parseInt(a))
    .map((year) => ({ key: year, value: year }));
  const initialYearTab = year ? year : yearTabs[0]?.key ?? String(new Date().getFullYear());

  const [mainTab, setMainTab] = useState<MainTab>(year ? "year" : "top-100");
  const [yearTab, setYearTab] = useState(initialYearTab);
  const [top100Filter, setTop100Filter] = useState<Filter>(top100Filters[0].key);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumModalDetails | null>(null);
  const [shuffleStage, setShuffleStage] = useState<ShuffleStage>("closed");
  const [shuffleService, setShuffleService] = useState<ShuffleService | null>(null);
  const [shuffleAlbum, setShuffleAlbum] = useState<ShuffleAlbum | null>(null);
  const spinTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sortedTop100 = useMemo(
    () => sortTop100([...safeTop100], top100Filter),
    [safeTop100, top100Filter]
  );
  const selectedYearAlbums = safeYearList[parseInt(yearTab)] ?? [];
  const revealedCount = selectedYearAlbums.filter(isAnnualAlbum).length;
  const isDecemberCountdown =
    createNewDateInTimeZone("America/New_York").getMonth() === 11;

  const shuffleAlbums = useMemo<ShuffleAlbum[]>(() => {
    const annualAlbums = Object.values(safeYearList)
      .flat()
      .filter(isAnnualAlbum)
      .map((album) => ({
        album: album.album,
        artist: album.artist,
        spotifyUrl: album.spotify_link,
        appleMusicUrl: album.apple_link,
        artworkUrl: album.album_art_url,
      }));
    const topAlbums = safeTop100.map((album) => ({
      album: album.album,
      artist: album.artist,
      spotifyUrl: album.spotify_url,
      appleMusicUrl: album.apple_music_url,
      artworkUrl: album.artwork_url,
    }));
    const seen = new Set<string>();

    return [...topAlbums, ...annualAlbums].filter((album) => {
      const key = `${album.album}-${album.artist}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [safeTop100, safeYearList]);

  const closeShuffle = useCallback(() => {
    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
      spinTimeoutRef.current = null;
    }
    setShuffleStage("closed");
    setShuffleService(null);
    setShuffleAlbum(null);
  }, []);

  const startShuffle = useCallback(
    (service: ShuffleService) => {
      const eligibleAlbums = shuffleAlbums.filter((album) =>
        service === "spotify" ? album.spotifyUrl : album.appleMusicUrl
      );
      if (!eligibleAlbums.length) return;

      const chosen = eligibleAlbums[Math.floor(Math.random() * eligibleAlbums.length)];
      setShuffleService(service);
      setShuffleAlbum(chosen);
      setShuffleStage("spinning");
      spinTimeoutRef.current = setTimeout(() => {
        setShuffleStage("result");
        const appUrl =
          service === "spotify"
            ? getSpotifyAppUri(chosen.spotifyUrl)
            : getAppleMusicAppUrl(chosen.appleMusicUrl);
        if (appUrl) {
          window.location.href = appUrl;
        }
      }, 1100);
    },
    [shuffleAlbums]
  );

  if (hasLoadError) {
    return (
      <div className="flex w-full justify-center px-4 py-12">
        <div className="w-full max-w-[64rem]">
          <ErrorState message="Music data could not be loaded." />
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-center px-4">
      <div className="relative flex w-full max-w-[67.5rem] flex-col py-10 sm:py-14 lg:py-16">
        <AlbumModal album={selectedAlbum} onClose={() => setSelectedAlbum(null)} />
        <Modal isOpen={shuffleStage !== "closed"} closeModal={closeShuffle}>
          <div className="relative w-[min(88vw,21rem)] rounded-[10px] bg-surface p-6 text-center">
            <button
              type="button"
              onClick={closeShuffle}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-line-muted bg-surface font-mono text-lg font-black leading-none text-ink shadow-md transition hover:border-line hover:bg-paper-muted"
              aria-label="Close shuffle"
            >
              ×
            </button>
            {shuffleStage === "picker" ? (
              <>
                <h2 className="font-display text-3xl leading-none">Shuffle Something</h2>
                <p className="mx-auto mt-3 max-w-[16rem] text-sm leading-relaxed text-ink-muted">
                  A random pull from Austin's library. Where do you want to listen?
                </p>
                <div className="mt-5 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => startShuffle("spotify")}
                    className="rounded-lg bg-[#1DB954] px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.04em] text-white"
                  >
                    Shuffle on Spotify
                  </button>
                  <button
                    type="button"
                    onClick={() => startShuffle("apple")}
                    className="rounded-lg bg-gradient-to-r from-[#e64d70] to-[#a13a6f] px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.04em] text-white"
                  >
                    Shuffle on Apple Music
                  </button>
                </div>
              </>
            ) : null}
            {shuffleStage === "spinning" ? (
              <div className="py-8">
                <div className="mx-auto mb-5 h-20 w-20 animate-pulse overflow-hidden rounded-lg bg-paper-muted">
                  {shuffleAlbum ? (
                    <img
                      src={shuffleAlbum.artworkUrl}
                      alt={`${shuffleAlbum.album} artwork`}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.05em] text-ink-muted">
                  Shuffling...
                </p>
              </div>
            ) : null}
            {shuffleStage === "result" && shuffleAlbum ? (
              <>
                <img
                  src={shuffleAlbum.artworkUrl}
                  alt={`${shuffleAlbum.album} artwork`}
                  className="mb-4 aspect-square w-full rounded-lg object-cover"
                />
                <h2 className="font-display text-3xl leading-none">{shuffleAlbum.album}</h2>
                <p className="mt-1 text-sm font-medium text-ink-muted">{shuffleAlbum.artist}</p>
                <p className="mt-4 font-mono text-xs text-ink-muted">
                  Opening in {shuffleService === "spotify" ? "Spotify" : "Apple Music"}...
                </p>
                <button
                  type="button"
                  onClick={closeShuffle}
                  className="mt-5 w-full rounded-lg border-[1.5px] border-line px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.04em] hover:bg-paper-muted"
                >
                  Done
                </button>
              </>
            ) : null}
          </div>
        </Modal>

        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              500+ Albums, Ranked, Since Forever
            </p>
            <h1 className="mt-3 font-display text-6xl leading-none sm:text-7xl lg:text-[5rem]">
              Music
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setShuffleStage("picker")}
            className="mt-2 inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.05em] text-paper transition hover:bg-accent hover:text-accent-ink sm:px-5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3"
              />
            </svg>
            Shuffle
          </button>
        </div>

        <div className="mb-9 inline-flex max-w-full self-start overflow-x-auto rounded-full bg-paper-muted p-1">
          {mainTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setMainTab(tab.key)}
              className={`whitespace-nowrap rounded-full px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.05em] transition sm:text-xs ${
                mainTab === tab.key ? "bg-ink text-paper" : "text-ink hover:bg-surface"
              }`}
            >
              {tab.value}
            </button>
          ))}
        </div>

        {mainTab === "top-100" ? (
          <>
            <div className="mb-7 max-w-[34rem]">
              <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Order By
              </p>
              <ScrollablePills
                items={top100Filters}
                selectedKey={top100Filter}
                onSelectionChange={(key: string) => setTop100Filter(key as Filter)}
              />
            </div>
            <div>
              {Object.keys(sortedTop100).map((tier) => {
                const showLabel = Object.keys(sortedTop100).length > 1;
                return (
                  <div className="w-full" key={tier}>
                    {showLabel ? (
                      <div className="mb-4 flex items-center gap-3 border-b-[1.5px] border-dashed border-line-muted pb-2">
                        <p className="font-mono text-sm font-bold uppercase tracking-[0.1em] text-ink">
                          {tier}
                        </p>
                        <span className="h-px flex-1 bg-line-muted" />
                      </div>
                    ) : null}
                    <div className="mb-9 grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                      {sortedTop100[tier]?.map((album, index) => (
                        <Top100Card
                          key={`${album.album}-${index}`}
                          album={album}
                          showDateBadge={top100Filter === "Date"}
                          onSelect={() =>
                            setSelectedAlbum({
                              title: album.album,
                              artist: album.artist,
                              artworkUrl: album.artwork_url,
                              eyebrow: album.genre,
                              appleMusicUrl: album.apple_music_url,
                              spotifyUrl: album.spotify_url,
                            })
                          }
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}

        {mainTab === "year" ? (
          <>
            <ScrollablePills
              items={yearTabs}
              selectedKey={yearTab}
              onSelectionChange={(key: string) => setYearTab(key)}
            />
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
              <p className="text-[15px] leading-relaxed text-ink-muted">
                {yearTab} countdown - one album unlocks a day, like an advent calendar.
              </p>
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs font-semibold uppercase tracking-[0.05em] text-accent">
                  {revealedCount} of 25 revealed
                </span>
                <Link
                  to={`/music/story/${yearTab}`}
                  className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-line px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.04em] hover:bg-paper-muted"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Story
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7">
              {selectedYearAlbums.map((albumObject) =>
                "upcoming" in albumObject ? (
                  <div
                    key={`${albumObject.year}-${albumObject.rank}`}
                    className="aspect-square rounded-lg border border-dashed border-line-muted bg-paper-muted p-2"
                  >
                    <div className="relative flex h-full w-full items-center justify-center rounded-md">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        className="text-ink-muted"
                      >
                        <rect x="4" y="10" width="16" height="10" rx="2" />
                        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                      </svg>
                      <span className="absolute bottom-1 right-1 font-mono text-[10px] font-semibold text-ink-muted">
                        {albumObject.reveal_date}
                      </span>
                    </div>
                  </div>
                ) : (
                  <button
                    key={`${albumObject.year}-${albumObject.rank}`}
                    type="button"
                    onClick={() =>
                      setSelectedAlbum({
                        title: albumObject.album,
                        artist: albumObject.artist,
                        artworkUrl: albumObject.album_art_url,
                        eyebrow: `#${albumObject.rank} / ${albumObject.year}`,
                        blurb: albumObject.blurb,
                        appleMusicUrl: albumObject.apple_link,
                        spotifyUrl: albumObject.spotify_link,
                        vinylUrl: albumObject.vinyl_link,
                        shareUrl: `/music/story/${albumObject.year}?album=${albumObject.rank}`,
                      })
                    }
                    className="group text-left"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-lg bg-paper-muted">
                      <img
                        src={albumObject.album_art_url}
                        alt={`${albumObject.album} album artwork`}
                        className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
                      />
                      <span
                        className={`absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-tl-lg font-mono text-sm font-bold shadow-sm ${
                          isDecemberCountdown
                            ? albumObject.rank % 2 === 0
                              ? "bg-[#0f7a3a] text-white"
                              : "bg-[#c62828] text-white"
                            : "bg-accent text-black"
                        }`}
                      >
                        {albumObject.rank}
                      </span>
                    </div>
                    <h2 className="mt-2 line-clamp-2 text-sm font-semibold leading-tight">
                      {albumObject.album}
                    </h2>
                    <p className="mt-0.5 line-clamp-1 font-mono text-xs text-ink-muted">
                      {albumObject.artist}
                    </p>
                  </button>
                )
              )}
            </div>
          </>
        ) : null}

        {mainTab === "feed" ? (
          <>
            <p className="mb-6 max-w-[46rem] text-[15px] leading-relaxed text-ink-muted">
              Whatever's been on repeat lately - albums, songs, and the odd rabbit hole.
            </p>
            {music && music.length > 0 ? (
              <div className="divide-y divide-dashed divide-line-muted border-y border-dashed border-line-muted">
                {music.map((recentObject: MusicHistoryItem) => (
                  <RecentMusicCard
                    key={recentObject.id}
                    recentObject={recentObject}
                    relativeTime={formatRelativeTime(recentObject.created_at)}
                    onSelect={() =>
                      setSelectedAlbum({
                        title: recentObject.title,
                        artist: recentObject.artist,
                        artworkUrl: recentObject.album_art_url,
                        eyebrow: recentObject.type === "ALBUM" ? "Album" : "Song",
                        blurb: recentObject.blurb,
                        appleMusicUrl: recentObject.apple_music_url,
                        spotifyUrl: recentObject.spotify_url,
                        vinylUrl: recentObject.vinyl_url,
                        shareUrl: `/music/share/${recentObject.id}`,
                      })
                    }
                    onShare={() =>
                      shareLink(
                        `${recentObject.title} by ${recentObject.artist}`,
                        `/music/share/${recentObject.id}`
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No recent listens"
                message="Music history will appear here once listening activity is available."
              />
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default Music;
