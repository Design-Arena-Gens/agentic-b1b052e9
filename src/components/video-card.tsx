import Image from "next/image";
import { ExternalLink, PlayCircle, Youtube } from "lucide-react";

export type YouTubeVideo = {
  id: string;
  url: string;
  title: string;
  description: string;
  duration: string;
  views: string;
  publishedAt: string;
  channelTitle: string;
  thumbnail: string;
};

type Props = {
  video: YouTubeVideo;
  onFocus?: (video: YouTubeVideo) => void;
};

export function VideoCard({ video, onFocus }: Props) {
  return (
    <article
      className="group flex flex-col gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 transition duration-200 hover:border-white/20 hover:bg-white/10"
      onMouseEnter={() => onFocus?.(video)}
      onFocus={() => onFocus?.(video)}
      tabIndex={0}
    >
      <div className="relative overflow-hidden rounded-xl">
        <Image
          src={video.thumbnail}
          alt={video.title}
          width={640}
          height={360}
          className="h-40 w-full rounded-xl object-cover transition duration-300 group-hover:scale-105"
        />
        <span className="absolute bottom-2 right-2 rounded-full bg-black/80 px-3 py-1 text-xs font-medium text-white">
          {video.duration}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <span className="mt-1 rounded-full bg-red-500/10 p-1 text-red-400">
            <Youtube className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <h3 className="text-lg font-semibold leading-tight text-white">
              {video.title}
            </h3>
            <p className="text-sm text-white/60">{video.channelTitle}</p>
          </div>
        </div>
        <p className="line-clamp-3 text-sm leading-relaxed text-white/70">
          {video.description || "Sem descrição disponível."}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
          <span className="rounded-full bg-white/10 px-3 py-1">
            {video.views} visualizações
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1">
            Publicado {video.publishedAt}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <a
          href={video.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/90 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-500"
        >
          <PlayCircle className="h-4 w-4" />
          Assistir agora
        </a>
        <button
          type="button"
          onClick={() => onFocus?.(video)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-white/80 transition hover:border-white/30 hover:text-white"
        >
          <ExternalLink className="h-4 w-4" />
          Destacar
        </button>
      </div>
    </article>
  );
}
