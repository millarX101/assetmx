import { cn } from '@/lib/utils';

/**
 * AssetMX ribbon icon, square-proportioned for avatars and tiles.
 * The mark is inset so the diagonal's tip clears the circular edge.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn('h-8 w-8', className)}
      role="img"
      aria-label="AssetMX"
    >
      <circle cx="50" cy="50" r="50" fill="#3D472B" />
      <g transform="translate(11 11) scale(0.78)">
        <path d="M40 8 H24 C14 8 6 16 6 26 V74 C6 84 14 92 24 92 H40 Z" fill="#CCDBB2" />
        <path d="M30 8 H58 L94 92 H49 L20 24 V20 C20 13 25 8 30 8 Z" fill="#F5EAD8" />
      </g>
    </svg>
  );
}

export default BrandMark;
