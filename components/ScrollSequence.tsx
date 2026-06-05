"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue
} from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SiteButton } from "@/components/SiteButton";
import { useInViewport } from "@/lib/use-in-viewport";

export type StoryBeat = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  start: number;
  end: number;
  align?: "left" | "center" | "right";
  ctaLabel?: string;
  ctaHref?: string;
};

type FitMode = "contain" | "cover";

type ScrollSequenceProps = {
  ariaLabel?: string;
  beats: StoryBeat[];
  frameCount?: number;
  fitMode?: FitMode;
  getFrameSrc?: (index: number) => string;
  id?: string;
};

const FRAME_COUNT = 60;
const FRAME_PLAYBACK_END = 0.92;
const PRIORITY_FRAME_COUNT = 8;
const PHONE_BREAKPOINT = 640;
const MOBILE_VIDEO_SCRUB_BREAKPOINT = 768;
const FRAME_SMOOTHING = 0.18;
const VIDEO_SCRUB_SMOOTHING = 0.22;
const MOBILE_CUP_SCALE = 1;
const MOBILE_CUP_SHIFT_X = 0;
const MOBILE_VIDEO_SRC = "/sequence/matcha-scroll.mp4";
const STABLE_VH_PROPERTY = "--stable-vh";

const defaultGetFrameSrc = (index: number) =>
  `/sequence/frame_${String(index + 1).padStart(3, "0")}.webp`;

function preloadFrame(src: string, priority = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.decoding = "async";

    if (priority) {
      image.loading = "eager";
    }

    if ("fetchPriority" in image) {
      (
        image as HTMLImageElement & { fetchPriority: "auto" | "high" }
      ).fetchPriority = priority ? "high" : "auto";
    }

    image.onload = async () => {
      try {
        await image.decode();
      } catch {
        // Some browsers can reject decode() after a successful load.
      }

      resolve(image);
    };
    image.onerror = () => {
      reject(new Error(`Failed to preload sequence frame: ${src}`));
    };
    image.src = src;
  });
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function getFramePosition(progress: number, frameCount: number) {
  return clamp(progress / FRAME_PLAYBACK_END) * (frameCount - 1);
}

function isFrameDrawable(
  image?: HTMLImageElement
): image is HTMLImageElement {
  return Boolean(
    image &&
      image.complete &&
      image.naturalWidth > 0 &&
      image.naturalHeight > 0
  );
}

function getStableViewportHeight() {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(STABLE_VH_PROPERTY)
    .trim();
  const parsedValue = Number.parseFloat(value);

  return value.endsWith("px") && Number.isFinite(parsedValue) && parsedValue > 0
    ? parsedValue
    : window.innerHeight;
}

function drawImage(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  image: HTMLImageElement
) {
  if (image.naturalWidth === 0 || image.naturalHeight === 0) {
    return;
  }

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const imageWidth = image.naturalWidth;
  const imageHeight = image.naturalHeight;
  const scale = Math.max(canvasWidth / imageWidth, canvasHeight / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const x = (canvasWidth - drawWidth) / 2;
  const y = (canvasHeight - drawHeight) / 2;
  const isMobile = window.innerWidth < PHONE_BREAKPOINT;
  const mobileCupScale = isMobile ? MOBILE_CUP_SCALE : 1;
  const cssWidth = parseFloat(canvas.style.width) || window.innerWidth;
  const pixelRatio = canvas.width / Math.max(1, cssWidth);
  const mobileShiftX = isMobile ? MOBILE_CUP_SHIFT_X * pixelRatio : 0;
  const finalDrawWidth = drawWidth * mobileCupScale;
  const finalDrawHeight = drawHeight * mobileCupScale;
  const finalX = x + (drawWidth - finalDrawWidth) / 2 + mobileShiftX;
  const finalY = y + (drawHeight - finalDrawHeight) / 2;

  context.drawImage(image, finalX, finalY, finalDrawWidth, finalDrawHeight);
}

function drawFrame(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  nextImage?: HTMLImageElement,
  nextOpacity = 0
) {
  const context = canvas.getContext("2d", { alpha: false });

  if (!context || image.naturalWidth === 0 || image.naturalHeight === 0) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "medium";
  drawImage(context, canvas, image);

  if (
    nextImage &&
    nextImage.complete &&
    nextImage.naturalWidth > 0 &&
    nextImage.naturalHeight > 0 &&
    nextOpacity > 0
  ) {
    context.globalAlpha = nextOpacity;
    drawImage(context, canvas, nextImage);
    context.globalAlpha = 1;
  }
}

function BeatOverlay({
  beat,
  progress,
  reducedMotion
}: {
  beat: StoryBeat;
  progress: MotionValue<number>;
  reducedMotion: boolean;
}) {
  const beatDuration = Math.max(0.001, beat.end - beat.start);
  const fadeDistance = Math.min(0.1, beatDuration * 0.4);
  const holdAtEnd = beat.end >= 1;
  const fadeInEnd = beat.start + fadeDistance;
  const fadeOutStart = beat.end - fadeDistance;
  const opacity = useTransform(
    progress,
    holdAtEnd
      ? [beat.start, fadeInEnd, beat.end]
      : [beat.start, fadeInEnd, fadeOutStart, beat.end],
    holdAtEnd ? [0, 1, 1] : [0, 1, 1, 0]
  );
  const y = useTransform(
    progress,
    holdAtEnd
      ? [beat.start, fadeInEnd, beat.end]
      : [beat.start, fadeInEnd, fadeOutStart, beat.end],
    reducedMotion
      ? holdAtEnd
        ? [0, 0, 0]
        : [0, 0, 0, 0]
      : holdAtEnd
        ? [20, 0, 0]
        : [20, 0, 0, -20]
  );

  const alignment =
    beat.align === "left"
      ? "items-center text-center md:items-start md:text-left"
      : beat.align === "right"
        ? "items-center text-center md:items-end md:text-right"
        : "items-center text-center";

  const placement =
    beat.align === "left"
      ? "md:justify-start"
      : beat.align === "right"
        ? "md:justify-end"
        : "justify-center";

  return (
    <motion.div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-20 flex ${placement} px-6 sm:px-8`}
      style={{ opacity, y }}
    >
      <div
        className={`flex h-full w-full max-w-6xl flex-col justify-center ${alignment}`}
      >
        <div className="max-w-[42rem] drop-shadow-[0_8px_30px_rgba(0,0,0,0.75)]">
          {beat.eyebrow ? (
            <p className="mb-4 font-body text-xs font-medium uppercase tracking-[0.35em] text-white/40">
              {beat.eyebrow}
            </p>
          ) : null}
          <h2 className="text-balance font-display text-5xl font-semibold leading-[0.88] text-white/90 sm:text-6xl md:text-7xl lg:text-8xl">
            {beat.title}
          </h2>
          <p className="mt-6 max-w-xl text-pretty font-body text-base leading-7 text-white/60 sm:text-lg">
            {beat.subtitle}
          </p>
          {beat.ctaHref && beat.ctaLabel ? (
            <SiteButton
              className="mt-8"
              href={beat.ctaHref}
            >
              {beat.ctaLabel}
            </SiteButton>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

function SceneTwoVisualLayers({
  reducedMotion,
  sceneEnd,
  sceneStart,
  scrollYProgress
}: {
  reducedMotion: boolean;
  sceneEnd: number;
  sceneStart: number;
  scrollYProgress: MotionValue<number>;
}) {
  const sceneDuration = sceneEnd - sceneStart;
  const at = (ratio: number) => sceneStart + sceneDuration * ratio;
  const layerOpacity = useTransform(
    scrollYProgress,
    [sceneStart, at(0.25), at(0.86), sceneEnd],
    reducedMotion ? [0, 0.16, 0.16, 0] : [0, 0.42, 0.42, 0]
  );
  const matchaX = useTransform(
    scrollYProgress,
    [sceneStart, at(0.48)],
    reducedMotion ? [0, 0] : [-180, 0]
  );
  const espressoX = useTransform(
    scrollYProgress,
    [at(0.1), at(0.58)],
    reducedMotion ? [0, 0] : [180, 0]
  );
  const iceY = useTransform(
    scrollYProgress,
    [at(0.2), at(0.68)],
    reducedMotion ? [0, 0] : [-160, 0]
  );
  const baseY = useTransform(
    scrollYProgress,
    [at(0.3), at(0.78)],
    reducedMotion ? [0, 0] : [160, 0]
  );
  const blur = useTransform(
    scrollYProgress,
    [sceneStart, at(0.48), sceneEnd],
    reducedMotion ? ["blur(8px)", "blur(8px)", "blur(8px)"] : ["blur(18px)", "blur(4px)", "blur(10px)"]
  );

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      style={{ opacity: layerOpacity }}
    >
      <div className="absolute inset-0 opacity-40 md:opacity-55">
        <motion.div
          className="pointer-events-none absolute left-[-12%] top-[48%] h-[18vh] w-[72vw] -rotate-6 rounded-full mix-blend-screen"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(145,180,74,0.42), rgba(63,92,34,0.18) 45%, transparent 72%)",
            filter: blur,
            x: matchaX
          }}
        />
        <motion.div
          className="pointer-events-none absolute right-[-14%] top-[38%] h-[14vh] w-[64vw] rotate-6 rounded-full mix-blend-screen"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(130,69,25,0.5), rgba(75,35,12,0.22) 48%, transparent 72%)",
            filter: blur,
            x: espressoX
          }}
        />
        <motion.div
          className="pointer-events-none absolute left-1/2 top-[8%] h-[28vh] w-[78vw] -translate-x-1/2 mix-blend-screen"
          style={{
            background:
              "radial-gradient(circle at 25% 40%, rgba(255,255,255,0.28), transparent 12%), radial-gradient(circle at 55% 25%, rgba(255,255,255,0.22), transparent 10%), radial-gradient(circle at 78% 55%, rgba(255,255,255,0.2), transparent 11%)",
            filter: blur,
            y: iceY
          }}
        />
        <motion.div
          className="pointer-events-none absolute bottom-[8%] left-1/2 h-[20vh] w-[78vw] -translate-x-1/2 rotate-2 rounded-full mix-blend-screen"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(99,135,54,0.42), rgba(41,70,32,0.2) 48%, transparent 76%)",
            filter: blur,
            y: baseY
          }}
        />
      </div>
    </motion.div>
  );
}

export default function ScrollSequence({
  ariaLabel = "Scroll-linked product animation",
  beats,
  frameCount = FRAME_COUNT,
  getFrameSrc = defaultGetFrameSrc,
  id
}: ScrollSequenceProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const framesRef = useRef<Array<HTMLImageElement | undefined>>([]);
  const targetFrameRef = useRef(0);
  const renderedFrameRef = useRef(0);
  const targetVideoTimeRef = useRef(0);
  const renderedVideoTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const videoRafRef = useRef<number | null>(null);
  const lastDrawnFrameRef = useRef(-1);
  const lastDrawnNextFrameRef = useRef(-1);
  const lastDrawnAlphaRef = useRef(-1);
  const lastViewportWidthRef = useRef(0);
  const orientationResizeTimeoutRef = useRef<number | null>(null);
  const firstFrameReadyRef = useRef(false);
  const isSequenceInViewRef = useRef(false);
  const useVideoScrubRef = useRef(false);
  const videoReadyRef = useRef(false);
  const loadedFramesRef = useRef<Set<number>>(new Set());
  const [firstFrameReady, setFirstFrameReady] = useState(false);
  const [preferVideoScrub, setPreferVideoScrub] = useState<boolean | null>(
    null
  );
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const reducedMotion = useReducedMotion();
  const { ref: inViewportRef, isInView: isSequenceInView } =
    useInViewport<HTMLDivElement>();
  const useVideoScrub = preferVideoScrub === true && !videoFailed;
  const showCanvas = firstFrameReady && (!useVideoScrub || !videoReady);

  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ["start start", "end end"]
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 360,
    damping: 42,
    mass: 0.35,
    restDelta: 0.0001
  });

  const progress = reducedMotion ? scrollYProgress : smoothProgress;
  const sceneTwoBeat = beats[1];

  const frameSources = useMemo(
    () => Array.from({ length: frameCount }, (_, index) => getFrameSrc(index)),
    [frameCount, getFrameSrc]
  );

  const setWrapperElement = useCallback(
    (node: HTMLDivElement | null) => {
      wrapperRef.current = node;
      inViewportRef.current = node;
    },
    [inViewportRef]
  );

  const getNearestLoadedFrame = useCallback(
    (targetIndex: number) => {
      const clampedIndex = Math.min(
        frameCount - 1,
        Math.max(0, Math.round(targetIndex))
      );

      if (isFrameDrawable(framesRef.current[clampedIndex])) {
        return clampedIndex;
      }

      for (let offset = 1; offset < frameCount; offset++) {
        const previous = clampedIndex - offset;
        const next = clampedIndex + offset;

        if (
          previous >= 0 &&
          isFrameDrawable(framesRef.current[previous])
        ) {
          return previous;
        }

        if (next < frameCount && isFrameDrawable(framesRef.current[next])) {
          return next;
        }
      }

      return 0;
    },
    [frameCount]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const root = document.documentElement;
    let lastWidth = window.innerWidth;
    let orientationTimeout: number | null = null;

    const setStableVh = () => {
      root.style.setProperty(STABLE_VH_PROPERTY, `${window.innerHeight}px`);
    };

    setStableVh();

    const handleResize = () => {
      const nextWidth = window.innerWidth;

      if (nextWidth !== lastWidth) {
        lastWidth = nextWidth;
        setStableVh();
      }
    };

    const handleOrientationChange = () => {
      if (orientationTimeout !== null) {
        window.clearTimeout(orientationTimeout);
      }

      orientationTimeout = window.setTimeout(() => {
        lastWidth = window.innerWidth;
        setStableVh();
        orientationTimeout = null;
      }, 300);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleOrientationChange);

      if (orientationTimeout !== null) {
        window.clearTimeout(orientationTimeout);
      }
    };
  }, []);

  const drawInterpolatedFrame = useCallback(
    (position: number, force = false) => {
      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      const clampedPosition = Math.min(frameCount - 1, Math.max(0, position));
      const baseIndex = Math.floor(clampedPosition);
      const nextIndex = Math.min(baseIndex + 1, frameCount - 1);
      const alpha = clampedPosition - baseIndex;
      const safeBaseIndex = getNearestLoadedFrame(baseIndex);
      const safeNextIndex = getNearestLoadedFrame(nextIndex);
      const frame = framesRef.current[safeBaseIndex];
      const nextFrame = framesRef.current[safeNextIndex];

      if (!isFrameDrawable(frame)) {
        return;
      }

      if (
        !force &&
        safeBaseIndex === lastDrawnFrameRef.current &&
        safeNextIndex === lastDrawnNextFrameRef.current &&
        Math.abs(alpha - lastDrawnAlphaRef.current) < 0.01
      ) {
        return;
      }

      lastDrawnFrameRef.current = safeBaseIndex;
      lastDrawnNextFrameRef.current = safeNextIndex;
      lastDrawnAlphaRef.current = alpha;
      drawFrame(
        canvas,
        frame,
        nextFrame,
        safeNextIndex !== safeBaseIndex ? alpha : 0
      );
    },
    [frameCount, getNearestLoadedFrame]
  );

  const cancelCanvasFrame = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const cancelVideoScrub = useCallback(() => {
    if (videoRafRef.current !== null) {
      window.cancelAnimationFrame(videoRafRef.current);
      videoRafRef.current = null;
    }
  }, []);

  const animateFrames = useCallback(() => {
    rafRef.current = null;

    if (
      !firstFrameReadyRef.current ||
      !isSequenceInViewRef.current ||
      useVideoScrubRef.current
    ) {
      return;
    }

    const current = renderedFrameRef.current;
    const target = targetFrameRef.current;
    const next = current + (target - current) * FRAME_SMOOTHING;

    renderedFrameRef.current =
      Math.abs(target - next) < 0.01 ? target : next;

    drawInterpolatedFrame(renderedFrameRef.current);

    if (Math.abs(target - renderedFrameRef.current) >= 0.01) {
      rafRef.current = window.requestAnimationFrame(animateFrames);
    }
  }, [drawInterpolatedFrame]);

  const scheduleCanvasFrame = useCallback(() => {
    if (
      rafRef.current !== null ||
      !firstFrameReadyRef.current ||
      !isSequenceInViewRef.current ||
      useVideoScrubRef.current
    ) {
      return;
    }

    rafRef.current = window.requestAnimationFrame(animateFrames);
  }, [animateFrames]);

  const animateVideoScrub = useCallback(() => {
    videoRafRef.current = null;

    const video = videoRef.current;

    if (
      !video ||
      !videoReadyRef.current ||
      !isSequenceInViewRef.current ||
      !useVideoScrubRef.current ||
      !Number.isFinite(video.duration) ||
      video.duration <= 0
    ) {
      return;
    }

    const current = renderedVideoTimeRef.current;
    const target = Math.min(
      video.duration,
      Math.max(0, targetVideoTimeRef.current)
    );
    const next = current + (target - current) * VIDEO_SCRUB_SMOOTHING;

    renderedVideoTimeRef.current =
      Math.abs(target - next) < 0.01 ? target : next;

    if (Math.abs(video.currentTime - renderedVideoTimeRef.current) > 0.016) {
      try {
        video.currentTime = renderedVideoTimeRef.current;
      } catch {
        setVideoFailed(true);
      }
    }

    if (Math.abs(target - renderedVideoTimeRef.current) >= 0.01) {
      videoRafRef.current = window.requestAnimationFrame(animateVideoScrub);
    }
  }, []);

  const scheduleVideoScrub = useCallback(() => {
    if (
      videoRafRef.current !== null ||
      !videoReadyRef.current ||
      !isSequenceInViewRef.current ||
      !useVideoScrubRef.current
    ) {
      return;
    }

    videoRafRef.current = window.requestAnimationFrame(animateVideoScrub);
  }, [animateVideoScrub]);

  const updateVideoTargetTime = useCallback((latest: number) => {
    const video = videoRef.current;

    if (
      !video ||
      !Number.isFinite(video.duration) ||
      video.duration <= 0
    ) {
      targetVideoTimeRef.current = 0;
      return;
    }

    targetVideoTimeRef.current =
      clamp(latest / FRAME_PLAYBACK_END) * video.duration;
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const rawPixelRatio = window.devicePixelRatio || 1;
    const pixelRatio =
      window.innerWidth < PHONE_BREAKPOINT
        ? Math.min(rawPixelRatio, 1.25)
        : Math.min(rawPixelRatio, 1.5);
    const width = window.innerWidth;
    const height = getStableViewportHeight();
    const nextWidth = Math.round(width * pixelRatio);
    const nextHeight = Math.round(height * pixelRatio);

    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    drawInterpolatedFrame(renderedFrameRef.current, true);
  }, [drawInterpolatedFrame]);

  useEffect(() => {
    const updateVideoPreference = () => {
      setPreferVideoScrub(window.innerWidth < MOBILE_VIDEO_SCRUB_BREAKPOINT);
    };

    updateVideoPreference();
    window.addEventListener("resize", updateVideoPreference, {
      passive: true
    });
    window.addEventListener("orientationchange", updateVideoPreference);

    return () => {
      window.removeEventListener("resize", updateVideoPreference);
      window.removeEventListener("orientationchange", updateVideoPreference);
    };
  }, []);

  useEffect(() => {
    isSequenceInViewRef.current = isSequenceInView;

    if (!isSequenceInView) {
      cancelCanvasFrame();
      cancelVideoScrub();
      return;
    }

    scheduleCanvasFrame();
    scheduleVideoScrub();
  }, [
    cancelCanvasFrame,
    cancelVideoScrub,
    isSequenceInView,
    scheduleCanvasFrame,
    scheduleVideoScrub
  ]);

  useEffect(() => {
    useVideoScrubRef.current = useVideoScrub;

    if (useVideoScrub) {
      cancelCanvasFrame();
      scheduleVideoScrub();
      return;
    }

    cancelVideoScrub();
    scheduleCanvasFrame();
  }, [
    cancelCanvasFrame,
    cancelVideoScrub,
    scheduleCanvasFrame,
    scheduleVideoScrub,
    useVideoScrub
  ]);

  useEffect(() => {
    videoReadyRef.current = videoReady;

    if (videoReady) {
      scheduleVideoScrub();
    }
  }, [scheduleVideoScrub, videoReady]);

  useEffect(() => {
    if (preferVideoScrub === null) {
      return;
    }

    let cancelled = false;
    let cancelDeferredPreload: (() => void) | null = null;
    const shouldUseVideoScrub = preferVideoScrub && !videoFailed;

    framesRef.current = new Array(frameCount);
    loadedFramesRef.current = new Set();
    firstFrameReadyRef.current = false;
    targetFrameRef.current = 0;
    renderedFrameRef.current = 0;
    lastDrawnFrameRef.current = -1;
    lastDrawnNextFrameRef.current = -1;
    lastDrawnAlphaRef.current = -1;
    setFirstFrameReady(false);

    resizeCanvas();
    lastViewportWidthRef.current = window.innerWidth;

    const loadFrameAtIndex = async (index: number) => {
      if (
        index < 0 ||
        index >= frameCount ||
        cancelled ||
        loadedFramesRef.current.has(index)
      ) {
        return;
      }

      try {
        const image = await preloadFrame(
          frameSources[index],
          index < PRIORITY_FRAME_COUNT
        );

        if (cancelled) {
          return;
        }

        framesRef.current[index] = image;
        loadedFramesRef.current.add(index);

        if (index === 0) {
          const requestedPosition = targetFrameRef.current;
          const canvas = canvasRef.current;

          firstFrameReadyRef.current = true;

          if (canvas) {
            renderedFrameRef.current = requestedPosition;
            drawInterpolatedFrame(requestedPosition, true);
          }

          setFirstFrameReady(true);
          return;
        }

        drawInterpolatedFrame(renderedFrameRef.current, true);
      } catch {
        // Missing frames should never surface as UI; the canvas keeps using the nearest decoded frame.
      }
    };

    const preloadRemainingFrames = () => {
      Array.from({ length: frameCount }, (_, index) => index)
        .filter((index) => index >= PRIORITY_FRAME_COUNT)
        .forEach((index) => {
          void loadFrameAtIndex(index);
        });
    };

    const deferRemainingPreload = () => {
      const idleWindow = window as unknown as {
        cancelIdleCallback?: (handle: number) => void;
        requestIdleCallback?: (callback: () => void) => number;
      };
      let idleId: number | null = null;
      let timeoutId: number | null = null;
      let didStartRemainingPreload = false;

      const startRemainingPreload = () => {
        if (didStartRemainingPreload) {
          return;
        }

        didStartRemainingPreload = true;
        preloadRemainingFrames();
      };

      if (
        typeof idleWindow.requestIdleCallback === "function" &&
        typeof idleWindow.cancelIdleCallback === "function"
      ) {
        idleId = idleWindow.requestIdleCallback(startRemainingPreload);
      }

      timeoutId = window.setTimeout(startRemainingPreload, 300);

      cancelDeferredPreload = () => {
        if (idleId !== null) {
          idleWindow.cancelIdleCallback?.(idleId);
        }

        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
      };
    };

    const loadFrames = async () => {
      await loadFrameAtIndex(0);

      if (cancelled || !firstFrameReadyRef.current) {
        return;
      }

      if (shouldUseVideoScrub) {
        return;
      }

      const priorityFrames = Array.from(
        { length: Math.min(PRIORITY_FRAME_COUNT, frameCount) },
        (_, index) => index
      ).filter((index) => index > 0);

      await Promise.all(priorityFrames.map((index) => loadFrameAtIndex(index)));

      if (cancelled) {
        return;
      }

      drawInterpolatedFrame(renderedFrameRef.current, true);
      deferRemainingPreload();
    };

    void loadFrames();

    const handleResize = () => {
      const nextWidth = window.innerWidth;
      const isHeightOnlyResize = nextWidth === lastViewportWidthRef.current;
      const isLikelyMobile =
        nextWidth < PHONE_BREAKPOINT ||
        window.matchMedia("(pointer: coarse)").matches;

      if (isLikelyMobile && isHeightOnlyResize) {
        return;
      }

      lastViewportWidthRef.current = nextWidth;
      resizeCanvas();
    };

    const handleOrientationChange = () => {
      if (orientationResizeTimeoutRef.current !== null) {
        window.clearTimeout(orientationResizeTimeoutRef.current);
      }

      orientationResizeTimeoutRef.current = window.setTimeout(() => {
        lastViewportWidthRef.current = window.innerWidth;
        resizeCanvas();
        orientationResizeTimeoutRef.current = null;
      }, 350);
    };

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      cancelled = true;
      cancelDeferredPreload?.();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleOrientationChange);

      if (orientationResizeTimeoutRef.current !== null) {
        window.clearTimeout(orientationResizeTimeoutRef.current);
      }
    };
  }, [
    drawInterpolatedFrame,
    frameCount,
    frameSources,
    preferVideoScrub,
    resizeCanvas,
    videoFailed
  ]);

  useEffect(() => {
    const updateTargetFrame = (latest: number) => {
      targetFrameRef.current = getFramePosition(latest, frameCount);
      updateVideoTargetTime(latest);
      scheduleCanvasFrame();
      scheduleVideoScrub();
    };

    updateTargetFrame(scrollYProgress.get());
    return scrollYProgress.on("change", updateTargetFrame);
  }, [
    frameCount,
    scheduleCanvasFrame,
    scheduleVideoScrub,
    scrollYProgress,
    updateVideoTargetTime
  ]);

  useEffect(() => {
    if (!firstFrameReady) {
      return;
    }

    firstFrameReadyRef.current = true;
    scheduleCanvasFrame();
  }, [firstFrameReady, scheduleCanvasFrame]);

  const handleVideoLoadedMetadata = useCallback(() => {
    const video = videoRef.current;

    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
      setVideoFailed(true);
      return;
    }

    video.pause();
    setVideoFailed(false);
    setVideoReady(true);
    videoReadyRef.current = true;
    updateVideoTargetTime(scrollYProgress.get());
    renderedVideoTimeRef.current = targetVideoTimeRef.current;

    try {
      video.currentTime = renderedVideoTimeRef.current;
    } catch {
      setVideoFailed(true);
      return;
    }

    scheduleVideoScrub();
  }, [scheduleVideoScrub, scrollYProgress, updateVideoTargetTime]);

  const handleVideoError = useCallback(() => {
    setVideoReady(false);
    setVideoFailed(true);
    videoReadyRef.current = false;
  }, []);

  return (
    <section
      id={id}
      ref={setWrapperElement}
      aria-label={ariaLabel}
      className="relative bg-[#050505]"
      style={{ height: "calc(var(--stable-vh) * 4)" }}
    >
      <div className="relative sticky top-0 h-[var(--stable-vh)] w-screen overflow-hidden bg-[#050505]">
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 bg-center bg-no-repeat transition-opacity duration-500"
          style={{
            backgroundImage: `url('${frameSources[0]}')`,
            backgroundSize: "cover",
            opacity: firstFrameReady ? 0 : 1
          }}
        />
        {useVideoScrub ? (
          <video
            ref={videoRef}
            aria-hidden="true"
            muted
            playsInline
            preload="auto"
            poster={frameSources[0]}
            onError={handleVideoError}
            onLoadedMetadata={handleVideoLoadedMetadata}
            className={`absolute inset-0 z-[1] h-[var(--stable-vh)] w-screen bg-[#050505] object-cover transition-opacity duration-700 ${
              videoReady && !videoFailed ? "opacity-100" : "opacity-0"
            }`}
            style={{
              transform: `translateX(${MOBILE_CUP_SHIFT_X}px) scale(${MOBILE_CUP_SCALE})`,
              transformOrigin: "center center"
            }}
          >
            <source src={MOBILE_VIDEO_SRC} type="video/mp4" />
          </video>
        ) : null}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className={`absolute inset-0 z-[1] h-[var(--stable-vh)] w-screen bg-[#050505] transition-opacity duration-700 ${
            showCanvas ? "opacity-100" : "opacity-0"
          }`}
        />

        {sceneTwoBeat ? (
          <SceneTwoVisualLayers
            reducedMotion={Boolean(reducedMotion)}
            sceneEnd={sceneTwoBeat.end}
            sceneStart={sceneTwoBeat.start}
            scrollYProgress={scrollYProgress}
          />
        ) : null}

        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[24vh] sm:h-36"
          style={{
            background:
              "linear-gradient(to bottom, #050505 0%, rgba(5, 5, 5, 0.78) 28%, rgba(5, 5, 5, 0) 100%)"
          }}
        />
        <div
          className="
            pointer-events-none
            absolute
            inset-x-0
            bottom-0
            z-10
            h-48
            bg-gradient-to-t
            from-[#050505]
            via-[#050505]/90
            to-transparent

            md:h-56
            md:via-[#050505]/80
          "
          aria-hidden="true"
        />
        <div
          className="
            pointer-events-none
            absolute
            inset-x-0
            bottom-0
            z-10
            h-24
            bg-[#050505]
            blur-2xl
          "
          aria-hidden="true"
        />

        {beats.map((beat) => (
          <BeatOverlay
            key={`${beat.title}-${beat.start}`}
            beat={beat}
            progress={progress}
            reducedMotion={Boolean(reducedMotion)}
          />
        ))}
      </div>
    </section>
  );
}
