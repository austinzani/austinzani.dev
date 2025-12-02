import React, { useCallback, useEffect, useState } from "react";
import { LoaderFunctionArgs, MetaFunction, redirect } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import supabase from "~/utils/supabase";
import { Database } from "../../db_types";
import { createNewDateInTimeZone } from "~/utils/helpers";
import AlbumStorySlide from "~/components/AlbumStorySlide";
import StoryProgressDots from "~/components/StoryProgressDots";

type UpcomingAlbum = {
  upcoming: true;
  rank: number;
  reveal_date: string;
  year: number;
};

type AlbumRow = Database["public"]["Tables"]["albums_of_the_year"]["Row"];

const hideUpcomingAlbums = (album: AlbumRow): AlbumRow | UpcomingAlbum => {
  const today = createNewDateInTimeZone("America/New_York");
  const todayDelta = 25 - today.getDate();
  const upcomingAlbum: UpcomingAlbum = {
    upcoming: true,
    rank: album.rank,
    reveal_date: `Dec ${26 - album.rank}`,
    year: album.year,
  };
  // If the album is from the current year and it is not December, show the upcoming album
  if (today.getFullYear() == album.year && today.getMonth() != 11) {
    return upcomingAlbum;
    // Else if the album rank is greater than the days left till Christmas, show the upcoming album
  } else if (album.rank > todayDelta) {
    return album;
    // Else show the album
  } else {
    return upcomingAlbum;
  }
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data || !data.currentAlbum) {
    return [
      { title: "Austin's Music" },
      { property: "og:title", content: "Austin's Music" },
      { property: "og:description", content: "Some of the music that I love" },
      { property: "og:type", content: "website" },
    ];
  }

  const album = data.currentAlbum;
  const baseUrl = "https://austinzani.dev";

  if ("upcoming" in album) {
    const url = `${baseUrl}/music/story/${data.year}`;
    return [
      { title: `Coming Soon - Austin's ${data.year} Top 25` },
      { property: "og:title", content: `Coming Soon - Austin's ${data.year} Top 25` },
      { property: "og:description", content: "Check back soon for the next album reveal!" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
    ];
  }

  const title = `#${album.rank} - ${album.album} by ${album.artist}`;
  const description = album.blurb || `Check out ${album.album} by ${album.artist}!`;
  const url = `${baseUrl}/music/story/${album.year}?album=${album.rank}`;

  return [
    { title: `${title} | Austin's ${data.year} Top 25` },
    // Open Graph tags
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: album.album_art_url },
    { property: "og:url", content: url },
    { property: "og:type", content: "article" },
    // Twitter Card tags (also used by iMessage and other platforms)
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: album.album_art_url },
  ];
};

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const year = params.year;
  const url = new URL(request.url);
  const albumParam = url.searchParams.get("album");

  // Validate year parameter
  if (!year || isNaN(parseInt(year))) {
    return redirect("/music");
  }

  const parsedYear = parseInt(year);

  // Fetch albums for this year
  const { data: albums, error } = await supabase
    .from("albums_of_the_year")
    .select("*")
    .eq("year", parsedYear)
    .order("rank", { ascending: true })
    .limit(25);

  if (error || !albums || albums.length === 0) {
    return redirect("/music");
  }

  // Apply hide logic for current year
  const today = new Date();
  const currentYear = today.getFullYear();
  const processedAlbums = albums.map((album) =>
    album.year === currentYear ? hideUpcomingAlbums(album) : album
  );

  // Separate revealed and upcoming albums
  const revealedAlbums = processedAlbums.filter(
    (album) => !("upcoming" in album)
  ) as AlbumRow[];
  const upcomingAlbums = processedAlbums.filter(
    (album) => "upcoming" in album
  ) as UpcomingAlbum[];

  // Sort revealed albums from rank 25 down to 1 (so we start with 25)
  revealedAlbums.sort((a, b) => b.rank - a.rank);

  // Determine initial slide index
  let initialSlide = 0;
  if (albumParam) {
    const targetRank = parseInt(albumParam);
    if (!isNaN(targetRank)) {
      const foundIndex = revealedAlbums.findIndex((a) => a.rank === targetRank);
      if (foundIndex !== -1) {
        initialSlide = foundIndex;
      }
    }
  }

  // Find next album to reveal (highest rank among upcoming, since we reveal 25->1)
  const nextToReveal = upcomingAlbums.length > 0
    ? Math.max(...upcomingAlbums.map((a) => a.rank))
    : null;

  // Determine current album for meta tags
  const currentAlbum = revealedAlbums[initialSlide] || (upcomingAlbums.length > 0 ? upcomingAlbums[0] : null);

  return {
    year: parsedYear,
    revealedAlbums,
    hasUpcoming: upcomingAlbums.length > 0,
    nextToReveal,
    initialSlide,
    currentAlbum,
  };
};

export default function MusicStory() {
  const { year, revealedAlbums, hasUpcoming, nextToReveal, initialSlide } =
    useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const [currentSlide, setCurrentSlide] = useState(initialSlide);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Total slides = revealed albums + 1 if there are upcoming albums
  const totalSlides = revealedAlbums.length + (hasUpcoming ? 1 : 0);
  const isOnComingSoonSlide = hasUpcoming && currentSlide === revealedAlbums.length;

  // Current album (null if on coming soon slide)
  const currentAlbum = isOnComingSoonSlide ? null : revealedAlbums[currentSlide];

  // Navigation functions
  const goNext = useCallback(() => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide((prev) => prev + 1);
    }
  }, [currentSlide, totalSlides]);

  const goPrev = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    } else {
      // At first slide, go back to music page
      navigate(`/music?year=${year}`);
    }
  }, [currentSlide, navigate, year]);

  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < totalSlides) {
      setCurrentSlide(index);
    }
  }, [totalSlides]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          goNext();
          break;
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          goPrev();
          break;
        case "Escape":
          navigate(`/music?year=${year}`);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, navigate, year]);

  // Touch/swipe handling
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isSwipe = Math.abs(distance) > minSwipeDistance;

    if (isSwipe) {
      if (distance > 0) {
        // Swipe left = next
        goNext();
      } else {
        // Swipe right = prev
        goPrev();
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  // Get background image URL
  const backgroundUrl = currentAlbum?.album_art_url || "";

  return (
    <div
      className="fixed inset-0 z-50 bg-black overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Blurred background */}
      {backgroundUrl && (
        <div
          className="absolute inset-0 scale-110"
          style={{
            backgroundImage: `url(${backgroundUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(30px) brightness(0.6)",
          }}
        />
      )}

      {/* Close button - positioned in top right of full screen */}
      <button
        onClick={() => navigate(`/music?year=${year}`)}
        className="absolute top-4 right-4 z-30 w-10 h-10 flex items-center justify-center text-white/80 hover:text-white transition-colors bg-black/30 rounded-full"
        aria-label="Close story"
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

      {/* Main content container - mobile width, centered */}
      <div className="relative z-10 h-full w-full max-w-[500px] mx-auto flex flex-col">
        {/* Progress dots */}
        <div className="pt-4 px-4 relative z-20">
          <StoryProgressDots
            totalDots={totalSlides}
            currentIndex={currentSlide}
            onDotClick={goToSlide}
          />
        </div>

        {/* Slide content - higher z-index than tap zones */}
        <div className="flex-1 flex items-center justify-center px-4 py-6 relative z-20 pointer-events-none">
          <AlbumStorySlide
            album={currentAlbum}
            isComingSoon={isOnComingSoonSlide}
            nextToReveal={nextToReveal}
            year={year}
          />
        </div>

        {/* Tap zones for navigation - lower z-index */}
        <div className="absolute inset-0 flex z-10">
          {/* Left tap zone (back) */}
          <div
            className="w-[30%] h-full cursor-pointer pointer-events-auto"
            onClick={goPrev}
            aria-label="Previous album"
          />
          {/* Right tap zone (forward) */}
          <div
            className="w-[70%] h-full cursor-pointer pointer-events-auto"
            onClick={goNext}
            aria-label="Next album"
          />
        </div>
      </div>
    </div>
  );
}
