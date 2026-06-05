"use client";

import { motion } from "framer-motion";
import { Typewriter } from "@/components/ui/typewriter";
import { useInViewport } from "@/lib/use-in-viewport";

type HeroTypewriterLineProps = {
  accent: string;
  items: string[];
  prefix: string;
};

export function HeroTypewriterLine({
  accent,
  items,
  prefix
}: HeroTypewriterLineProps) {
  const { ref, isInView } = useInViewport<HTMLDivElement>();

  return (
    <motion.div
      ref={ref}
      className="
        pointer-events-none
        relative
        z-20
        mt-10
        w-full
        max-w-[92vw]
        px-6
        text-center
        text-base
        font-medium
        leading-tight
        tracking-normal
        text-white/55

        md:absolute
        md:bottom-[10%]
        md:left-1/2
        md:mt-0
        md:max-w-[720px]
        md:-translate-x-1/2
        md:[translate:-50%_0]
        md:text-xl

        lg:bottom-[9%]
        lg:text-2xl
      "
      initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{
        duration: 1,
        delay: 1.1,
        ease: [0.22, 1, 0.36, 1]
      }}
    >
      <div className="mx-auto flex w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
        <span className="text-white/45">{prefix}</span>
        <span className="text-white/70">{accent}</span>

        <Typewriter
          active={isInView}
          text={items}
          speed={65}
          waitTime={1600}
          deleteSpeed={35}
          cursorChar="_"
          className="inline-block min-w-[170px] text-left font-body text-white/85 sm:min-w-[210px] md:min-w-[250px]"
          cursorClassName="ml-1 text-white/50"
        />
      </div>
    </motion.div>
  );
}
