"use client";

import {
  Coffee,
  Home,
  Menu as MenuIcon,
  MessageCircle,
  ShoppingBag,
  X
} from "lucide-react";
import { MenuContainer, MenuItem } from "@/components/ui/fluid-menu";

function scrollToSection(id: string) {
  document.querySelector(id)?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

export function FluidNav() {
  return (
    <div className="fixed right-4 top-4 z-[100] md:right-8 md:top-8">
      <MenuContainer>
        <MenuItem
          icon={
            <div className="relative h-6 w-6 text-white/90">
              <div className="absolute inset-0 origin-center scale-100 rotate-0 opacity-100 transition-all duration-300 ease-in-out [div[data-expanded=true]_&]:scale-0 [div[data-expanded=true]_&]:rotate-180 [div[data-expanded=true]_&]:opacity-0">
                <MenuIcon size={24} strokeWidth={1.6} />
              </div>

              <div className="absolute inset-0 origin-center scale-0 -rotate-180 opacity-0 transition-all duration-300 ease-in-out [div[data-expanded=true]_&]:scale-100 [div[data-expanded=true]_&]:rotate-0 [div[data-expanded=true]_&]:opacity-100">
                <X size={24} strokeWidth={1.6} />
              </div>
            </div>
          }
        />

        <MenuItem
          icon={<Home className="text-white/85" size={23} strokeWidth={1.5} />}
          onClick={() => scrollToSection("#hero")}
        />

        <MenuItem
          icon={
            <Coffee className="text-white/85" size={23} strokeWidth={1.5} />
          }
          onClick={() => scrollToSection("#experience")}
        />

        <MenuItem
          icon={
            <ShoppingBag
              className="text-white/85"
              size={23}
              strokeWidth={1.5}
            />
          }
          onClick={() => scrollToSection("#finish")}
        />

        <MenuItem
          icon={
            <MessageCircle
              className="text-white/85"
              size={23}
              strokeWidth={1.5}
            />
          }
          onClick={() => scrollToSection("#finish")}
        />
      </MenuContainer>
    </div>
  );
}
