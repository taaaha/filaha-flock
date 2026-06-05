// ── Type scale ─────────────────────────────────────────────────────────
// The old design made almost everything 700–900 weight. When everything is
// bold, nothing is — the screen reads shouty and robotic. Real hierarchy comes
// from CONTRAST: light, relaxed body text against a few deliberate heavy
// anchors (a coop name, a sensor number, a status pill).
//
// We stay on the system font (OTA-safe, RTL/Arabic-safe — a Latin display font
// would break Arabic rendering), but treat weight, size and tracking as a
// considered scale instead of reaching for 900 everywhere.
//
// Guidance:
//   • Body / supporting text → 400–500. Never bold a paragraph.
//   • Labels / section eyebrows → 600 + wide tracking, uppercase, dimmed.
//   • Titles → 700. Reserve 800 for the single most important word on screen.
//   • Big numbers (sensor values, ring counts) → 700 with a LIGHT unit beside
//     them, so the number carries the weight and the unit recedes.

export const type = {
  // Small uppercase eyebrow above a section ("YOUR COOPS", "TODAY")
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  // Supporting / secondary line
  caption: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  // Default body
  body: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  bodyStrong: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Card / row title
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  // Screen / hero title — the one heavy anchor
  display: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  // Big numeric value (sensor reading). Pair with `unit`.
  number: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  unit: {
    fontSize: 13,
    fontWeight: '500',
  },
};
