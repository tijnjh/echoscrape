export interface Metadata {
  title?: string;
  description?: string;
  favicon?: string;
  theme_color?: string;
  og?: {
    title?: string;
    description?: string;
    image?: string;
    image_alt?: string;
    image_width?: string;
    image_height?: string;
    url?: string;
    type?: string;
    site_name?: string;
  };
  twitter?: {
    title?: string;
    description?: string;
    image?: string;
    site?: string;
    card?: string;
  };
  oembed?: Record<string, string>;
}
