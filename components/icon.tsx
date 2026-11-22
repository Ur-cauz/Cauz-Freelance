// Icon paths copied verbatim from the control panel (dashboard/public/app.js ICONS), same 1.7 stroke style (.i in /panel.css).
const ICONS = {
  sun: ["M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0", "M12 2.5v2", "M12 19.5v2", "M5.3 5.3l1.4 1.4", "M17.3 17.3l1.4 1.4", "M2.5 12h2", "M19.5 12h2", "M5.3 18.7l1.4-1.4", "M17.3 6.7l1.4-1.4"],
  moon: ["M20 14.2A8.2 8.2 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2z"],
  external: ["M14 4h6v6", "M20 4l-8.5 8.5", "M18 13.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5.5"],
  chevron: ["M9 6l6 6-6 6"],
  box: ["M20.5 7.8 12 3 3.5 7.8v8.4L12 21l8.5-4.8z", "M3.5 7.8 12 12.6l8.5-4.8", "M12 12.6V21"],
  network: ["M9.5 5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0", "M2.5 19a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0", "M16.5 19a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0", "M10.8 7.3 6.2 16.7", "M13.2 7.3l4.6 9.4", "M7.5 19h9"],
  code: ["M8 7l-5 5 5 5", "M16 7l5 5-5 5", "M13.5 4.5l-3 15"],
  shield: ["M12 3l7.5 3v6c0 4.6-3.2 7.8-7.5 9-4.3-1.2-7.5-4.4-7.5-9V6z", "M9 12l2 2 4-4"],
  menu: ["M4 6.5h16", "M4 12h16", "M4 17.5h16"],
  x: ["M6 6l12 12", "M18 6 6 18"],
  layers: ["M12 3.5 3 8l9 4.5L21 8z", "M3 12.2l9 4.5 9-4.5", "M3 16.2l9 4.5 9-4.5"],
  bell: ["M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z", "M10 20.5a2 2 0 0 0 4 0"],
  upload: ["M12 15.5V4", "M7.5 8.5 12 4l4.5 4.5", "M4.5 15v4a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-4"],
  grid: ["M3.5 5.5h7v5h-7z", "M13.5 5.5h7v5h-7z", "M7 10.5v3.5h10v-3.5", "M12 14v4", "M8.5 18h7v2.5h-7z"]
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" className="i" aria-hidden="true" focusable="false">
      {ICONS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
