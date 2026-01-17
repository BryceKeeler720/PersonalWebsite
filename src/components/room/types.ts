export interface HotspotData {
  id: string;
  label: string;
  position: { x: number; y: number }; // Percentage-based positioning
  icon: string;
}

export interface ContentItem {
  title: string;
  description: string;
  tags: string[];
  link?: string;
}

export interface ContentData {
  title: string;
  subtitle: string;
  items: ContentItem[];
}
