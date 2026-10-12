import React, { useEffect, useRef, useState } from "react";

interface TemplateThumbnailProps {
  /** The template's real preview page (`/api/templates/:id/preview`). */
  previewUrl: string;
  title: string;
  /** Tint shown until the page has painted. */
  accent?: string;
}

/** Width the template is laid out at before being scaled down to the card. */
const DESKTOP_WIDTH = 1280;

/**
 * A live, scaled-down render of the template itself, so a card shows the
 * design a merchant will actually get — its real banner, images and layout —
 * rather than a placeholder that looks the same for every template.
 *
 * The page is only loaded once the card scrolls into view, and it is inert:
 * sandboxed by its own response headers, unfocusable and click-through.
 */
export const TemplateThumbnail: React.FC<TemplateThumbnailProps> = ({ previewUrl, title, accent = "#3B82F6" }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    const resize = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / DESKTOP_WIDTH));
    resize.observe(box);

    const visibility = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          visibility.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    visibility.observe(box);

    return () => {
      resize.disconnect();
      visibility.disconnect();
    };
  }, []);

  return (
    <div
      ref={boxRef}
      className="absolute inset-0 overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${accent}18, ${accent}08)` }}
    >
      {inView && scale > 0 && (
        <iframe
          src={previewUrl}
          title={title}
          // No `sandbox` attribute needed: the preview response sandboxes itself
          // by CSP header, which also holds when the page is opened directly.
          loading="lazy"
          tabIndex={-1}
          aria-hidden="true"
          scrolling="no"
          onLoad={() => setLoaded(true)}
          className={`absolute top-0 left-0 border-0 origin-top-left pointer-events-none bg-white transition-opacity duration-500 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          style={{
            width: DESKTOP_WIDTH,
            height: Math.ceil((boxRef.current?.clientHeight ?? 192) / scale),
            transform: `scale(${scale})`,
          }}
        />
      )}
    </div>
  );
};
