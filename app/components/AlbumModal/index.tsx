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

const modalActionClassName =
  "block w-full rounded-lg px-4 py-3 text-center font-mono text-xs font-semibold uppercase tracking-[0.04em] text-white";

const AlbumModal = ({ album, onClose }: AlbumModalProps) => {
  const shareUrl = album?.shareUrl?.startsWith("http")
    ? album.shareUrl
    : album?.shareUrl
      ? `https://austinzani.dev${album.shareUrl}`
      : null;

  return (
    <Modal isOpen={Boolean(album)} closeModal={onClose}>
      {album ? (
        <div className="relative max-h-[88vh] w-[min(88vw,24rem)] overflow-y-auto rounded-[10px] bg-surface p-6">
          <button
            type="button"
            onClick={onClose}
            className="absolute -right-3 -top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-surface bg-ink font-mono text-base font-bold text-paper shadow-lg transition hover:bg-accent hover:text-accent-ink"
            aria-label="Close album details"
          >
            x
          </button>
          <LazyImage
            src={album.artworkUrl}
            alt={`${album.title} album artwork`}
            className="h-full w-full object-cover"
            containerClassName="mb-4 aspect-square overflow-hidden rounded-lg bg-paper-muted"
          />
          {album.eyebrow ? (
            <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.06em] text-accent">
              {album.eyebrow}
            </p>
          ) : null}
          <h2 className="font-display text-4xl leading-none">{album.title}</h2>
          <p className="mt-2 text-sm font-medium text-ink-muted">{album.artist}</p>
          {album.blurb ? (
            <p className="mt-4 border-l-2 border-accent pl-3 text-sm leading-relaxed text-ink-muted">
              {album.blurb}
            </p>
          ) : null}
          <div className="mt-5 flex flex-col gap-2">
            {album.appleMusicUrl ? (
              <a
                href={album.appleMusicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${modalActionClassName} bg-gradient-to-r from-[#e64d70] to-[#a13a6f]`}
              >
                Listen on Apple Music
              </a>
            ) : null}
            {album.spotifyUrl ? (
              <a
                href={album.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${modalActionClassName} bg-[#1DB954]`}
              >
                Listen on Spotify
              </a>
            ) : null}
            {album.vinylUrl ? (
              <a
                href={album.vinylUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${modalActionClassName} bg-ink`}
              >
                Buy on Vinyl
              </a>
            ) : null}
            {shareUrl ? (
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(shareUrl)}
                className="rounded-lg border-[1.5px] border-line px-4 py-3 text-center font-mono text-xs font-semibold uppercase tracking-[0.04em] text-ink hover:bg-paper-muted"
              >
                Copy Share Link
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </Modal>
  );
};

export default AlbumModal;
