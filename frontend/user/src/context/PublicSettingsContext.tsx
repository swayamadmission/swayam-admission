import { createContext, useContext, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "../api/settings.api";
import { Wrench } from "lucide-react";

interface PublicSettings {
  platformName?: string;
  tagline?: string;
  websiteUrl?: string;
  supportEmail?: string;
  supportPhone?: string;
  whatsappPhone?: string;
  companyName?: string;
  address?: string;
  logo?: string;
  favicon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  featureFlags?: Record<string, boolean>;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string;
    canonicalDomain?: string;
  };
}

const PublicSettingsContext = createContext<{ settings: PublicSettings; isLoading: boolean }>({
  settings: {},
  isLoading: false,
});

export function PublicSettingsProvider({ children }: { children: ReactNode }) {
  const { data: res, isLoading } = useQuery({
    queryKey: ["public_system_settings"],
    queryFn: () => settingsApi.getPublicSettings(),
    staleTime: 60000,
  });

  const settings: PublicSettings = res?.data || {};

  useEffect(() => {
    if (settings.seo?.metaTitle) {
      document.title = settings.seo.metaTitle;
    } else if (settings.platformName) {
      document.title = `${settings.platformName} | ${settings.tagline || ''}`;
    }

    if (settings.primaryColor) {
      document.documentElement.style.setProperty("--primary-color", settings.primaryColor);
    }
  }, [settings]);

  if (settings.maintenanceMode) {
    return (
      <div className="fixed inset-0 bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center z-[9999]">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4 border border-amber-500/30">
          <Wrench className="w-8 h-8 animate-pulse" />
        </div>
        <h1 className="text-3xl font-extrabold mb-2">{settings.platformName || "Swayam Admission"} Under Maintenance</h1>
        <p className="text-slate-400 max-w-md text-sm mb-6">
          {settings.maintenanceMessage || "We are currently conducting scheduled system maintenance to improve our service. Please check back shortly."}
        </p>
        <div className="text-xs text-slate-500 font-mono">Support: {settings.supportEmail || "support@swayamadmission.in"}</div>
      </div>
    );
  }

  return (
    <PublicSettingsContext.Provider value={{ settings, isLoading }}>
      {children}
    </PublicSettingsContext.Provider>
  );
}

export function usePublicSettings() {
  return useContext(PublicSettingsContext);
}
