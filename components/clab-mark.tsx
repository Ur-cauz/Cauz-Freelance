// C-LAB logo (branding/svg/clab-mark-flat.svg). Dark surfaces use the silver/steel colours, day mode the on-light pair (see .brand-clab in globals.css).
export function ClabMark({ className = "brand-clab" }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 256" className={className} aria-hidden="true" focusable="false">
      <path className="c" d="M80 24 L232 24 L200 56 L93.25 56 L56 93.25 L56 162.75 L93.25 200 L184 200 L152 232 L80 232 L24 176 L24 80 Z" />
      <path className="l" d="M72 104 L104 72 L104 152 L232 152 L200 184 L99.88 184 L72 156.12 Z" />
    </svg>
  );
}
