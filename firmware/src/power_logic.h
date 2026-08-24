// ════════════════════════════════════════════════════════════════
//  power_logic.h — mains-vs-battery decision, as pure arithmetic.
//
//  Deliberately free of Arduino, globals and I/O: it takes a state struct, a
//  tuning struct, a voltage and a timestamp, and returns a verdict. That is
//  what lets the self-test in sensors.cpp drive THIS EXACT CODE through
//  scripted voltage sequences at boot — including sequences that would take
//  hours to reproduce on a bench — instead of testing a copy of it that can
//  drift away from what actually ships.
//
//  Why the rail voltage is the only input: with a battery permanently fitted —
//  the normal installation — the board's single analog node reads 3.3-4.2 V
//  whether or not the charger is connected. An ADC sweep of every spare pin on
//  this revision found nothing else: pin 33 is the 3V3 rail, 32/34/36/39 float.
//  So the decision has to come from how the rail MOVES, not what it reads, and
//  every test below is a difference against a learned reference — which also
//  makes it immune to the ESP32 SAR ADC's per-chip calibration error.
// ════════════════════════════════════════════════════════════════
#pragma once

struct PowerState {
  bool          mains;       // current verdict
  float         mains_ref;   // rail level that "on mains" looks like right now
  float         anchor_v;    // trend anchor
  unsigned long anchor_ms;
};

struct PowerTuning {
  float         drop_v;            // step off the plateau that means "unplugged"
  float         trend_v;           // rise/fall that counts as a real direction
  unsigned long trend_window_ms;   // how long a flat rail keeps its anchor
  unsigned long boot_grace_ms;     // learning window right after power-on
};

inline void power_state_init(PowerState& s) {
  s.mains     = true;              // a device is always plugged in when switched on
  s.mains_ref = 0.0f;
  s.anchor_v  = 0.0f;
  s.anchor_ms = 0;
}

inline bool power_decide(PowerState& s, const PowerTuning& k, float v, unsigned long now) {
  // Rail dark → no battery fitted, so the charger must be feeding the board.
  if (v < 0.5f) { s.mains = true; return true; }

  // Learn what "mains present" reads like on this unit — this ADC, this
  // divider, this battery — rather than assuming a voltage.
  if (now < k.boot_grace_ms) {
    if (v > s.mains_ref) s.mains_ref = v;
    s.anchor_v  = v;
    s.anchor_ms = now;
    s.mains     = true;
    return true;
  }

  // ── Fast path: the step on and off the charger's plateau ──────────
  // A charger holds the rail on its constant-voltage plateau. Pulling it drops
  // the rail onto the cell's loaded voltage within milliseconds; plugging it
  // back into a reasonably charged cell lifts it straight back. This is what
  // makes the alert immediate instead of eventual. It is only an ENTRY trigger
  // in each direction — the trend below governs once a state is entered.
  if (s.mains_ref > 0.0f) {
    if (s.mains && v < s.mains_ref - k.drop_v) {
      s.mains     = false;
      s.anchor_v  = v;
      s.anchor_ms = now;
      return false;
    }
    if (!s.mains && v >= s.mains_ref - k.drop_v) {
      s.mains     = true;
      s.mains_ref = v;              // re-anchor — see the note at the bottom
      s.anchor_v  = v;
      s.anchor_ms = now;
      return true;
    }
  }

  // ── Trend path: direction of travel, for what the step cannot see ──
  // Chiefly the deep-discharge reconnect: after a long cut the cell may sit at
  // 3.7 V, and a charger topping it up in constant-current mode holds the rail
  // near the CELL voltage — far below the old plateau, so no step appears. But
  // the rail climbs, and nothing except a charger makes it climb.
  if (s.anchor_v <= 0.0f) { s.anchor_v = v; s.anchor_ms = now; }

  if (v >= s.anchor_v + k.trend_v) {                 // charge going in
    if (!s.mains) s.mains_ref = v;                   // re-anchor on entry
    s.mains     = true;
    s.anchor_v  = v;
    s.anchor_ms = now;
  } else if (v <= s.anchor_v - k.trend_v) {          // charge coming out
    s.mains     = false;
    s.anchor_v  = v;
    s.anchor_ms = now;
  } else if (now - s.anchor_ms > k.trend_window_ms) {
    s.anchor_v  = v;                                 // flat — open a fresh window
    s.anchor_ms = now;
  }

  // While on mains the reference follows the rail UP as the cell charges, so
  // the step test always measures against the CURRENT plateau. It is never
  // dragged down by a discharge — but it IS reset the moment we come back onto
  // mains, because a charger feeding a half-empty cell legitimately sits well
  // below the old full-charge plateau. Without that reset every reconnect after
  // a long cut would still read as "below reference", and the detector would
  // flip back to battery on the very next sample and oscillate forever.
  if (s.mains && v > s.mains_ref) s.mains_ref = v;

  return s.mains;
}
