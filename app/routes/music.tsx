import React, { SetStateAction, useMemo } from "react";
import { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import supabase from "~/utils/supabase";
import { useLoaderData } from "@remix-run/react";
import AlbumOfTheYearListCard from "~/components/AlbumOfTheYearListCard";
import Top100Card from "~/components/Top100Card";
import { Tabs } from "~/components/Tabs";
import { Item } from "react-stately";
import { Database } from "../../db_types";
import six from "~/images/memoji_6.png";
import { createNewDateInTimeZone } from "~/utils/helpers";
import StickySectionHeader from "~/components/StickyHeader";
import ScrollablePills from "~/components/ScrollablePills";

export const meta: MetaFunction<typeof loader> = ({ matches, data }) => {
  const parentMeta = matches
    .flatMap((match) => match.meta ?? []) //@ts-ignore
    .filter(
      (meta) =>
        !["og:title", "og:image", "og:description"].includes(meta.name) &&
        !("title" in meta)
    );

  let title = "Austin's Music";
  let description = "Some of the music that I love";
  let image;
  // If we have a year and album, we can use that to generate the title, description, and image
  if (data && data.year && data.album) {
    if (data.year in data.yearList) {
      const year = data.year;
      const album = data.yearList[parseInt(year)].find(
        (album) => album.rank === parseInt(data.album!)
      );
      if (album && "artist" in album) {
        title = `#${album.rank} - ${album.album} by ${album.artist}`;
        image = album.album_art_url;
        if (album.blurb) {
          description = album.blurb;
        }
      }
    }
  }

  return [
    { title: title },
    { name: "og:title", content: title },
    { name: "og:image", content: image || six },
    { name: "og:description", content: description },
    ...parentMeta,
  ];
};

type UpcomingAlbum = {
  upcoming: true;
  rank: number;
  reveal_date: string;
  year: number;
};

const hideUpcomingAlbums = (
  album: Database["public"]["Tables"]["albums_of_the_year"]["Row"]
):
  | Database["public"]["Tables"]["albums_of_the_year"]["Row"]
  | UpcomingAlbum => {
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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // parse the search params for `?q=`
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
  console.log("top_response", top_error);

  if (music_error) {
    return {
      error: music_error,
      music: null,
      year: null,
      album: null,
      yearList: null,
      top100: null,
    };
  }
  if (year_error) {
    return {
      error: year_error,
      music: null,
      year: null,
      album: null,
      yearList: null,
      top100: null,
    };
  }
  if (top_error) {
    return {
      error: top_error,
      music: null,
      year: null,
      album: null,
      yearList: null,
      top100: null,
    };
  }

  const topAlbums: {
    [key: number]: Array<
      Database["public"]["Tables"]["albums_of_the_year"]["Row"] | UpcomingAlbum
    >;
  } = {};

  year_response?.forEach((album) => {
    const today = new Date();
    const year = today.getFullYear();
    const filteredAlbum =
      album.year === year ? hideUpcomingAlbums(album) : album;
    if (topAlbums[album.year]) {
      topAlbums[album.year].push(filteredAlbum);
    } else {
      topAlbums[album.year] = [filteredAlbum];
    }
  });

  // Sort each year's albums by rank from lowest to highest
  Object.keys(topAlbums).forEach((year) => {
    topAlbums[parseInt(year)] = topAlbums[parseInt(year)].sort(
      (a, b) => b.rank - a.rank
    );
  });

  // Create a map of the top 100 albums by tier
  const tierMap: {
    [key: string]: Array<Database["public"]["Tables"]["top_100_albums"]["Row"]>;
  } = {};
  top_response?.forEach((album) => {
    if (tierMap[album.tier]) {
      tierMap[album.tier].push(album);
    } else {
      tierMap[album.tier] = [album];
    }
  });

  Object.keys(tierMap).forEach((tier) => {
    tierMap[tier] = tierMap[tier].sort((a, b) =>
      a.artist.localeCompare(b.artist)
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

// Update the filters to be objects with key/value
const top100Filters = [
  { key: "Tier", value: "Tier" },
  { key: "Artist", value: "Artist" },
  { key: "Date", value: "Date" },
  { key: "Genre", value: "Genre" }
];

const tierLabels = [
  "GOAT Tier",
  "Tier 1",
  "Tier 2",
  "Tier 3",
  "Tier 4",
  "Tier 5",
];

const sortTop100 = (
  top100: Array<Database["public"]["Tables"]["top_100_albums"]["Row"]>,
  filter: Filter
): {
  [key: string]: Array<Database["public"]["Tables"]["top_100_albums"]["Row"]>;
} => {
  const sortedTop100: {
    [key: string]: Array<Database["public"]["Tables"]["top_100_albums"]["Row"]>;
  } = {};

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
      // Make the tier keys sort by the tierLabels array
      tierLabels.forEach((label) => {
        const value = sortedTop100[label];
        delete sortedTop100[label];
        sortedTop100[label] = value;
      });
      break;
    case "Genre":
      // Sort the top 100 albums by genre
      top100.forEach((album) => {
        if (sortedTop100[album.genre]) {
          sortedTop100[album.genre].push(album);
        } else {
          sortedTop100[album.genre] = [album];
        }
      });
      // Make the genre keys sorted alphabetically
      Object.keys(sortedTop100)
        .sort()
        .forEach((key) => {
          const value = sortedTop100[key];
          delete sortedTop100[key];
          sortedTop100[key] = value;
        });
      break;
    case "Date":
      // Sort the top 100 albums by release date from newest to oldest
      top100.sort(
        (a, b) =>
          new Date(b.release_date).getTime() -
          new Date(a.release_date).getTime()
      );
      sortedTop100["Chronological"] = top100;
      break;
    case "Artist":
      // Sort the top 100 alphabetically by artist
      top100.sort((a, b) => a.artist.localeCompare(b.artist));
      sortedTop100["All Artists"] = top100;
      break;
  }
  return sortedTop100;
};

const Music = () => {
  const { album, top100, year, yearList } = useLoaderData<typeof loader>();
  const yearTabs = Object.keys(yearList!)
    .sort((a, b) => parseInt(b) - parseInt(a))
    .map(year => ({ key: year, value: year }));  // Convert years to key/value objects

  const [mainTab, setMainTab] = React.useState(year ? "year" : "top-100");
  const [yearTab, setYearTab] = React.useState(year ? year : yearTabs[0].key);
  const [top100Filter, setTop100Filter] = React.useState<Filter>(top100Filters[0].key);
  const sortedTop100 = useMemo(
    () => sortTop100(top100!, top100Filter),
    [top100Filter]
  );

  // @ts-ignore
  return (
    <div className={"flex justify-center w-full px-2"}>
      <div className={"flex m-3 flex-col w-full max-w-[64rem]"}>
        <h1 className={"text-4xl font-['Outfit'] font-medium mb-2"}>Music</h1>
        <Tabs
          aria-label="Music"
          selectedKey={mainTab}
          onSelectionChange={(key) => setMainTab(key as SetStateAction<string>)}
        >
          <Item key="top-100" title="Top 100">
            <p className={"font-['Outfit'] py-2 font-light"}>
              My Personal Top 100 Albums
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Order By:
            </p>
            <ScrollablePills
              items={top100Filters}
              selectedKey={top100Filter}
              onSelectionChange={(key: string) => setTop100Filter(key)}
            />
            <div className={"flex flex-col items-center"}>
              {Object.keys(sortedTop100).map((tier) => {
                const showLabel = Object.keys(sortedTop100).length > 1;
                return (
                  <div className="w-full">
                    {<StickySectionHeader title={showLabel ? tier : " "} />}
                    <div className="flex flex-wrap justify-center min-[945px]:justify-between">
                      {sortedTop100[tier]?.map((album, index) => {
                        return (
                          <Top100Card
                            key={`${album.album}-${index}`}
                            album={album}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Item>
          <Item key="year" title="Annual Top 25">
            <p className={"font-['Outfit'] py-2 font-light"}>
              My top 25 albums from the end of every year.
            </p>
            <ScrollablePills
              items={yearTabs}
              selectedKey={yearTab}
              onSelectionChange={(key: string) => setYearTab(key)}
            />
            <div className={"flex flex-col items-center w-full"}>
              {yearList![parseInt(yearTab)].map((albumObject) => (
                <AlbumOfTheYearListCard
                  key={`${albumObject.year}-${albumObject.rank}`}
                  album={albumObject}
                  number={albumObject.rank}
                  shouldScroll={yearTab === year && albumObject.rank === parseInt(album ?? "0")}
                />
              ))}
            </div>
          </Item>
        </Tabs>
      </div>
    </div>
  );
};

export default Music;
