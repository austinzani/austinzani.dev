import { LoaderFunctionArgs, MetaFunction, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import supabase from "~/utils/supabase";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data || !data.record) {
    return [
      { title: "Music Share | Austin Zani" },
      { property: "og:title", content: "Music Share" },
      { property: "og:description", content: "Check out this music recommendation from Austin" },
      { property: "og:type", content: "website" },
    ];
  }

  const { record } = data;
  const isAlbum = record.type.toLowerCase() === "album";
  const title = `${record.title} by ${record.artist}`;
  const description = record.blurb || `Check out this ${isAlbum ? "album" : "song"}: ${record.title} by ${record.artist}`;
  const url = `https://austinzani.dev/music/share/${record.id}`;

  return [
    { title: `${title} | Austin's Music` },
    // Open Graph tags
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: record.album_art_url },
    { property: "og:url", content: url },
    { property: "og:type", content: "music.song" },
    // Twitter Card tags
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: record.album_art_url },
  ];
};

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const id = params.id;

  if (!id || isNaN(parseInt(id))) {
    return redirect("/music");
  }

  const { data: record, error } = await supabase
    .from("music_history")
    .select("*")
    .eq("id", parseInt(id))
    .single();

  if (error || !record) {
    return redirect("/music");
  }

  return { record };
};

export default function MusicShare() {
  const { record } = useLoaderData<typeof loader>();
  const isAlbum = record.type.toLowerCase() === "album";

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background with blur */}
      <div
        className="fixed inset-0 -z-10 scale-110"
        style={{
          backgroundImage: `url(${record.album_art_url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(40px) brightness(0.5)",
        }}
      />

      {/* Dark overlay for better contrast */}
      <div className="fixed inset-0 -z-10 bg-black/30" />

      {/* Main content */}
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Card */}
        <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden">
          {/* Album artwork */}
          <div className="w-full aspect-square">
            <img
              src={record.album_art_url}
              alt={`${record.title} artwork`}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Info section */}
          <div className="p-6">
            {/* Type badge */}
            <span className="inline-block px-3 py-1 text-xs font-medium uppercase tracking-wider bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 rounded-full mb-3">
              {isAlbum ? "Album" : "Song"}
            </span>

            {/* Title and artist */}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {record.title}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
              {record.artist}
            </p>

            {/* Blurb if exists */}
            {record.blurb && (
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-6 border-l-2 border-orange-500 pl-4">
                {record.blurb}
              </p>
            )}

            {/* Links - Link Tree Style */}
            <div className="space-y-3">
              {/* Apple Music - Always present */}
              <a
                href={record.apple_music_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                </svg>
                Listen on Apple Music
              </a>

              {/* Spotify - if available */}
              {record.spotify_url && (
                <a
                  href={record.spotify_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-[#1DB954] hover:bg-[#1ed760] text-white font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                  Listen on Spotify
                </a>
              )}

              {/* Vinyl - if available */}
              {record.vinyl_url && (
                <a
                  href={record.vinyl_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
                  </svg>
                  Buy on Vinyl
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Footer link back to music page */}
        <a
          href="/music"
          className="mt-6 text-white/80 hover:text-white text-sm flex items-center gap-2 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          More music from Austin
        </a>
      </div>
    </div>
  );
}
