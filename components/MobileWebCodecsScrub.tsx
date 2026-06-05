"use client";

import { useEffect, useRef } from "react";
import { useMotionValueEvent, type MotionValue } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Props = {
  videoSrc: string;
  scrollProgress: MotionValue<number>;
  playbackEnd: number;
  onFallback: () => void;
  onReady: () => void;
};

type SampleEntry = {
  data: ArrayBuffer;
  timestamp: number;
  duration: number;
  isSync: boolean;
};

type EngineState = {
  samples: SampleEntry[];
  tsToIndex: Map<number, number>;
  cache: Map<number, VideoFrame>;
  pending: Set<number>;
  decoder: VideoDecoder | null;
  totalFrames: number;
  targetFrame: number;
  renderedFrame: number;
  rafId: number | null;
  lastDrawn: number;
  ready: boolean;
  failed: boolean;
  scheduleFrame: (() => void) | null;
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Number of decoded VideoFrame objects to keep in the LRU cache. */
const CACHE_SIZE = 10;

/** Lerp factor for smoothing the rendered frame toward the scroll target. */
const SMOOTHING = 0.18;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MobileWebCodecsScrub({
  videoSrc,
  scrollProgress,
  playbackEnd,
  onFallback,
  onReady,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  /*
   * Keep callback refs fresh so the decoder's output / error handlers
   * (created once during init) always invoke the latest parent callbacks.
   */
  const onFallbackRef = useRef(onFallback);
  const onReadyRef = useRef(onReady);
  onFallbackRef.current = onFallback;
  onReadyRef.current = onReady;

  /*
   * All mutable state lives in a single ref object.  This avoids stale-
   * closure problems: the scroll handler, RAF loop, and decoder output
   * callback all read the *same* object without needing React re-renders.
   */
  const engine = useRef<EngineState>({
    samples: [],
    tsToIndex: new Map(),
    cache: new Map(),
    pending: new Set(),
    decoder: null,
    totalFrames: 0,
    targetFrame: 0,
    renderedFrame: 0,
    rafId: null,
    lastDrawn: -1,
    ready: false,
    failed: false,
    scheduleFrame: null,
  });

  /* ---------------------------------------------------------------- */
  /*  Initialisation effect                                            */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;
    const s = engine.current;

    /* Reset mutable state for this effect cycle. */
    s.samples = [];
    s.tsToIndex.clear();
    s.cache.clear();
    s.pending.clear();
    s.decoder = null;
    s.totalFrames = 0;
    s.targetFrame = 0;
    s.renderedFrame = 0;
    s.lastDrawn = -1;
    s.ready = false;
    s.failed = false;
    s.scheduleFrame = null;

    /* -------------------------------------------------------------- */
    /*  Pure helpers – close over `s`, `canvasRef`, and `cancelled`    */
    /* -------------------------------------------------------------- */

    /** Draw a VideoFrame to the canvas using cover-fit math. */
    function drawVideoFrame(frame: VideoFrame) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (cssW === 0 || cssH === 0) return;

      /* Keep the backing-store in sync with CSS size (1x for mobile). */
      if (canvas.width !== cssW || canvas.height !== cssH) {
        canvas.width = cssW;
        canvas.height = cssH;
      }

      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;

      const cw = canvas.width;
      const ch = canvas.height;
      const scale = Math.max(
        cw / frame.displayWidth,
        ch / frame.displayHeight
      );
      const dw = frame.displayWidth * scale;
      const dh = frame.displayHeight * scale;

      ctx.drawImage(frame, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    }

    /** Evict the farthest-from-target frames when the cache exceeds CACHE_SIZE. */
    function evictCache(target: number) {
      if (s.cache.size <= CACHE_SIZE) return;

      const entries = Array.from(s.cache.entries()).sort(
        (a, b) => Math.abs(a[0] - target) - Math.abs(b[0] - target)
      );

      while (entries.length > CACHE_SIZE) {
        const [idx, f] = entries.pop()!;
        try {
          f.close();
        } catch {
          /* already closed */
        }
        s.cache.delete(idx);
      }
    }

    /** Submit a single sample for decoding if it is not already cached / pending. */
    function decodeOne(index: number) {
      if (
        !s.decoder ||
        s.decoder.state !== "configured" ||
        index < 0 ||
        index >= s.totalFrames ||
        s.cache.has(index) ||
        s.pending.has(index)
      ) {
        return;
      }

      s.pending.add(index);
      const sample = s.samples[index];

      try {
        s.decoder.decode(
          new EncodedVideoChunk({
            type: sample.isSync ? "key" : "delta",
            timestamp: sample.timestamp,
            duration: sample.duration,
            data: sample.data,
          })
        );
      } catch {
        s.pending.delete(index);
      }
    }

    /** Request decode for the target frame and its immediate neighbours. */
    function requestNearby(target: number) {
      if (s.totalFrames === 0) return;
      const t = Math.max(0, Math.min(s.totalFrames - 1, target));

      decodeOne(t);
      const r = Math.floor(CACHE_SIZE / 2);
      for (let i = 1; i <= r; i++) {
        if (t + i < s.totalFrames) decodeOne(t + i);
        if (t - i >= 0) decodeOne(t - i);
      }
      evictCache(t);
    }

    /** Return the closest cached frame to `target`, or null. */
    function nearestCached(target: number): VideoFrame | null {
      if (s.cache.has(target)) return s.cache.get(target)!;

      for (let d = 1; d <= s.totalFrames; d++) {
        if (s.cache.has(target - d)) return s.cache.get(target - d)!;
        if (s.cache.has(target + d)) return s.cache.get(target + d)!;
      }

      return null;
    }

    /** RAF animation tick: smooth toward target and draw. */
    function animate() {
      s.rafId = null;
      if (!s.ready || s.failed || cancelled) return;

      const target = s.targetFrame;
      const cur = s.renderedFrame;
      const next = cur + (target - cur) * SMOOTHING;
      s.renderedFrame = Math.abs(target - next) < 0.01 ? target : next;

      const idx = Math.round(s.renderedFrame);
      if (idx !== s.lastDrawn) {
        const f = nearestCached(idx);
        if (f) {
          drawVideoFrame(f);
          s.lastDrawn = idx;
        }
      }

      requestNearby(Math.round(target));

      if (Math.abs(target - s.renderedFrame) >= 0.01) {
        s.rafId = requestAnimationFrame(animate);
      }
    }

    /* Expose the schedule helper so the scroll-event handler can start the loop. */
    s.scheduleFrame = () => {
      if (s.rafId !== null || !s.ready || s.failed) return;
      s.rafId = requestAnimationFrame(animate);
    };

    /* -------------------------------------------------------------- */
    /*  Async init: fetch -> demux -> configure decoder -> first frame */
    /* -------------------------------------------------------------- */

    (async () => {
      try {
        /* 1. Dynamic-import mp4box (only downloaded on mobile). */
        const mp4boxModule = await import("mp4box");
        const MP4Box = (mp4boxModule as Record<string, unknown>).default ?? mp4boxModule;
        if (cancelled) return;

        /* 2. Fetch the MP4 as a single ArrayBuffer. */
        const resp = await fetch(videoSrc);
        if (!resp.ok) throw new Error(`fetch ${resp.status}`);
        const buf = await resp.arrayBuffer();
        if (cancelled) return;

        /* 3. Demux with mp4box.js (synchronous once the full buffer is appended). */
        const file = (MP4Box as Record<string, (...args: unknown[]) => unknown>).createFile();
        let cfg: VideoDecoderConfig | null = null;
        let demuxErr: Error | null = null;

        (file as Record<string, unknown>).onReady = (info: Record<string, unknown>) => {
          const videoTracks = info.videoTracks as Array<Record<string, unknown>> | undefined;
          const trk = videoTracks?.[0];
          if (!trk) {
            demuxErr = new Error("no video track");
            return;
          }

          /* Extract the codec description (avcC / hvcC box).
             WebCodecs needs this raw box payload for H.264/H.265. */
          let desc: Uint8Array | undefined;
          try {
            const trak = (file as Record<string, (...args: unknown[]) => Record<string, unknown>>)
              .getTrackById(trk.id);
            const mdia = trak.mdia as Record<string, unknown>;
            const minf = mdia.minf as Record<string, unknown>;
            const stbl = minf.stbl as Record<string, unknown>;
            const stsd = stbl.stsd as Record<string, unknown>;
            const entries = stsd.entries as Array<Record<string, unknown>>;
            for (const entry of entries) {
              const box = (entry.avcC || entry.hvcC) as Record<string, unknown> | undefined;
              if (box) {
                const DS = (MP4Box as Record<string, unknown>).DataStream as
                  (new (...args: unknown[]) => Record<string, unknown>) | undefined;
                if (DS) {
                  const bigEndian = (DS as unknown as Record<string, unknown>).BIG_ENDIAN;
                  const st = new DS(undefined, 0, bigEndian);
                  (box as Record<string, (...args: unknown[]) => void>).write(st);
                  desc = new Uint8Array(st.buffer as ArrayBuffer, 8);
                }
                break;
              }
            }
          } catch {
            /* Proceed without description - the decoder will error if needed. */
          }

          cfg = {
            codec: trk.codec as string,
            codedWidth: (trk.video as Record<string, number>).width,
            codedHeight: (trk.video as Record<string, number>).height,
            ...(desc ? { description: desc } : {}),
          };

          (file as Record<string, (...args: unknown[]) => void>).setExtractionOptions(trk.id);
          (file as Record<string, (...args: unknown[]) => void>).start();
        };

        (file as Record<string, unknown>).onSamples = (
          _id: number,
          _u: unknown,
          raw: Array<Record<string, unknown>>
        ) => {
          for (const r of raw) {
            const rData = r.data as Uint8Array;
            s.samples.push({
              data: rData.buffer.slice(
                rData.byteOffset,
                rData.byteOffset + rData.byteLength
              ) as ArrayBuffer,
              timestamp: ((r.cts as number) * 1_000_000) / (r.timescale as number),
              duration: ((r.duration as number) * 1_000_000) / (r.timescale as number),
              isSync: r.is_sync as boolean,
            });
          }
        };

        (file as Record<string, unknown>).onError = (e: string) => {
          demuxErr = new Error(e);
        };

        (buf as unknown as Record<string, unknown>).fileStart = 0;
        (file as Record<string, (...args: unknown[]) => void>).appendBuffer(buf);
        (file as Record<string, (...args: unknown[]) => void>).flush();

        if (demuxErr || !cfg || s.samples.length === 0) {
          throw demuxErr || new Error("demux produced no samples");
        }
        if (cancelled) return;

        /* Bind to a const so TypeScript preserves the narrowing past await. */
        const decoderConfig: VideoDecoderConfig = cfg;

        /* Sort samples by presentation timestamp and build a fast lookup. */
        s.samples.sort((a, b) => a.timestamp - b.timestamp);
        s.totalFrames = s.samples.length;
        for (let i = 0; i < s.samples.length; i++) {
          s.tsToIndex.set(s.samples[i].timestamp, i);
        }

        /* 4. Check codec support before creating the decoder. */
        const support = await VideoDecoder.isConfigSupported(decoderConfig);
        if (!support.supported) {
          throw new Error(`unsupported codec: ${decoderConfig.codec}`);
        }
        if (cancelled) return;

        /* 5. Create and configure the VideoDecoder. */
        const decoder = new VideoDecoder({
          output: (frame: VideoFrame) => {
            if (cancelled) {
              frame.close();
              return;
            }

            /* Map the frame's timestamp back to a sample index. */
            let idx = s.tsToIndex.get(frame.timestamp) ?? -1;
            if (idx === -1) {
              /* Fallback: linear scan (should not happen with integer us). */
              for (let i = 0; i < s.samples.length; i++) {
                if (Math.abs(s.samples[i].timestamp - frame.timestamp) < 1000) {
                  idx = i;
                  break;
                }
              }
            }

            if (idx >= 0) {
              const old = s.cache.get(idx);
              if (old) {
                try {
                  old.close();
                } catch {
                  /* already closed */
                }
              }
              s.cache.set(idx, frame);
              s.pending.delete(idx);

              /* Signal readiness on the very first decoded frame. */
              if (!s.ready) {
                s.ready = true;
                drawVideoFrame(frame);
                s.lastDrawn = idx;
                onReadyRef.current();
              }
            } else {
              frame.close();
            }
          },
          error: () => {
            if (!s.failed && !cancelled) {
              s.failed = true;
              onFallbackRef.current();
            }
          },
        });

        decoder.configure(decoderConfig);
        s.decoder = decoder;
        if (cancelled) return;

        /* 6. Decode the first frame and wait for it. */
        decodeOne(0);
        try {
          await decoder.flush();
        } catch {
          /* Decoder may have been closed during the await. */
        }
        if (cancelled) return;

        /* 7. Pre-decode frames near the current scroll position. */
        const p0 = Math.min(
          1,
          Math.max(0, scrollProgress.get() / playbackEnd)
        );
        const t0 = Math.round(p0 * (s.totalFrames - 1));
        s.targetFrame = t0;
        s.renderedFrame = t0;
        requestNearby(t0);
      } catch {
        if (!cancelled && !s.failed) {
          s.failed = true;
          onFallbackRef.current();
        }
      }
    })();

    /* -------------------------------------------------------------- */
    /*  Cleanup                                                        */
    /* -------------------------------------------------------------- */

    return () => {
      cancelled = true;

      if (s.rafId !== null) {
        cancelAnimationFrame(s.rafId);
        s.rafId = null;
      }

      for (const f of Array.from(s.cache.values())) {
        try {
          f.close();
        } catch {
          /* already closed */
        }
      }
      s.cache.clear();
      s.pending.clear();

      if (s.decoder && s.decoder.state !== "closed") {
        try {
          s.decoder.close();
        } catch {
          /* ignore */
        }
      }
      s.decoder = null;
      s.scheduleFrame = null;
    };

    /*
     * `scrollProgress` is a MotionValue (stable ref), so it never triggers
     * this effect.  `videoSrc` and `playbackEnd` are the real deps.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoSrc, playbackEnd]);

  /* ---------------------------------------------------------------- */
  /*  Scroll -> target frame                                           */
  /* ---------------------------------------------------------------- */

  useMotionValueEvent(scrollProgress, "change", (latest) => {
    const s = engine.current;
    if (!s.ready || s.failed || s.totalFrames === 0) return;

    const progress = Math.min(1, Math.max(0, latest / playbackEnd));
    s.targetFrame = progress * (s.totalFrames - 1);
    s.scheduleFrame?.();
  });

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
    />
  );
}