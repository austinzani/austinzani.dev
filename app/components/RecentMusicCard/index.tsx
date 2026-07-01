import { Database } from "../../../db_types";
import IconButton from "../IconButton";
import LazyImage from "../LazyImage";

const RecentMusicCard = ({ recentObject, relativeTime }: {
    recentObject: Database['public']['Tables']['music_history']['Row'];
    relativeTime?: string;
}) => {
    const isAlbum = recentObject.type === "ALBUM";
    
    return (
        <div className="mb-3 w-full max-w-md border-2 border-dashed border-line bg-surface p-3">
            <div className="flex items-center">
                <LazyImage
                    src={recentObject.album_art_url}
                    alt={`${recentObject.title} artwork`}
                    className="h-full w-full object-cover"
                    containerClassName="h-28 w-28 flex-shrink-0 border border-dashed border-line-muted bg-paper-muted"
                />
                <div className="h-full flex justify-between w-full pl-4">
                    <div className="h-full flex flex-col">
                        <h1 className="font-display text-3xl italic leading-none">{recentObject.title}</h1>
                        <h3 className="mt-1 text-sm text-ink-muted">{recentObject.artist}</h3>
                        <p className="mt-2 font-mono text-xs uppercase tracking-wide text-ink-muted">
                            {isAlbum ? "Album" : "Song"}
                            {relativeTime ? ` / ${relativeTime}` : ""}
                        </p>
                    </div>
                    <div className="flex items-start">
                        <IconButton
                            link={recentObject.apple_music_url}
                            icon="apple"
                            iconPrefix="fab"
                            label="Apple Music"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecentMusicCard;
