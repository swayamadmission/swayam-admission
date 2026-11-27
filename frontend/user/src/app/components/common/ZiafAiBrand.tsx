import React from "react";

export const ZIAF_GRADIENT =
  "linear-gradient(135deg, #43B5F5 0%, #08BD53 36%, #903C5A 72%, #F8CF98 100%)";

export const ZIAF_SURFACE_WASH =
  "linear-gradient(180deg, #FFFFFF 58%, rgba(67, 181, 245, 0.08) 80%, rgba(8, 189, 83, 0.06) 91%, rgba(248, 207, 152, 0.14) 100%)";

export function ZiafAiLogo({
  size = "sm",
  variant = "gradient",
}: {
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "gradient" | "outline";
}) {
  const outerBox =
    size === "lg"
      ? "w-14 h-14 rounded-2xl"
      : size === "md"
      ? "w-9 h-9 rounded-xl"
      : size === "sm"
      ? "w-7 h-7 rounded-lg"
      : "w-5 h-5 rounded-md";

  const innerBox =
    size === "lg"
      ? "w-8 h-8 text-sm rounded-md border-2"
      : size === "md"
      ? "w-5 h-5 text-[10px] rounded-[4px] border-[1.5px]"
      : size === "sm"
      ? "w-4 h-4 text-[8px] rounded-[3px] border-[1.5px]"
      : "w-3.5 h-3.5 text-[7px] rounded-[2px] border";

  return (
    <span
      style={
        variant === "gradient"
          ? { background: ZIAF_GRADIENT }
          : { background: "rgba(255, 255, 255, 0.18)" }
      }
      className={`${outerBox} inline-flex items-center justify-center shrink-0 text-white shadow-xs`}
    >
      <span
        className={`${innerBox} border-white/95 font-black tracking-tight inline-flex items-center justify-center leading-none`}
      >
        AI
      </span>
    </span>
  );
}
