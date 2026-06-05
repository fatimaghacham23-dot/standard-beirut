"use client";

import { useEffect, useState } from "react";
import { GrainGradient } from "@paper-design/shaders-react";
import { isMobilePerformanceDevice } from "@/lib/performance";
import { useInViewport } from "@/lib/use-in-viewport";

export function GradientBackground() {
  const [useShader, setUseShader] = useState(false);
  const { ref, isInView } = useInViewport<HTMLDivElement>();

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    setUseShader(!reduceMotion && !isMobilePerformanceDevice());
  }, []);

  if (!useShader) {
    return (
      <div
        ref={ref}
        className="
          pointer-events-none
          absolute
          inset-0
          z-0
          overflow-hidden
          bg-[#050505]
        "
        aria-hidden="true"
      >
        <div
          className="
            absolute
            inset-[-30%]
            animate-hero-gradient-drift
            bg-[radial-gradient(circle_at_68%_18%,rgba(173,104,24,0.72),transparent_32%),radial-gradient(circle_at_58%_44%,rgba(82,111,48,0.58),transparent_34%),radial-gradient(circle_at_76%_74%,rgba(105,43,20,0.52),transparent_34%),radial-gradient(circle_at_18%_78%,rgba(79,103,43,0.4),transparent_38%)]
            blur-xl
            will-change-transform
          "
          style={{ animationPlayState: isInView ? "running" : "paused" }}
        />
        <div className="absolute inset-0 bg-black/18" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.12)_45%,rgba(0,0,0,0.72)_100%)]" />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="
        pointer-events-none
        absolute
        inset-0
        z-0
        overflow-hidden
        opacity-95
      "
      aria-hidden="true"
    >
      <GrainGradient
        style={{ height: "100%", width: "100%" }}
        colorBack="hsl(0, 0%, 0%)"
        softness={0.72}
        intensity={0.42}
        noise={0.06}
        shape="corners"
        offsetX={0}
        offsetY={0}
        scale={1.08}
        rotation={0}
        speed={isInView ? 0.45 : 0}
        colors={[
          "hsl(38, 90%, 34%)",
          "hsl(82, 35%, 25%)",
          "hsl(18, 65%, 24%)",
        ]}
      />

      <div className="absolute inset-0 bg-black/28" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.2)_48%,rgba(0,0,0,0.8)_100%)]" />
    </div>
  );
}
