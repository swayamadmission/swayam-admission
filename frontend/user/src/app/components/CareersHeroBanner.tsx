import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router";
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Briefcase,
} from "lucide-react";
import { bannersApi, BannerItem } from "../../api/banners.api";
import { RecruitmentPublicSettings } from "../../api/careers.api";

interface CareersHeroBannerProps {
  settings?: RecruitmentPublicSettings | null;
}

export default function CareersHeroBanner({ settings }: CareersHeroBannerProps) {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failedBanners, setFailedBanners] = useState<Record<string, boolean>>({});

  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  useEffect(() => {
    let isMounted = true;
    bannersApi
      .getPublic("CAREERS_PAGE_TOP")
      .then((res) => {
        if (isMounted) {
          if (Array.isArray(res.data) && res.data.length > 0) {
            setBanners(res.data);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeBanners = banners.filter((b) => !failedBanners[b.id]);

  const nextSlide = useCallback(() => {
    if (activeBanners.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  }, [activeBanners.length]);

  const prevSlide = useCallback(() => {
    if (activeBanners.length <= 1) return;
    setCurrentIndex(
      (prev) => (prev - 1 + activeBanners.length) % activeBanners.length,
    );
  }, [activeBanners.length]);

  useEffect(() => {
    if (activeBanners.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 5500);
    return () => clearInterval(timer);
  }, [activeBanners.length, isPaused, nextSlide]);

  const handleMediaError = (bannerId: string) => {
    setFailedBanners((prev) => ({ ...prev, [bannerId]: true }));
    if (currentIndex >= activeBanners.length - 1) {
      setCurrentIndex(0);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) nextSlide();
    if (distance < -50) prevSlide();
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const defaultHeroTitle =
    settings?.heroTitle || "Join Swayam Admission";
  const defaultHeroSubtitle =
    settings?.heroSubtitle ||
    "Discover opportunities to build a rewarding career with us and help shape the future of education across India.";

  // If banners are active in DB slot CAREERS_PAGE_TOP
  if (!loading && activeBanners.length > 0) {
    const currentBanner = activeBanners[currentIndex] || activeBanners[0];

    return (
      <div
        className="relative w-full overflow-hidden bg-slate-900 group select-none shadow-md"
        style={{
          aspectRatio: "32/9",
          minHeight: "220px",
          maxHeight: "450px",
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background Media */}
        <div className="absolute inset-0 w-full h-full">
          {currentBanner.mediaType === "VIDEO" && currentBanner.videoUrl ? (
            <video
              key={`vid-${currentBanner.id}`}
              src={currentBanner.videoUrl}
              className="w-full h-full object-cover object-center"
              autoPlay
              muted
              loop
              playsInline
              onError={() => handleMediaError(currentBanner.id)}
            />
          ) : currentBanner.imageUrl ? (
            <img
              key={`img-${currentBanner.id}`}
              src={currentBanner.imageUrl}
              alt={currentBanner.title || "Swayam Admission Careers Banner"}
              className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.01]"
              loading="eager"
              onError={() => handleMediaError(currentBanner.id)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-[#2A5239] via-[#3D664A] to-[#1E3B29]" />
          )}
        </div>

        {/* Overlay Content */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/50 to-transparent flex items-center px-6 sm:px-12 md:px-16 lg:px-20 text-white z-10">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-[#F0AE1A] border border-white/20">
              <Briefcase className="w-3.5 h-3.5" />
              <span>We're Hiring</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight drop-shadow-md">
              {currentBanner.title || defaultHeroTitle}
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-slate-200 leading-relaxed drop-shadow line-clamp-3">
              {currentBanner.subtitle || defaultHeroSubtitle}
            </p>

            {currentBanner.buttonText && currentBanner.buttonUrl && (
              <div className="pt-2">
                {currentBanner.buttonUrl.startsWith("/") ? (
                  <Link
                    to={currentBanner.buttonUrl}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F0AE1A] hover:bg-[#d89b14] text-slate-950 font-bold rounded-xl shadow-lg transition-transform hover:scale-105"
                  >
                    <span>{currentBanner.buttonText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <a
                    href={currentBanner.buttonUrl}
                    target={currentBanner.openInNewTab ? "_blank" : "_self"}
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F0AE1A] hover:bg-[#d89b14] text-slate-950 font-bold rounded-xl shadow-lg transition-transform hover:scale-105"
                  >
                    <span>{currentBanner.buttonText}</span>
                    {currentBanner.openInNewTab ? (
                      <ExternalLink className="w-4 h-4" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Carousel Controls (if multiple active banners) */}
        {activeBanners.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              aria-label="Previous Banner"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-slate-950/60 hover:bg-slate-950/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm z-20 border border-white/20"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button
              onClick={nextSlide}
              aria-label="Next Banner"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-slate-950/60 hover:bg-slate-950/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm z-20 border border-white/20"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
              {activeBanners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === currentIndex
                      ? "w-7 bg-[#F0AE1A]"
                      : "w-2 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Fallback Branded Swayam Admission Hero Banner (1600x450 ratio, perfectly styled)
  return (
    <div
      className="relative w-full overflow-hidden bg-gradient-to-r from-[#244330] via-[#355A42] to-[#1E3B29] text-white flex items-center justify-center shadow-sm"
      style={{
        aspectRatio: "32/9",
        minHeight: "220px",
        maxHeight: "450px",
      }}
    >
      {/* Subtle geometric pattern overlay */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8 sm:py-12 text-center space-y-3 sm:space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-[#F0AE1A] border border-white/20 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-[#F0AE1A]" />
          <span>Careers at Swayam Admission</span>
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
          {defaultHeroTitle}
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-slate-100 max-w-2xl mx-auto leading-relaxed">
          {defaultHeroSubtitle}
        </p>
      </div>
    </div>
  );
}
