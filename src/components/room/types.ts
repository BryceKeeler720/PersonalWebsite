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
