"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { useInViewport } from "@/lib/use-in-viewport";

function TextArc({ text }: { text: string }) {
  const characters = text.split("");
  const angleStep = 360 / characters.length;

  return (
    <div className="absolute inset-0">
      {characters.map((char, index) => {
        const angle = angleStep * index;

        return (
          <span
            key={`${char}-${index}`}
            className="absolute left-1/2 top-0 text-[8px] font-semibold uppercase tracking-[0.2em] text-white/65 sm:text-[9px] md:text-[10px]"
            style={{
              height: "50%",
              marginLeft: "-0.35em",
              transform: `rotate(${angle}deg)`,
              transformOrigin: "bottom center"
            }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
}

export function FactArcSignature({
  arcText,
  brandName,
  className,
  logoAlt,
  style
}: {
  arcText: string;
  brandName: string;
  className?: string;
  logoAlt?: string;
  markText?: string;
  style?: CSSProperties;
}) {
  const reducedMotion = useReducedMotion();
  const { ref, isInView } = useInViewport<HTMLDivElement>();
  const imageAlt = logoAlt ?? `${brandName} logo`;

  return (
    <motion.div
      ref={ref}
      aria-label={`${brandName} logo seal`}
      className={cn(
        "pointer-events-none flex items-center justify-center opacity-85",
        className
      )}
      style={style}
      initial={{
        opacity: 0,
        scale: 0.55,
        rotate: -38,
        x: -42,
        y: 22,
        filter: "blur(16px)"
      }}
      animate={{
        opacity: 0.86,
        scale: 1,
        rotate: -16,
        x: 0,
        y: 0,
        filter: "blur(0px)"
      }}
      transition={{
        duration: 1.45,
        delay: 0.45,
        ease: [0.22, 1, 0.36, 1]
      }}
    >
      <motion.div
        className="absolute inset-0 rounded-full opacity-80"
        animate={reducedMotion || !isInView ? undefined : { rotate: 360 }}
        transition={{
          repeat: Infinity,
          duration: 24,
          ease: "linear"
        }}
      >
        <TextArc text={arcText} />
      </motion.div>

      <div className="absolute inset-[7%] rounded-full border border-white/10 opacity-50" />

      <div className="relative flex h-[68%] w-[68%] items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#0c0c0c] shadow-[0_18px_55px_rgba(255,255,255,0.14)] backdrop-blur-md">
        <Image
          src="/brand/signature-logo.png"
          alt={imageAlt}
          fill
          priority
          sizes="(min-width: 1280px) 164px, (min-width: 1024px) 152px, (min-width: 768px) 130px, 90px"
          className="rounded-full object-cover"
        />
      </div>
    </motion.div>
  );
}
