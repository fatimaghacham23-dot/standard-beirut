"use client";

import type { ReactNode } from "react";
import { LiquidCtaButton } from "@/components/LiquidCtaButton";
import { cn } from "@/lib/utils";

type SiteButtonProps = {
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  external?: boolean;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
};

export function SiteButton({
  ariaLabel,
  children,
  className,
  external = false,
  href,
  onClick,
  type = "button"
}: SiteButtonProps) {
  const finalSceneButtonClassName = cn(
    "pointer-events-auto relative z-30 rounded-full px-8 py-4 font-body text-sm font-semibold text-white/90 backdrop-blur-md",
    className
  );

  return (
    <LiquidCtaButton
      ariaLabel={ariaLabel}
      className={finalSceneButtonClassName}
      external={external}
      href={href}
      onClick={onClick}
      size="xl"
      type={type}
    >
      {children}
    </LiquidCtaButton>
  );
}
