"use client";

import { useEffect, useRef, useState } from "react";

export function useInViewport<T extends HTMLElement>(
  options?: IntersectionObserverInit
) {
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);
  const root = options?.root ?? null;
  const rootMargin = options?.rootMargin ?? "150px";
  const threshold = options?.threshold ?? 0.01;

  useEffect(() => {
    const node = ref.current;

    if (!node || typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { root, rootMargin, threshold }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [root, rootMargin, threshold]);

  return { ref, isInView };
}
