import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  Search,
  X,
  TrendingUp,
  Building2,
  GraduationCap,
  FileText,
  Compass,
  Award,
  BookOpen,
  MapPin,
  ArrowRight,
  Sparkles,
  Loader2,
  ChevronRight,
  Layers,
  Newspaper,
  ShieldCheck,
} from "lucide-react";
import { searchApi, SearchSuggestionItem, TrendingContentResponse } from "../../api/search.api";

interface LiquidGlassSearchBarProps {
  initialValue?: string;
  placeholder?: string;
  onSearchSubmit?: (query: string) => void;
  className?: string;
  autoFocus?: boolean;
}

type TabType =
  | "all"
  | "colleges"
  | "courses"
  | "studyMaterials"
  | "guides"
  | "exams"
  | "scholarships"
  | "streams"
  | "blogs"
  | "reports";

export const LiquidGlassSearchBar: React.FC<LiquidGlassSearchBarProps> = ({
  initialValue = "",
  placeholder = "Search colleges, courses, study materials, guides, exams...",
  onSearchSubmit,
  className = "",
  autoFocus = false,
}) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  // Live Suggestions & Trending Data
  const [suggestions, setSuggestions] = useState<{
    all: SearchSuggestionItem[];
    colleges: SearchSuggestionItem[];
    courses: SearchSuggestionItem[];
    studyMaterials: SearchSuggestionItem[];
    guides: SearchSuggestionItem[];
    exams: SearchSuggestionItem[];
    scholarships: SearchSuggestionItem[];
    streams: SearchSuggestionItem[];
    blogs: SearchSuggestionItem[];
    reports: SearchSuggestionItem[];
    locations: SearchSuggestionItem[];
  }>({
    all: [],
    colleges: [],
    courses: [],
    studyMaterials: [],
    guides: [],
    exams: [],
    scholarships: [],
    streams: [],
    blogs: [],
    reports: [],
    locations: [],
  });

  const [trending, setTrending] = useState<TrendingContentResponse | null>(null);

  // Sync initialValue if provided externally
  useEffect(() => {
    if (initialValue !== undefined) {
      setQuery(initialValue);
    }
  }, [initialValue]);

  // Fetch real trending content on mount or focus
  useEffect(() => {
    let isMounted = true;
    searchApi
      .getTrending()
      .then((res) => {
        if (isMounted && res.data) {
          setTrending(res.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load trending search content:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Debounced live suggestions search
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions({
        all: [],
        colleges: [],
        courses: [],
        studyMaterials: [],
        guides: [],
        exams: [],
        scholarships: [],
        streams: [],
        blogs: [],
        reports: [],
        locations: [],
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeoutId = setTimeout(() => {
      searchApi
        .getSuggestions(trimmed)
        .then((res) => {
          if (res.data) {
            setSuggestions({
              all: res.data.all || [],
              colleges: res.data.colleges || [],
              courses: res.data.courses || [],
              studyMaterials: res.data.studyMaterials || [],
              guides: res.data.guides || [],
              exams: res.data.exams || [],
              scholarships: res.data.scholarships || [],
              streams: res.data.streams || [],
              blogs: res.data.blogs || [],
              reports: res.data.reports || [],
              locations: res.data.locations || [],
            });
          }
        })
        .catch((err) => {
          console.error("Failed to fetch suggestions:", err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, 220);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Compute displayed list based on activeTab
  const getDisplayedItems = (): SearchSuggestionItem[] => {
    const trimmed = query.trim();
    const isSearching = trimmed.length >= 2;

    if (isSearching) {
      if (activeTab === "colleges") return suggestions.colleges;
      if (activeTab === "courses") return suggestions.courses;
      if (activeTab === "studyMaterials") return suggestions.studyMaterials;
      if (activeTab === "guides") return suggestions.guides;
      if (activeTab === "exams") return suggestions.exams;
      if (activeTab === "scholarships") return suggestions.scholarships;
      if (activeTab === "streams") return suggestions.streams;
      if (activeTab === "blogs") return suggestions.blogs;
      if (activeTab === "reports") return suggestions.reports;
      return suggestions.all;
    }

    // When empty, show trending items by category
    if (!trending) return [];
    if (activeTab === "colleges") return trending.colleges || [];
    if (activeTab === "courses") return trending.courses || [];
    if (activeTab === "studyMaterials") return trending.studyMaterials || [];
    if (activeTab === "guides") return trending.guides || [];
    if (activeTab === "exams") return trending.exams || [];
    if (activeTab === "scholarships") return trending.scholarships || [];
    if (activeTab === "blogs") return trending.blogs || [];
    if (activeTab === "reports") return trending.reports || [];
    return [
      ...(trending.colleges || []),
      ...(trending.courses || []),
      ...(trending.studyMaterials || []),
      ...(trending.guides || []),
      ...(trending.exams || []),
      ...(trending.scholarships || []),
      ...(trending.blogs || []),
      ...(trending.reports || []),
    ];
  };

  const displayedItems = getDisplayedItems();

  // Reset highlight index when query or tab changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [query, activeTab]);

  // Navigate to result
  const handleSelectItem = (item: SearchSuggestionItem) => {
    setIsOpen(false);
    navigate(item.url);
  };

  // Submit complete search page
  const handleCompleteSearch = (customQuery?: string) => {
    const targetQuery = (customQuery !== undefined ? customQuery : query).trim();
    setIsOpen(false);
    if (inputRef.current) inputRef.current.blur();

    if (onSearchSubmit) {
      onSearchSubmit(targetQuery);
    } else if (targetQuery) {
      navigate(`/search?q=${encodeURIComponent(targetQuery)}`);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < displayedItems.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : displayedItems.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && displayedItems[highlightedIndex]) {
        handleSelectItem(displayedItems[highlightedIndex]);
      } else {
        handleCompleteSearch();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Helper to render type icons
  const renderItemIcon = (type: SearchSuggestionItem["type"]) => {
    switch (type) {
      case "college":
        return <Building2 size={16} className="text-[#4A7B5B] shrink-0" />;
      case "course":
        return <GraduationCap size={16} className="text-emerald-600 shrink-0" />;
      case "study_material":
        return <FileText size={16} className="text-blue-600 shrink-0" />;
      case "guide":
        return <Compass size={16} className="text-amber-600 shrink-0" />;
      case "exam":
        return <Award size={16} className="text-purple-600 shrink-0" />;
      case "scholarship":
        return <BookOpen size={16} className="text-teal-600 shrink-0" />;
      case "stream":
        return <Layers size={16} className="text-indigo-600 shrink-0" />;
      case "blog":
        return <Newspaper size={16} className="text-rose-600 shrink-0" />;
      case "report":
        return <ShieldCheck size={16} className="text-[#4A7B5B] shrink-0" />;
      case "location":
        return <MapPin size={16} className="text-rose-500 shrink-0" />;
      default:
        return <Search size={16} className="text-gray-400 shrink-0" />;
    }
  };

  // Text highlight matching helper
  const renderHighlightedText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark
              key={i}
              className="bg-[#4A7B5B]/15 text-[#4A7B5B] font-semibold px-0.5 rounded"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "colleges", label: "Colleges" },
    { key: "courses", label: "Courses" },
    { key: "studyMaterials", label: "Materials" },
    { key: "guides", label: "Guides" },
    { key: "exams", label: "Exams" },
    { key: "scholarships", label: "Scholarships" },
    { key: "streams", label: "Streams" },
    { key: "blogs", label: "Blogs" },
    { key: "reports", label: "Reports" },
  ];

  return (
    <div
      ref={containerRef}
      className={`relative w-full z-50 transition-all duration-300 ${className}`}
    >
      {/* ── LIQUID GLASS SEARCH BAR ── */}
      <div
        className={`group relative flex items-center gap-2.5 px-3.5 py-2.5 sm:px-4 sm:py-3 transition-all duration-300 rounded-2xl sm:rounded-3xl border ${
          isOpen
            ? "bg-white/95 border-[#4A7B5B]/50 shadow-[0_12px_36px_rgba(74,123,91,0.18)] ring-4 ring-[#4A7B5B]/10"
            : "bg-white/80 hover:bg-white/90 border-white/80 hover:border-[#4A7B5B]/30 shadow-[0_8px_30px_rgba(74,123,91,0.08)] hover:shadow-[0_12px_36px_rgba(74,123,91,0.13)]"
        } backdrop-blur-xl`}
      >
        {/* Search Icon or Loading Spinner */}
        <div className="flex items-center justify-center shrink-0 pl-1">
          {isLoading ? (
            <Loader2 size={19} className="text-[#4A7B5B] animate-spin" />
          ) : (
            <Search
              size={19}
              className={`transition-colors duration-200 ${
                isOpen ? "text-[#4A7B5B]" : "text-gray-400 group-hover:text-[#4A7B5B]"
              }`}
            />
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none text-sm sm:text-base text-gray-800 placeholder:text-gray-400 font-medium tracking-wide min-w-0"
        />

        {/* Clear Button */}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              if (inputRef.current) inputRef.current.focus();
            }}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
            aria-label="Clear search input"
          >
            <X size={16} />
          </button>
        )}

        {/* Search CTA Button */}
        <button
          type="button"
          onClick={() => handleCompleteSearch()}
          className="px-4 py-2 sm:px-6 sm:py-2.5 bg-[#4A7B5B] hover:bg-[#3d6b4d] active:scale-95 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold shadow-md shadow-[#4A7B5B]/20 transition-all duration-200 shrink-0 flex items-center gap-1.5"
        >
          <span>Search</span>
          <ArrowRight size={14} className="hidden sm:inline" />
        </button>
      </div>

      {/* ── LIQUID GLASS DROPDOWN SUGGESTIONS (z-[100] ensuring floating on top) ── */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2.5 bg-white/95 backdrop-blur-2xl border border-white/90 rounded-2xl sm:rounded-3xl shadow-[0_22px_60px_rgba(15,23,42,0.22)] overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 border-b border-gray-100/80 overflow-x-auto no-scrollbar bg-gray-50/50">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                  activeTab === tab.key
                    ? "bg-[#4A7B5B] text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-800 hover:bg-white/80"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="max-h-[62vh] sm:max-h-[460px] overflow-y-auto divide-y divide-gray-50 p-2 sm:p-2.5">
            {/* VIEW A: TRENDING CONTENT (When Query is empty / short) */}
            {query.trim().length < 2 && (
              <div className="space-y-4 p-1">
                {/* Real Trending Searches Chips */}
                {trending?.searches && trending.searches.length > 0 && activeTab === "all" && (
                  <div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#4A7B5B]">
                      <TrendingUp size={13} />
                      <span>Trending Searches</span>
                    </div>
                    <div className="flex flex-wrap gap-2 px-2 pt-1 pb-2">
                      {trending.searches.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setQuery(s.text);
                            handleCompleteSearch(s.text);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 hover:bg-[#4A7B5B]/10 border border-gray-200/80 hover:border-[#4A7B5B]/30 text-xs font-medium text-gray-700 hover:text-[#4A7B5B] transition-all shadow-sm"
                        >
                          <Search size={12} className="text-gray-400" />
                          <span>{s.text}</span>
                          {typeof s.count === "number" && s.count > 1 && (
                            <span className="text-[10px] text-gray-400 font-normal">
                              ({s.count})
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Real Trending Streams */}
                {trending?.streams && trending.streams.length > 0 && (activeTab === "all" || activeTab === "streams") && (
                  <div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                      <Sparkles size={13} />
                      <span>Popular Streams</span>
                    </div>
                    <div className="flex flex-wrap gap-2 px-2 pt-1 pb-2">
                      {trending.streams.map((stream, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setQuery(stream);
                            handleCompleteSearch(stream);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-100 text-xs font-semibold text-emerald-800 transition-all shadow-sm"
                        >
                          <GraduationCap size={12} className="text-emerald-600" />
                          <span>{stream}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trending Items List */}
                {displayedItems.length > 0 && activeTab !== "streams" && (
                  <div>
                    <div className="flex items-center justify-between px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                      <span>
                        {activeTab === "all" ? "Trending Across Platform" : `Trending ${activeTab}`}
                      </span>
                      <span className="text-[10px] font-normal lowercase text-gray-400">Live</span>
                    </div>
                    <div className="space-y-1">
                      {displayedItems.slice(0, 8).map((item, idx) => (
                        <div
                          key={item.id || idx}
                          onClick={() => handleSelectItem(item)}
                          className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                            highlightedIndex === idx
                              ? "bg-[#4A7B5B]/10 border border-[#4A7B5B]/30 text-[#4A7B5B]"
                              : "hover:bg-gray-100/70 text-gray-700"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                              {renderItemIcon(item.type)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-800 truncate">
                                {item.title}
                              </div>
                              {item.subtitle && (
                                <div className="text-xs text-gray-500 truncate">
                                  {item.subtitle}
                                </div>
                              )}
                            </div>
                          </div>
                          {item.badge && (
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-[11px] font-semibold text-gray-600 shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIEW B: LIVE SEARCH SUGGESTIONS */}
            {query.trim().length >= 2 && (
              <div>
                {displayedItems.length > 0 ? (
                  <div className="space-y-1">
                    {displayedItems.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        onClick={() => handleSelectItem(item)}
                        className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                          highlightedIndex === idx
                            ? "bg-[#4A7B5B]/10 border border-[#4A7B5B]/30"
                            : "hover:bg-gray-100/70"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-gray-100/80 flex items-center justify-center shrink-0">
                            {renderItemIcon(item.type)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-800 truncate">
                              {renderHighlightedText(item.title, query)}
                            </div>
                            {item.subtitle && (
                              <div className="text-xs text-gray-500 truncate">
                                {renderHighlightedText(item.subtitle, query)}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.badge && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-[11px] font-semibold text-[#4A7B5B]">
                              {item.badge}
                            </span>
                          )}
                          <ChevronRight size={14} className="text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Search size={28} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm font-medium text-gray-600">
                      No live suggestions for &ldquo;{query}&rdquo;
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono text-[10px]">Enter</kbd> to run a full database search
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Bar: Google-style "Press Enter to view all results" */}
          <div className="p-2.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <button
              type="button"
              onClick={() => handleCompleteSearch()}
              className="flex items-center gap-1.5 font-semibold text-[#4A7B5B] hover:underline"
            >
              <span>View complete search results for &ldquo;{query || "everything"}&rdquo;</span>
              <ArrowRight size={13} />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-gray-400">
              <span>Use <kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-[10px]">↑</kbd> <kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-[10px]">↓</kbd> to navigate</span>
              <span><kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px]">Esc</kbd> to exit</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
