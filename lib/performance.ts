"use client";

type NavigatorWithMemory = Navigator & {
  deviceMemory?: number;
};

export function isMobilePerformanceDevice() {
  if (typeof window === "undefined") {
    return false;
  }

  const nav = navigator as NavigatorWithMemory;
  const isMobileWidth = window.innerWidth < 768;
  const lowMemory =
    "deviceMemory" in nav &&
    typeof nav.deviceMemory === "number" &&
    nav.deviceMemory <= 4;
  const lowCpu =
    "hardwareConcurrency" in navigator &&
    navigator.hardwareConcurrency <= 4;

  return isMobileWidth || lowMemory || lowCpu;
}
