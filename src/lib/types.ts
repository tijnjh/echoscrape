type OrNil<T> = T | null | undefined

export interface Metadata {
  title: OrNil<string>
  description: OrNil<string>
  favicon: OrNil<string>
  theme_color: OrNil<string>
  og: OrNil<{
    title: OrNil<string>
    description: OrNil<string>
    image: OrNil<string>
    image_alt: OrNil<string>
    image_width: OrNil<string>
    image_height: OrNil<string>
    url: OrNil<string>
    type: OrNil<string>
    site_name: OrNil<string>
  }>
  twitter: OrNil<{
    title: OrNil<string>
    description: OrNil<string>
    image: OrNil<string>
    site: OrNil<string>
    card: OrNil<string>
  }>
  oembed: OrNil<Record<string, string>>
}
