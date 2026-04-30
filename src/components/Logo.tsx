import Image from "next/image";

type LogoProps = {
  size?: number;
  className?: string;
};

// Renders the official FarmHouse crest from /public/fh-shield.jpg.
// The fill + sized-container approach preserves aspect ratio regardless of
// the actual file dimensions (no Next/Image aspect-ratio warnings).
export function Logo({ size = 32, className }: LogoProps) {
  return (
    <span
      className={className}
      style={{
        display: "inline-block",
        position: "relative",
        width: size,
        height: size,
      }}
    >
      <Image
        src="/fh-shield.jpg"
        alt="FarmHouse Fraternity"
        fill
        sizes={`${size}px`}
        style={{ objectFit: "contain" }}
        priority
      />
    </span>
  );
}
