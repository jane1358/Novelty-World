interface Props {
  /** Stroke width of the X lines in SVG user units. Callers pick a value
   *  matched to the size of the parent — 1.5 for the small header chips,
   *  2 for the full-size row panel. */
  strokeWidth: number;
}

/** White diagonal X overlay used to mark a mortgaged asset. Absolute-fills
 *  its parent; the parent must be `position: relative`. */
export function MortgageMarker({ strokeWidth }: Props) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <line
        x1="0"
        y1="0"
        x2="100"
        y2="100"
        stroke="white"
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1="100"
        y1="0"
        x2="0"
        y2="100"
        stroke="white"
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
