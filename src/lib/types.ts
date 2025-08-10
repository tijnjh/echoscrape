type OrNullish<T> = T | null | undefined

export interface Metadata {
  title: OrNullish<string>
  description: OrNullish<string>
  favicon: OrNullish<string>
  theme_color: OrNullish<string>
  og: OrNullish<{
    title: OrNullish<string>
    description: OrNullish<string>
    image: OrNullish<string>
    image_alt: OrNullish<string>
    image_width: OrNullish<string>
    image_height: OrNullish<string>
    url: OrNullish<string>
    type: OrNullish<string>
    site_name: OrNullish<string>
  }>
  twitter: OrNullish<{
    title: OrNullish<string>
    description: OrNullish<string>
    image: OrNullish<string>
    site: OrNullish<string>
    card: OrNullish<string>
  }>
  oembed: OrNullish<Record<string, string>>
}
