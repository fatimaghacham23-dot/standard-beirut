"use client";

import * as React from "react";

import { isMobilePerformanceDevice } from "@/lib/performance";
import { cn } from "@/lib/utils";

export function LiquidGlassPanel({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const id = React.useId();
  const filterId = `liquid-glass-panel-${id.replace(/:/g, "")}`;
  const [useExpensiveFilter, setUseExpensiveFilter] = React.useState(false);

  React.useEffect(() => {
    setUseExpensiveFilter(!isMobilePerformanceDevice());
  }, []);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-full px-6 py-5",
        "transition duration-300 hover:scale-[1.015]",
        className
      )}
    >
      <div
        className="
          absolute inset-0 z-0 rounded-full
          shadow-[0_0_6px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3px_rgba(255,255,255,0.35),inset_-3px_-3px_0.5px_-3px_rgba(255,255,255,0.25),inset_1px_1px_1px_-0.5px_rgba(255,255,255,0.28),inset_-1px_-1px_1px_-0.5px_rgba(255,255,255,0.18),inset_0_0_6px_6px_rgba(255,255,255,0.06),inset_0_0_2px_2px_rgba(255,255,255,0.04),0_0_24px_rgba(255,255,255,0.08)]
          transition-all
          group-hover:shadow-[0_0_10px_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.25),inset_3px_3px_0.5px_-3px_rgba(255,255,255,0.5),inset_-3px_-3px_0.5px_-3px_rgba(255,255,255,0.32),inset_0_0_8px_8px_rgba(255,255,255,0.08),0_0_32px_rgba(255,255,255,0.12)]
        "
      />

      <div
        className="absolute inset-0 isolate -z-10 h-full w-full overflow-hidden rounded-full bg-white/[0.035] backdrop-blur-md"
        style={{
          backdropFilter: useExpensiveFilter
            ? `url("#${filterId}") blur(14px)`
            : "blur(14px)"
        }}
      />

      <div className="pointer-events-none absolute inset-0 rounded-full border border-white/15" />

      <div className="pointer-events-none absolute left-8 right-8 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />

      <div className="relative z-10">{children}</div>

      {useExpensiveFilter ? (
      <svg className="hidden">
        <defs>
          <filter
            id={filterId}
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.05 0.05"
              numOctaves="1"
              seed="1"
              result="turbulence"
            />
            <feGaussianBlur
              in="turbulence"
              stdDeviation="2"
              result="blurredNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="blurredNoise"
              scale="50"
              xChannelSelector="R"
              yChannelSelector="B"
              result="displaced"
            />
            <feGaussianBlur
              in="displaced"
              stdDeviation="3"
              result="finalBlur"
            />
            <feComposite in="finalBlur" in2="finalBlur" operator="over" />
          </filter>
        </defs>
      </svg>
      ) : null}
    </div>
  );
}
