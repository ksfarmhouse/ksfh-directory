import Image from "next/image";

type AvatarProps = {
  url: string | null;
  name: string;
  size?: number;
  className?: string;
};

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({ url, name, size = 64, className }: AvatarProps) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        width: size,
        height: size,
        borderRadius: "9999px",
        overflow: "hidden",
        backgroundColor: "#ffce00",
        color: "#006938",
        fontWeight: 700,
        fontSize: Math.round(size / 2.5),
        flexShrink: 0,
      }}
      aria-label={name}
    >
      {url ? (
        <Image
          src={url}
          alt={name}
          fill
          sizes={`${size}px`}
          style={{ objectFit: "cover" }}
        />
      ) : (
        <span>{initialsFor(name) || "?"}</span>
      )}
    </span>
  );
}
