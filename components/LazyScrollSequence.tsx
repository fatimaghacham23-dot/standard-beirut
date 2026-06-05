"use client";

import dynamic from "next/dynamic";
import type { StoryBeat } from "@/components/ScrollSequence";

type FitMode = "contain" | "cover";

type LazyScrollSequenceProps = {
  ariaLabel?: string;
  beats: StoryBeat[];
  frameCount?: number;
  fitMode?: FitMode;
  getFrameSrc?: (index: number) => string;
  id?: string;
};

const ScrollSequence = dynamic<LazyScrollSequenceProps>(
  () => import("@/components/ScrollSequence"),
  {
    ssr: false,
    loading: () => (
      <section
        aria-hidden="true"
        className="relative bg-[#050505]"
        style={{ height: "calc(var(--stable-vh) * 4)" }}
      />
    )
  }
);

export function LazyScrollSequence(props: LazyScrollSequenceProps) {
  return <ScrollSequence {...props} />;
}
