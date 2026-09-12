import { LayoutDashboard, Users, BarChart3, Building2, Settings } from "lucide-react";

interface MobileBottomNavProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const navItems = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard },
  { id: "leads", label: "Leads", icon: Users },
  { id: "analytics", label: "Reports", icon: BarChart3 },
  { id: "colleges", label: "Colleges", icon: Building2 },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function MobileBottomNav({ currentPage, onPageChange }: MobileBottomNavProps) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 pt-2 pb-safe"
      style={{
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid #F1F5F9",
        paddingBottom: "max(env(safe-area-inset-bottom), 8px)"
      }}
    >
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id)}
            className="flex flex-col items-center gap-1 flex-1 py-1.5 px-1 rounded-xl transition-all"
            style={{ background: isActive ? "#E8F3EC" : "transparent" }}
          >
            <Icon
              className="w-5 h-5"
              style={{ color: isActive ? "#4A7B5B" : "#94A3B8" }}
            />
            <span
              className="text-[10px] font-medium"
              style={{ color: isActive ? "#4A7B5B" : "#94A3B8" }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
