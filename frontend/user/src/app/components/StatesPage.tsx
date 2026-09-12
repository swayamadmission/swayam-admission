import React, { useState } from "react";
import { Link } from "react-router";
import { Search, MapPin, GraduationCap, Users, ArrowRight, ChevronRight, TrendingUp, Building2 } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export interface StateInfo {
  slug: string;
  name: string;
  emoji: string;
  region: string;
  colleges: number;
  students: string;
  topCourse: string;
  scholarships: number;
  govtColleges: number;
  privateColleges: number;
  img: string;
  popularCities: string[];
  featured: boolean;
  color: string;
  description: string;
}

export const ALL_STATES: StateInfo[] = [
  {
    slug: "uttar-pradesh",
    name: "Uttar Pradesh",
    emoji: "🕌",
    region: "North India",
    colleges: 258,
    students: "18L+",
    topCourse: "B.Tech",
    scholarships: 12,
    govtColleges: 80,
    privateColleges: 178,
    img: "https://images.unsplash.com/photo-1759562588736-186cce2c26b5?w=400&q=80",
    popularCities: ["Lucknow", "Noida", "Agra", "Kanpur", "Varanasi"],
    featured: true,
    color: "#8B5CF6",
    description: "Largest state by population with the highest number of colleges. UP has strong engineering, management, and medical education ecosystem.",
  },
  {
    slug: "bihar",
    name: "Bihar",
    emoji: "🏛️",
    region: "East India",
    colleges: 145,
    students: "12L+",
    topCourse: "B.Tech / BCA",
    scholarships: 15,
    govtColleges: 55,
    privateColleges: 90,
    img: "https://images.unsplash.com/photo-1770967004881-5e8795cb5fde?w=400&q=80",
    popularCities: ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur"],
    featured: true,
    color: "#F59E0B",
    description: "Bihar is a major education hub for North-East India with excellent scholarship schemes including Student Credit Card for higher education.",
  },
  {
    slug: "delhi-ncr",
    name: "Delhi NCR",
    emoji: "🏙️",
    region: "North India",
    colleges: 168,
    students: "14L+",
    topCourse: "MBA / Law",
    scholarships: 8,
    govtColleges: 75,
    privateColleges: 93,
    img: "https://images.unsplash.com/photo-1680084521816-cc1ad0433ceb?w=400&q=80",
    popularCities: ["Delhi", "Noida", "Gurugram", "Faridabad", "Ghaziabad"],
    featured: true,
    color: "#EF4444",
    description: "India's capital region houses some of the most prestigious universities — DU, JNU, IIT Delhi, AIIMS, NLUD. Premium placements and global exposure.",
  },
  {
    slug: "punjab",
    name: "Punjab",
    emoji: "🌿",
    region: "North India",
    colleges: 115,
    students: "8L+",
    topCourse: "B.Tech / Nursing",
    scholarships: 9,
    govtColleges: 35,
    privateColleges: 80,
    img: "https://images.unsplash.com/photo-1777654770487-b49bb24f61ec?w=400&q=80",
    popularCities: ["Chandigarh", "Ludhiana", "Amritsar", "Jalandhar", "Phagwara"],
    featured: true,
    color: "#10B981",
    description: "Punjab is home to Chandigarh University and LPU — two of India's most popular private universities with excellent placement records.",
  },
  {
    slug: "haryana",
    name: "Haryana",
    emoji: "🌾",
    region: "North India",
    colleges: 98,
    students: "7L+",
    topCourse: "B.Tech / MBA",
    scholarships: 7,
    govtColleges: 30,
    privateColleges: 68,
    img: "https://images.unsplash.com/photo-1663845444742-17a059b56b3a?w=400&q=80",
    popularCities: ["Gurugram", "Faridabad", "Kurukshetra", "Rohtak", "Hisar"],
    featured: false,
    color: "#3B82F6",
    description: "Haryana has strong engineering and management colleges. Kurukshetra University and Manav Rachna are key institutions. Close to Delhi NCR.",
  },
  {
    slug: "rajasthan",
    name: "Rajasthan",
    emoji: "🏜️",
    region: "West India",
    colleges: 132,
    students: "9L+",
    topCourse: "B.Tech / B.Pharm",
    scholarships: 10,
    govtColleges: 42,
    privateColleges: 90,
    img: "https://images.unsplash.com/photo-1758292109543-a5c7f0c4cb9b?w=400&q=80",
    popularCities: ["Jaipur", "Kota", "Udaipur", "Jodhpur", "Ajmer"],
    featured: true,
    color: "#F97316",
    description: "Kota is India's coaching capital. Rajasthan has strong pharmacy, engineering, and agriculture education. Many affordable state colleges.",
  },
  {
    slug: "madhya-pradesh",
    name: "Madhya Pradesh",
    emoji: "🌳",
    region: "Central India",
    colleges: 118,
    students: "8L+",
    topCourse: "B.Tech / B.Sc",
    scholarships: 11,
    govtColleges: 48,
    privateColleges: 70,
    img: "https://images.unsplash.com/photo-1680084521631-e4e6d77704d8?w=400&q=80",
    popularCities: ["Bhopal", "Indore", "Gwalior", "Jabalpur"],
    featured: false,
    color: "#14B8A6",
    description: "MP has strong technical education through RGPV. IIT Indore and IIM Indore add to its premium education ecosystem. Affordable fees.",
  },
  {
    slug: "maharashtra",
    name: "Maharashtra",
    emoji: "🌊",
    region: "West India",
    colleges: 312,
    students: "22L+",
    topCourse: "Engineering / MBA",
    scholarships: 14,
    govtColleges: 95,
    privateColleges: 217,
    img: "https://images.unsplash.com/photo-1592542306951-17d42a2d0d1b?w=400&q=80",
    popularCities: ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad"],
    featured: false,
    color: "#6366F1",
    description: "Maharashtra leads India in number of engineering and MBA colleges. Pune is the 'Oxford of the East' and Mumbai has top law and management schools.",
  },
  {
    slug: "jharkhand",
    name: "Jharkhand",
    emoji: "⛏️",
    region: "East India",
    colleges: 68,
    students: "4L+",
    topCourse: "Mining / B.Tech",
    scholarships: 8,
    govtColleges: 25,
    privateColleges: 43,
    img: "https://images.unsplash.com/photo-1770226698529-a9c8726949c6?w=400&q=80",
    popularCities: ["Ranchi", "Dhanbad", "Jamshedpur", "Bokaro"],
    featured: false,
    color: "#EC4899",
    description: "Jharkhand is known for mining and metallurgy programs. ISM Dhanbad (IIT ISM) is a premier institute. Good scholarship coverage for SC/ST students.",
  },
  {
    slug: "uttarakhand",
    name: "Uttarakhand",
    emoji: "🏔️",
    region: "North India",
    colleges: 62,
    students: "3.5L+",
    topCourse: "B.Tech / Hotel Mgmt",
    scholarships: 6,
    govtColleges: 22,
    privateColleges: 40,
    img: "https://images.unsplash.com/photo-1771190529606-41c36b101641?w=400&q=80",
    popularCities: ["Dehradun", "Haridwar", "Roorkee", "Haldwani"],
    featured: false,
    color: "#0EA5E9",
    description: "IIT Roorkee (Asia's oldest technical university) and Graphic Era University are key institutions. Great for hotel management and agriculture too.",
  },
];

const REGIONS = ["All Regions", "North India", "East India", "West India", "Central India", "South India"];

export default function StatesPage() {
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("All Regions");

  const featured = ALL_STATES.filter(s => s.featured);
  const filtered = ALL_STATES.filter(s =>
    (region === "All Regions" || s.region === region) &&
    (search === "" || s.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ backgroundColor: "#F8FAFC" }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <nav className="flex items-center gap-2 mb-4" style={{ fontSize: "12px", color: "#94a3b8" }}>
            <Link to="/" className="hover:text-[#4A7B5B] transition-colors">Home</Link>
            <ChevronRight size={12} />
            <span style={{ color: "#0F172A", fontWeight: 600 }}>States</span>
          </nav>
          <div className="mb-2" style={{ fontSize: "12px", fontWeight: 600, color: "#4A7B5B" }}>Browse by Location</div>
          <h1 className="mb-2" style={{ fontWeight: 800, color: "#0F172A", fontSize: "clamp(24px,4vw,36px)" }}>Colleges by State</h1>
          <p style={{ fontSize: "14px", color: "#64748b" }}>Explore 500+ colleges across 15+ Indian states with scholarships, fees and admission details</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { Icon: MapPin, value: "15+", label: "States Covered" },
            { Icon: GraduationCap, value: "500+", label: "Verified Colleges" },
            { Icon: Users, value: "50L+", label: "Students Enrolled" },
            { Icon: TrendingUp, value: "100+", label: "Scholarships" },
          ].map(({ Icon, value, label }) => (
            <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-[#E8F3EC] rounded-xl flex items-center justify-center shrink-0">
                <Icon size={18} className="text-[#4A7B5B]" />
              </div>
              <div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#0F172A" }}>{value}</div>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Featured states banner */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>Featured States</h2>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>Highest student enquiries</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map(state => (
              <Link key={state.slug} to={`/states/${state.slug}`}
                className="group relative overflow-hidden rounded-2xl h-40 block">
                <ImageWithFallback src={state.img} alt={state.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute inset-0 p-4 flex flex-col justify-end">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{state.emoji}</span>
                    <h3 className="text-white" style={{ fontSize: "18px", fontWeight: 800 }}>{state.name}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white/80" style={{ fontSize: "11px" }}>{state.colleges} Colleges</span>
                    <span className="text-white/80" style={{ fontSize: "11px" }}>•</span>
                    <span className="text-white/80" style={{ fontSize: "11px" }}>{state.scholarships} Scholarships</span>
                  </div>
                </div>
                <div className="absolute top-3 right-3 px-2.5 py-1 bg-white/90 rounded-full" style={{ fontSize: "10px", fontWeight: 600, color: state.color }}>
                  {state.region}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3">
            <Search size={16} className="text-gray-400 shrink-0" />
            <input type="text" placeholder="Search states..." value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder:text-gray-400" />
          </div>
          <select value={region} onChange={e => setRegion(e.target.value)}
            className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-[#4A7B5B]">
            {REGIONS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>

        {/* All states grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {filtered.map(state => (
            <Link key={state.slug} to={`/states/${state.slug}`}
              className="group bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-[#4A7B5B]/20 transition-all text-center">
              <div className="text-3xl mb-2">{state.emoji}</div>
              <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>{state.name}</h3>
              <p style={{ fontSize: "11px", color: "#94a3b8" }} className="mb-2">{state.colleges} Colleges</p>
              <div className="flex items-center justify-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: state.color }} />
                <span style={{ fontSize: "10px", color: state.color, fontWeight: 600 }}>{state.topCourse}</span>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <MapPin size={44} className="text-gray-300 mx-auto mb-3" />
            <p style={{ fontSize: "16px", color: "#94a3b8" }}>No states found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
