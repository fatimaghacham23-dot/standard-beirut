"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function HandDrawnOval({
  className
}: {
  className?: string;
}) {
  return (
    <motion.svg
      viewBox="0 0 100 60"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible text-white/65",
        className
      )}
      initial="hidden"
      animate="visible"
    >
      <motion.path
        d="
          M 6 31
          C 6 10, 24 5, 50 5
          C 78 5, 95 12, 96 30
          C 97 48, 77 55, 50 55
          C 22 55, 5 48, 6 31
        "
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          visible: {
            pathLength: 1,
            opacity: 1,
            transition: {
              pathLength: {
                duration: 2.1,
                ease: [0.43, 0.13, 0.23, 0.96],
              },
              opacity: { duration: 0.3 },
            },
          },
        }}
      />

      <motion.path
        d="M 84 7 C 89 10, 93 14, 96 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          visible: {
            pathLength: 1,
            opacity: 1,
            transition: {
              delay: 1.6,
              pathLength: { duration: 0.55 },
              opacity: { duration: 0.2 },
            },
          },
        }}
      />
    </motion.svg>
  );
}
