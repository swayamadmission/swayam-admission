import api from "./axios";

export type TickerCategory =
  | "COLLEGE"
  | "OFFER"
  | "ANNOUNCEMENT"
  | "COURSE"
  | "EXAM"
  | "SCHOLARSHIP"
  | "STUDY_MATERIAL";

export interface AnnouncementTickerItem {
  id: string;
  category: TickerCategory;
  badge: string;
  text: string;
  buttonText: string;
  href: string;
  isExternal?: boolean;
}

export const homepageApi = {
  getAnnouncements: () =>
    api.get<{ data: AnnouncementTickerItem[] }>("/homepage/announcements"),
};
