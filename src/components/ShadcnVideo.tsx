import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Maximize2, Pause, Play, Square, Volume2, VolumeX } from 'lucide-react';
import apiFetch from '@/lib/api';

type Props = {
  src?: string;
  reelId?: string;
  poster?: string | null;
  className?: string;
};

export default function ShadcnVideo({ src, reelId, poster = null, className = '' }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const downloadAnchorRef = useRef<HTMLAnchorElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [canPlay, setCanPlay] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [blobSrc, setBlobSrc] = useState<string | null>(null);
  const [isLoadingStream, setIsLoadingStream] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('16 / 9');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const directSrc = useMemo(() => {
    if (src && /^(https?:|file:\/\/\/)/i.test(src)) return src;
    return null;
  }, [src]);

  const apiSrc = useMemo(() => {
    if (src && src.startsWith('/api/')) return src;
    return null;
  }, [src]);

  const resolvedSrc = useMemo(() => {
    if (directSrc) return directSrc;
    if (blobSrc) return blobSrc;
    return null;
  }, [blobSrc, directSrc]);

  useEffect(() => {
    let cancelled = false;

    const loadAuthenticatedStream = async () => {
      if (directSrc) {
        setBlobSrc(null);
        setIsLoadingStream(false);
        return;
      }

      if (!apiSrc) {
        setBlobSrc(null);
        setIsLoadingStream(false);
        return;
      }

      setIsLoadingStream(true);
      setCanPlay(false);
      setLoadError(null);

      try {
        const response = await apiFetch(apiSrc);
        if (!response.ok) {
          throw new Error(`Failed to load video (${response.status})`);
        }

        const blob = await response.blob();
        const nextObjectUrl = URL.createObjectURL(blob);

        if (cancelled) {
          URL.revokeObjectURL(nextObjectUrl);
          return;
        }

        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }

        objectUrlRef.current = nextObjectUrl;
        setBlobSrc(nextObjectUrl);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Video failed to load');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStream(false);
        }
      }
    };

    void loadAuthenticatedStream();

    return () => {
      cancelled = true;
    };
  }, [apiSrc, directSrc]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onCan = () => setCanPlay(true);
    const onMeta = () => {
      setCanPlay(true);
      setDuration(Number.isFinite(el.duration) ? el.duration : 0);
      if (el.videoWidth > 0 && el.videoHeight > 0) {
        setAspectRatio(`${el.videoWidth} / ${el.videoHeight}`);
      }
    };
    const onTimeUpdate = () => setCurrentTime(el.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () => setLoadError('Video failed to load');
    el.addEventListener('canplay', onCan);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('error', onError);
    return () => {
      el.removeEventListener('canplay', onCan);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('error', onError);
    };
  }, [resolvedSrc]);

  useEffect(() => {
    setAspectRatio('16 / 9');
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const togglePlay = async () => {
    const el = videoRef.current;
    if (!el) return;
    try {
      if (el.paused) {
        el.muted = false;
        setMuted(false);
        await el.play();
        setPlaying(true);
      } else {
        el.pause();
        setPlaying(false);
      }
    } catch (err) {
      // ignore play errors (autoplay blocked)
      setPlaying(false);
    }
  };

  const stopPlayback = () => {
    const el = videoRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    setPlaying(false);
  };

  const toggleFullscreen = async () => {
    const root = containerRef.current;
    if (!root) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await root.requestFullscreen();
      }
    } catch {
      // ignore fullscreen failures
    }
  };

  const handleDownload = async () => {
    const url = resolvedSrc;
    if (!url) return;

    if (downloadAnchorRef.current) {
      downloadAnchorRef.current.href = url;
      downloadAnchorRef.current.download = (typeof src === 'string' && src.split('/').pop()) || 'video.mp4';
      downloadAnchorRef.current.click();
      return;
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = (typeof src === 'string' && src.split('/').pop()) || 'video.mp4';
    link.click();
  };

  const seekTo = (nextTime: number) => {
    const el = videoRef.current;
    if (!el || !Number.isFinite(nextTime)) return;
    el.currentTime = Math.min(Math.max(nextTime, 0), duration || nextTime);
  };

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const whole = Math.floor(seconds);
    const minutes = Math.floor(whole / 60);
    const remaining = whole % 60;
    return `${minutes}:${String(remaining).padStart(2, '0')}`;
  };

  if (!resolvedSrc) {
    return (
      <div className={`relative w-full overflow-hidden bg-muted ${className}`} style={{ aspectRatio }}>
        {poster ? (
          <img src={poster} alt="video poster" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            {isLoadingStream ? 'Loading preview' : 'No preview available'}
          </div>
        )}
        {loadError && (
          <div className="absolute left-2 bottom-2 rounded-md border border-white/10 bg-black/60 px-2 py-0.5 text-[11px] text-white/90">
            {loadError}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative w-full overflow-hidden rounded bg-black ${className}`} style={{ aspectRatio }}>
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-contain"
        src={resolvedSrc}
        poster={poster || undefined}
        playsInline
        muted={muted}
        preload="metadata"
        controls={false}
        onClick={togglePlay}
      />

      <a ref={downloadAnchorRef} className="hidden" aria-hidden="true" tabIndex={-1} />

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent p-3 text-white">
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 backdrop-blur transition hover:bg-white/15"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
          </button>

          <button
            type="button"
            onClick={stopPlayback}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 text-xs font-medium backdrop-blur transition hover:bg-white/15"
            aria-label="Stop"
          >
            <Square className="h-3.5 w-3.5" />
            Stop
          </button>

          <button
            type="button"
            onClick={() => {
              const nextMuted = !muted;
              const el = videoRef.current;
              if (el) el.muted = nextMuted;
              setMuted(nextMuted);
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 backdrop-blur transition hover:bg-white/15"
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 text-xs font-medium backdrop-blur transition hover:bg-white/15"
            aria-label="Download video"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="ml-auto inline-flex h-9 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 text-xs font-medium backdrop-blur transition hover:bg-white/15"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            <Maximize2 className="h-3.5 w-3.5" />
            {isFullscreen ? 'Exit' : 'Full screen'}
          </button>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="tabular-nums text-white/80">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step="0.1"
            value={Math.min(currentTime, duration || currentTime)}
            onChange={(event) => seekTo(Number(event.target.value))}
            className="h-1 flex-1 cursor-pointer accent-white"
            aria-label="Seek video"
          />
          <span className="tabular-nums text-white/80">{formatTime(duration)}</span>
        </div>

        <div className="mt-2 text-[11px] text-white/70">
          {loadError ? loadError : canPlay ? 'Ready' : 'Loading'}
        </div>
      </div>
    </div>
  );
}
