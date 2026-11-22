"use client";

import React from "react";
import { useLanguage } from "@/context/language-context";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  className?: string;
  size?: "sm" | "md";
}

export function LanguageToggle({ className, size = "md" }: LanguageToggleProps) {
  const { language, setLanguage, t } = useLanguage();

  const isSmall = size === "sm";

  return (
    <div
      className={cn(
        "inline-flex items-center p-0.5 rounded-full bg-[#FCF5F8] border border-[#EEDFE5] shadow-[0_1px_4px_rgba(56,38,46,0.04)] select-none shrink-0 transition-all",
        className
      )}
      role="group"
      aria-label={t.languageToggleLabel}
    >
      <button
        type="button"
        onClick={() => setLanguage("en")}
        aria-pressed={language === "en"}
        className={cn(
          "font-semibold rounded-full transition-all cursor-pointer leading-none text-center",
          isSmall ? "px-2 py-1 text-[10.5px]" : "px-2.5 py-1 text-[11.5px]",
          language === "en"
            ? "bg-[#B73D67] text-white shadow-xs"
            : "text-[#7A6870] hover:text-[#38262E]"
        )}
      >
        {t.langEn}
      </button>
      <button
        type="button"
        onClick={() => setLanguage("my")}
        aria-pressed={language === "my"}
        className={cn(
          "font-semibold rounded-full transition-all cursor-pointer leading-none text-center",
          isSmall ? "px-2 py-1 text-[10.5px]" : "px-2.5 py-1 text-[11.5px]",
          language === "my"
            ? "bg-[#B73D67] text-white shadow-xs"
            : "text-[#7A6870] hover:text-[#38262E]"
        )}
      >
        {t.langMy}
      </button>
    </div>
  );
}

export default LanguageToggle;
