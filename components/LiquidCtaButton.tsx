"use client";

import { type ReactNode } from "react";
import { LiquidButton } from "@/components/liquid-glass-button";

type LiquidCtaButtonProps = {
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  external?: boolean;
  href?: string;
  onClick?: () => void;
  size?: "default" | "sm" | "lg" | "xl" | "xxl" | "icon";
  type?: "button" | "submit";
};

export function LiquidCtaButton({
  ariaLabel,
  children,
  className,
  external = false,
  href,
  onClick,
  size = "xl",
  type = "button"
}: LiquidCtaButtonProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }

    if (!href) {
      return;
    }

    if (href.startsWith("#")) {
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (external) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    window.location.href = href;
  };

  return (
    <LiquidButton
      aria-label={ariaLabel}
      className={className}
      onClick={handleClick}
      size={size}
      type={type}
    >
      {children}
    </LiquidButton>
  );
}
