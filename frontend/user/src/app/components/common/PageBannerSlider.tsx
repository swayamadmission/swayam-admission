import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router";
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ExternalLink,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react";
import { bannersApi, BannerItem } from "../../../api/banners.api";

interface PageBannerSliderProps {
  slot: string;
  variant?: "normal" | "wide";
  fullWidth?: boolean;
  className?: string;
  containerClassName?: string;
  autoSlideInterval?: number;
}

export default function PageBannerSlider({
  slot,
  variant = "normal",
  fullWidth = true,
  className = "",
  containerClassName = "",
  autoSlideInterval = 5000,
}: PageBannerSliderProps) {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failedBanners, setFailedBanners] = useState<Record<string, boolean>>({});

  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  // Fetch banners for this slot
  useEffect(() => {
    let isMounted = true;
    bannersApi
      .getPublic(slot)
      .then((res) => {
        if (isMounted) {
          if (Array.isArray(res.data)) {
            setBanners(res.data);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [slot]);

  // Valid banners excluding permanently broken ones
  const activeBanners = banners.filter((b) => !failedBanners[b.id]);

  const nextSlide = useCallback(() => {
    if (activeBanners.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  }, [activeBanners.length]);

  const prevSlide = useCallback(() => {
    if (activeBanners.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  }, [activeBanners.length]);

  // Auto-slide effect (every 5 seconds)
  useEffect(() => {
    if (activeBanners.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      nextSlide();
    }, autoSlideInterval);

    return () => clearInterval(timer);
  }, [activeBanners.length, isPaused, autoSlideInterval, nextSlide]);

  // Handle broken image or video URL safely
  const handleMediaError = (bannerId: string) => {
    setFailedBanners((prev) => ({ ...prev, [bannerId]: true }));
    if (currentIndex >= activeBanners.length - 1) {
      setCurrentIndex(0);
    }
  };

  // Touch Swipe Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
  };

  // If no banners exist or still loading: render nothing (existing page UI normally show ho)
  if (loading || activeBanners.length === 0) {
    return null;
  }

  // Safe current banner
  const currentBanner = activeBanners[currentIndex % activeBanners.length];
  if (!currentBanner) return null;

  return (
    <div className={`w-full overflow-hidden ${containerClassName}`}>
      <div
        className={`relative w-full overflow-hidden shadow-xs bg-slate-900 group ${
          fullWidth ? "rounded-none" : "rounded-xl"
        } ${className}`}
        style={{
          // Standard banner size exactly 1440 × 70 px
          width: "100%",
          height: "70px",
          minHeight: "70px",
          maxHeight: "70px",
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Banner Media Item */}
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          {currentBanner.mediaType === "VIDEO" && currentBanner.videoUrl ? (
            <video
              ref={(el) => {
                videoRefs.current[currentBanner.id] = el;
              }}
              key={`vid-${currentBanner.id}`}
              src={currentBanner.videoUrl}
              className="w-full h-full object-cover object-center"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              onError={() => handleMediaError(currentBanner.id)}
            />
          ) : currentBanner.imageUrl ? (
            <img
              key={`img-${currentBanner.id}`}
              src={currentBanner.imageUrl}
              alt={currentBanner.title || "Swayam Admission Banner"}
              className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.01]"
              loading={currentIndex === 0 ? "eager" : "lazy"}
              onError={() => handleMediaError(currentBanner.id)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-[#4A7B5B] via-[#355A42] to-[#253F2F]" />
          )}
        </div>

        {/* Content Overlay — Single horizontal row within 70px height */}
        {(currentBanner.title ||
          currentBanner.subtitle ||
          currentBanner.buttonText) && (
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/50 to-transparent sm:from-slate-950/80 sm:via-slate-950/30 sm:to-transparent flex items-center justify-between px-3 sm:px-6 md:px-10 lg:px-14 text-white z-10 pointer-events-none">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2 pointer-events-auto">
              {currentBanner.title && (
                <span className="text-xs sm:text-sm md:text-base font-extrabold text-white tracking-tight truncate drop-shadow-md">
                  {currentBanner.title}
                </span>
              )}

              {currentBanner.subtitle && (
                <>
                  <span className="hidden sm:inline text-white/35 font-light">|</span>
                  <span className="hidden sm:inline text-[11px] sm:text-xs md:text-sm text-slate-100 truncate drop-shadow max-w-sm md:max-w-md lg:max-w-xl">
                    {currentBanner.subtitle}
                  </span>
                </>
              )}
            </div>

            {currentBanner.buttonText && currentBanner.buttonUrl && (
              <div className="shrink-0 pointer-events-auto">
                {currentBanner.buttonUrl.startsWith("/") ? (
                  <Link
                    to={currentBanner.buttonUrl}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#F0AE1A] hover:bg-[#dba019] text-slate-950 text-[11px] sm:text-xs font-bold rounded-lg shadow-md transition-transform hover:scale-105"
                  >
                    <span>{currentBanner.buttonText}</span>
                    <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </Link>
                ) : (
                  <a
                    href={currentBanner.buttonUrl}
                    target={currentBanner.openInNewTab ? "_blank" : "_self"}
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#F0AE1A] hover:bg-[#dba019] text-slate-950 text-[11px] sm:text-xs font-bold rounded-lg shadow-md transition-transform hover:scale-105"
                  >
                    <span>{currentBanner.buttonText}</span>
                    {currentBanner.openInNewTab ? (
                      <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    ) : (
                      <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    )}
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Previous / Next Arrows (Shown only if 2+ banners) */}
        {activeBanners.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              aria-label="Previous Slide"
              className="absolute left-1.5 sm:left-3 top-1/2 -translate-y-1/2 z-20 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-950/50 hover:bg-slate-950/80 backdrop-blur text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={nextSlide}
              aria-label="Next Slide"
              className="absolute right-1.5 sm:right-3 top-1/2 -translate-y-1/2 z-20 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-950/50 hover:bg-slate-950/80 backdrop-blur text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Dots / Indicators */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-slate-950/40 backdrop-blur px-2 py-0.5 rounded-full">
              {activeBanners.map((b, idx) => (
                <button
                  key={b.id}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`transition-all rounded-full ${
                    idx === currentIndex % activeBanners.length
                      ? "w-3 sm:w-4 h-1 bg-[#F0AE1A]"
                      : "w-1 h-1 bg-white/60 hover:bg-white"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export { PageBannerSlider };
