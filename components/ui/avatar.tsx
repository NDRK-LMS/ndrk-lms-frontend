import * as React from "react";

type AvatarProps = React.HTMLAttributes<HTMLDivElement> & {
  src?: string | null;
  alt?: string;
  fallback: string;
};

export function Avatar({ src, alt, fallback, className, ...props }: AvatarProps) {
  const initials = React.useMemo(() => {
    const text = fallback?.trim() ?? "";
    if (!text) return "?";
    const parts = text.split(" ").filter(Boolean);
    if (parts.length === 1) {
      const name = parts[0]!;
      const first = name.charAt(0)?.toUpperCase() ?? "";
      const last = name.charAt(name.length - 1)?.toUpperCase() ?? "";
      return (first + last) || "?";
    }
    const first = parts[0]!.charAt(0)?.toUpperCase() ?? "";
    const last = parts[parts.length - 1]!.charAt(0)?.toUpperCase() ?? "";
    return (first + last) || "?";
  }, [fallback]);

  return (
    <div
      className={[
        "inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xs font-semibold text-slate-700",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt ?? fallback} className="h-full w-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

