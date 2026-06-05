"use client";

import { useEffect, useRef, useState } from "react";

export function useInViewport<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);

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
      { rootMargin: "200px", threshold: 0.01 }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return { ref, isInView };
}
