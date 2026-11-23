import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

type PopoverProps = {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  /** Match the anchor's width (dropdowns) or size to content (calendars). */
  matchWidth?: boolean;
  className?: string;
};

const GAP = 6;

/**
 * Floating panel under (or above, if there's no room) an anchor element.
 * Rendered in <body> so scrolling modal bodies can't clip it.
 */
const Popover = ({ open, anchorRef, onClose, children, matchWidth = true, className = "" }: PopoverProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<{ top: number; left: number; width?: number; maxHeight: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const a = anchorRef.current?.getBoundingClientRect();
      if (!a) return;
      const panelH = panelRef.current?.offsetHeight ?? 320;
      const panelW = matchWidth ? a.width : panelRef.current?.offsetWidth ?? 300;
      const below = window.innerHeight - a.bottom - GAP - 8;
      const above = a.top - GAP - 8;
      const openUp = below < Math.min(panelH, 260) && above > below;
      const maxHeight = Math.max(160, Math.min(380, openUp ? above : below));
      const top = openUp ? a.top - GAP - Math.min(panelH, maxHeight) : a.bottom + GAP;
      const left = Math.min(Math.max(8, a.left), window.innerWidth - panelW - 8);
      setStyle({ top, left, width: matchWidth ? a.width : undefined, maxHeight });
    };
    place();
    const raf = requestAnimationFrame(place); // again once the panel has its real size
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef, matchWidth]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onClose, anchorRef]);

  if (!open) return null;
  return createPortal(
    <div
      ref={panelRef}
      style={style ? { top: style.top, left: style.left, width: style.width, maxHeight: style.maxHeight } : { visibility: "hidden", top: 0, left: 0 }}
      className={`fixed z-[90] flex flex-col overflow-hidden rounded-xl border border-line bg-surface font-inter text-brand-ink shadow-pop ${className}`}
    >
      {children}
    </div>,
    document.body,
  );
};

export default Popover;
