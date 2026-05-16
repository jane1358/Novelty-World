export function Footer() {
  return (
    <div
      className="relative z-10 flex shrink-0"
      // Mirror of the header treatment: sharp 1px divider plus a soft
      // upward shadow so the footer reads as elevated above the board.
      style={{
        boxShadow:
          "0 -1px 0 var(--mono-frame), 0 -6px 12px rgba(0, 0, 0, 0.75)",
      }}
    >
      <FooterButton label="Roll" />
      <FooterButton label="Buy" />
      <FooterButton label="Trade" />
      <FooterButton label="End" />
    </div>
  );
}

function FooterButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="flex flex-1 items-center justify-center px-3 py-5 font-semibold uppercase tracking-wide"
      style={{
        backgroundColor: "var(--mono-board)",
        color: "var(--mono-ink)",
        fontSize: "clamp(0.875rem, 2.5vmin, 1.125rem)",
        minHeight: "56px",
      }}
    >
      {label}
    </button>
  );
}
