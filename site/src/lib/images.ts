import type { ImageMetadata } from 'astro';

const all = import.meta.glob<{ default: ImageMetadata }>('/src/assets/images/*.jpg', { eager: true });

/** Look up a bundled image by file name, e.g. img('hero-ranger.jpg'). */
export function img(name: string): ImageMetadata {
  const hit = all[`/src/assets/images/${name}`];
  if (!hit) throw new Error(`Image not found: ${name}`);
  return hit.default;
}
