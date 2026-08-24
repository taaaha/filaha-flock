// ════════════════════════════════════════════════════════════════
//  power_logic.h — mains-vs-battery decision, as pure arithmetic.
//
//  Deliberately free of Arduino, globals and I/O: it takes a state struct, a
//  tuning struct, a voltage and a timestamp, and returns a verdict. That is
//  what lets the self-test in sensors.cpp drive THIS EXACT CODE through
//  scripted sequences at boot — including ones that would take hours to
//  reproduce on a bench — instead of testing a copy that drifts from what ships.
//
//  ── What the hardware actually offers ─────────────────────────────
//  One analog node: a divider on the BAT rail. With a battery permanently
//  fitted — the normal installation — it reads 3.3-4.2 V whether or not the
//  charger is connected. An ADC sweep of every spare pin on this revision found
//  nothing better: pin 33 is the 3V3 rail, 32/34/36/39 float.
//
//  ── Two different signals, because one is not enough ──────────────
//  LEVEL works for detecting the cut. A charger holds the rail on its
//  constant-voltage plateau, measured at 4.118-4.123 V on a real unit and
//  stable to about ±5 mV. Pulling it drops the rail onto the cell's loaded
//  voltage within milliseconds. That step is what makes the alert immediate.
//
//  LEVEL does NOT work for detecting the restore, and assuming it did produced
//  a "power is back" SMS seconds after every genuine cut. Two reasons:
//    * the cut is tripped by the sag of a transmit burst, and the cell springs
//      back the instant that burst ends — straight back over any threshold set
//      symmetrically with the cut;
//    * once the cell is full the charger terminates, so the rail IS the cell's
//      resting voltage. Plugged and unplugged become the same number, and no
//      threshold can separate them.
//
//  RIPPLE works for both, and is what governs the restore. The modem transmits
//  every telemetry cycle. On mains the charger absorbs that burst and the rail
//  barely moves — 13 mV peak-to-peak across an hour on the real unit. On
//  battery the same burst is pulled through the cell's internal resistance and
//  the rail visibly sags. So the QUIETNESS of the rail, not its height, is what
//  says a charger is present. Every test below is a difference, which also
//  makes the whole thing immune to the ESP32 SAR ADC's per-chip calibration
//  error.
//
//  The restore is deliberately slower and stricter than the cut: it must clear
//  a lockout, show a quiet rail over consecutive windows, AND be back at the
//  plateau. A late "power is back" costs nothing; a false one destroys the
//  farmer's trust in every alert the box sends.
// ════════════════════════════════════════════════════════════════
#pragma once

struct PowerState {
  bool          mains;        // current verdict
  float         mains_ref;    // rail level that "on mains" looks like right now
  unsigned long cut_ms;       // when the cut was declared

  // Rolling peak-to-peak window.
  float         win_min;
  float         win_max;
  unsigned long win_ms;
  float         ripple;       // peak-to-peak of the last COMPLETED window
  int           quiet_runs;   // consecutive completed windows with a quiet rail
};

struct PowerTuning {
  float         drop_v;              // fall off the plateau that means "unplugged"
  unsigned long boot_grace_ms;       // learning window right after power-on
  unsigned long restore_lockout_ms;  // no restore may be judged this soon after a cut
  unsigned long ripple_window_ms;    // must be long enough to contain a transmit burst
  float         ripple_mains_max;    // peak-to-peak at or below this = charger present
  int           restore_windows;     // consecutive quiet windows required to restore
};

inline void power_state_init(PowerState& s) {
  s.mains      = true;        // a device is always plugged in when switched on
  s.mains_ref  = 0.0f;
  s.cut_ms     = 0;
  s.win_min    = 0.0f;
  s.win_max    = 0.0f;
  s.win_ms     = 0;
  s.ripple     = 0.0f;
  s.quiet_runs = 0;
}

inline bool power_decide(PowerState& s, const PowerTuning& k, float v, unsigned long now) {
  // Rail dark → no battery fitted, so the charger must be feeding the board.
  if (v < 0.5f) { s.mains = true; return true; }

  // ── Keep the peak-to-peak window up to date ──────────────────────
  if (s.win_min <= 0.0f || v < s.win_min) s.win_min = v;
  if (v > s.win_max)                      s.win_max = v;
  if (now - s.win_ms >= k.ripple_window_ms) {
    s.ripple = s.win_max - s.win_min;
    s.quiet_runs = (s.ripple <= k.ripple_mains_max) ? s.quiet_runs + 1 : 0;
    s.win_min = v;
    s.win_max = v;
    s.win_ms  = now;
  }

  // Learn what "mains present" reads like on this unit — this ADC, this
  // divider, this battery — rather than assuming a voltage.
  if (now < k.boot_grace_ms) {
    if (v > s.mains_ref) s.mains_ref = v;
    s.mains = true;
    return true;
  }

  if (s.mains) {
    // Follow the plateau upward as the cell charges, so the step below is
    // always measured against the CURRENT plateau and never a stale one.
    if (v > s.mains_ref) s.mains_ref = v;

    // The cut: the rail falls off the plateau. Immediate, by design.
    if (s.mains_ref > 0.0f && v < s.mains_ref - k.drop_v) {
      s.mains      = false;
      s.cut_ms     = now;
      s.quiet_runs = 0;
      return false;
    }
    return true;
  }

  // ── On battery: what it takes to say the power is back ────────────
  // (1) The rebound immediately after a cut looks exactly like a restore, so
  //     nothing at all is judged until the rail has had time to settle.
  if (now - s.cut_ms < k.restore_lockout_ms) return false;

  // (2) A quiet rail across consecutive windows. This is the real evidence:
  //     only a charger can absorb the transmit bursts that a cell cannot.
  if (s.quiet_runs < k.restore_windows) return false;

  // (3) And the level must genuinely be back at the plateau. On its own this
  //     proves nothing — a full cell rests there too — but as the last of three
  //     it stops a quiet idle period from being mistaken for mains.
  if (s.mains_ref > 0.0f && v < s.mains_ref - k.drop_v) return false;

  s.mains     = true;
  s.mains_ref = v;   // a charger feeding a half-empty cell sits below the old
                     // plateau; re-anchoring here stops the next sample from
                     // reading as "still below reference" and oscillating.
  return true;
}
