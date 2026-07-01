import IconButton from "~/components/IconButton";
import LazyImage from "~/components/LazyImage";
import Modal from "~/components/Modal";

export type AlbumModalDetails = {
  title: string;
  artist: string;
  artworkUrl: string;
  eyebrow?: string;
  blurb?: string | null;
  appleMusicUrl?: string | null;
  spotifyUrl?: string | null;
  vinylUrl?: string | null;
  shareUrl?: string | null;
};

type AlbumModalProps = {
  album: AlbumModalDetails | null;
  onClose: () => void;
};

const AlbumModal = ({ album, onClose }: AlbumModalProps) => {
  return (
    <Modal isOpen={Boolean(album)} closeModal={onClose}>
      {album ? (
        <div className="w-[min(92vw,42rem)] border-2 border-dashed border-line bg-surface p-4">
          <button
            type="button"
            onClick={onClose}
            className="float-right ml-3 border border-dashed border-line-muted px-2 py-1 font-mono text-xs uppercase tracking-wide text-ink-muted hover:border-accent hover:text-accent"
          >
            Close
          </button>
          <div className="grid gap-5 sm:grid-cols-[12rem_1fr]">
            <LazyImage
              src={album.artworkUrl}
              alt={`${album.title} album artwork`}
              className="h-full w-full object-cover"
              containerClassName="aspect-square border border-dashed border-line-muted bg-paper-muted"
            />
            <div>
              {album.eyebrow ? (
                <p className="font-mono text-xs font-semibold uppercase tracking-wide text-accent">
                  {album.eyebrow}
                </p>
              ) : null}
              <h2 className="mt-2 font-display text-5xl italic leading-none">
                {album.title}
              </h2>
              <p className="mt-2 text-lg text-ink-muted">{album.artist}</p>
              {album.blurb ? (
                <p className="mt-4 text-sm leading-relaxed text-ink-muted">
                  {album.blurb}
                </p>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-1">
                {album.appleMusicUrl ? (
                  <IconButton
                    link={album.appleMusicUrl}
                    icon="apple"
                    iconPrefix="fab"
                    label="Apple Music"
                  />
                ) : null}
                {album.spotifyUrl ? (
                  <IconButton
                    link={album.spotifyUrl}
                    icon="spotify"
                    iconPrefix="fab"
                    label="Spotify"
                  />
                ) : null}
                {album.vinylUrl ? (
                  <IconButton
                    link={album.vinylUrl}
                    icon="record-vinyl"
                    label="Vinyl"
                  />
                ) : null}
                {album.shareUrl ? (
                  <IconButton link={album.shareUrl} icon="share" label="Share" />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};

export default AlbumModal;
