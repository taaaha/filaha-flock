// ════════════════════════════════════════════════════════════════
//  limits_logic.h — the alert limits, and the text-message language that sets them
//
//  Pure logic, no hardware: it only needs the C library, so it can be tested
//  on its own (see limits_selftest below, run at every boot) and cannot be
//  broken by anything in the modem or networking code.
//
//  A farmer sets limits by texting the box, e.g.
//
//      T 20 32  H 40 75  C 2500  N 25
//
//      T  temperature   low high   (°C)
//      H  humidity      low high   (%)
//      C  CO2           max        (ppm)
//      N  NH3           max        (ppm)
//      LIMITS (or ?)    ask what is currently set
//      RESET            go back to the built-in defaults
//
//  Case, spacing and punctuation do not matter: "t20 32,h40 75" works.
//  Decimals use a dot (32.5). The comma is a separator.
//
//  A message is applied ALL OR NOTHING: if any part is wrong, nothing changes
//  and the reply says what to fix. And every value is held inside hard ranges,
//  so a typo (or a stranger's text) can never switch an alarm off:
//
//      temperature  low 0-40,  high 10-50,  at least 3 apart
//      humidity     low 0-60,  high 40-100, at least 10 apart
//      CO2          max 800-5000
//      NH3          max 5-50
// ════════════════════════════════════════════════════════════════
#pragma once
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

struct Limits {
  float temp_lo, temp_hi;
  float hum_lo,  hum_hi;
  float co2_hi;
  float nh3_hi;
};

enum LimCmd { LC_NONE = 0, LC_QUERY, LC_RESET, LC_SET, LC_ERROR };

static inline Limits limits_make(float tlo, float thi, float hlo, float hhi, float co2, float nh3) {
  Limits L;
  L.temp_lo = tlo; L.temp_hi = thi;
  L.hum_lo  = hlo; L.hum_hi  = hhi;
  L.co2_hi  = co2; L.nh3_hi  = nh3;
  return L;
}

// Hard safety ranges. NaN fails every comparison, so it is rejected too.
static inline bool limits_valid(const Limits& L, char* err, size_t cap) {
#define LIM_FAIL(msg) do { if (err && cap) snprintf(err, cap, "%s", msg); return false; } while (0)
  if (!(L.temp_lo >= 0  && L.temp_lo <= 40))   LIM_FAIL("T low must be 0-40");
  if (!(L.temp_hi >= 10 && L.temp_hi <= 50))   LIM_FAIL("T high must be 10-50");
  if (!(L.temp_hi - L.temp_lo >= 3.0f))        LIM_FAIL("T high must be 3+ above low");
  if (!(L.hum_lo  >= 0  && L.hum_lo  <= 60))   LIM_FAIL("H low must be 0-60");
  if (!(L.hum_hi  >= 40 && L.hum_hi  <= 100))  LIM_FAIL("H high must be 40-100");
  if (!(L.hum_hi - L.hum_lo >= 10.0f))         LIM_FAIL("H high must be 10+ above low");
  if (!(L.co2_hi  >= 800 && L.co2_hi <= 5000)) LIM_FAIL("C must be 800-5000");
  if (!(L.nh3_hi  >= 5  && L.nh3_hi  <= 50))   LIM_FAIL("N must be 5-50");
#undef LIM_FAIL
  return true;
}

enum LimTok { LT_T = 0, LT_H, LT_C, LT_N, LT_QUERY, LT_RESET };

static inline int limits_word(const char* w) {
  if (!strcmp(w, "t") || !strcmp(w, "temp") || !strcmp(w, "temperature")) return LT_T;
  if (!strcmp(w, "h") || !strcmp(w, "hum")  || !strcmp(w, "humidity"))    return LT_H;
  if (!strcmp(w, "c") || !strcmp(w, "co2")  || !strcmp(w, "co"))          return LT_C;
  if (!strcmp(w, "n") || !strcmp(w, "nh3")  || !strcmp(w, "nh") ||
      !strcmp(w, "amm") || !strcmp(w, "ammonia"))                          return LT_N;
  if (!strcmp(w, "limits") || !strcmp(w, "limit") || !strcmp(w, "lim") ||
      !strcmp(w, "status"))                                                return LT_QUERY;
  if (!strcmp(w, "reset") || !strcmp(w, "default") || !strcmp(w, "defaults")) return LT_RESET;
  return -1;
}

// Store the numbers collected for one keyword. False (with `err` set) when the
// count is wrong - e.g. "T 20" with no high value.
static inline bool lim_commit(int k, const float* v, int have, Limits& c, bool* seen,
                              char* err, size_t ecap) {
  switch (k) {
    case LT_T:
      if (have != 2) { snprintf(err, ecap, "T needs 2 numbers: low high"); return false; }
      c.temp_lo = v[0]; c.temp_hi = v[1]; seen[0] = true; return true;
    case LT_H:
      if (have != 2) { snprintf(err, ecap, "H needs 2 numbers: low high"); return false; }
      c.hum_lo = v[0]; c.hum_hi = v[1]; seen[1] = true; return true;
    case LT_C:
      if (have != 1) { snprintf(err, ecap, "C needs 1 number: max"); return false; }
      c.co2_hi = v[0]; seen[2] = true; return true;
    case LT_N:
      if (have != 1) { snprintf(err, ecap, "N needs 1 number: max"); return false; }
      c.nh3_hi = v[0]; seen[3] = true; return true;
  }
  return true;
}

// Parse one text message. On LC_SET, `L` holds the new limits. On anything
// else `L` is untouched, and on LC_ERROR `err` says what to fix.
static inline LimCmd limits_parse(const char* body, Limits& L, char* err, size_t ecap) {
#define LIM_ERR(...) do { if (err && ecap) snprintf(err, ecap, __VA_ARGS__); return LC_ERROR; } while (0)
  if (!body) return LC_NONE;

  char buf[168];
  size_t n = 0;
  for (const char* s = body; *s && n < sizeof(buf) - 1; ++s) {
    unsigned char ch = (unsigned char)*s;
    buf[n++] = (char)((ch >= 'A' && ch <= 'Z') ? ch + 32 : ch);
  }
  buf[n] = 0;

  Limits cand = L;
  bool seen[4] = { false, false, false, false };
  bool want_query = false, want_reset = false;
  int cur = -1;                 // keyword that is currently collecting numbers
  float nums[2] = { 0, 0 };
  int have = 0;
  int tokens = 0;
  char e2[48]; e2[0] = 0;

  size_t i = 0;
  while (i < n) {
    const char c = buf[i];

    if (c >= 'a' && c <= 'z') {
      char w[16]; size_t wl = 0;
      while (i < n && buf[i] >= 'a' && buf[i] <= 'z' && wl < sizeof(w) - 1) w[wl++] = buf[i++];
      // "co2" and "nh3" carry their digit inside the word
      if (wl == 2 && i < n &&
          ((w[0] == 'c' && w[1] == 'o' && buf[i] == '2') ||
           (w[0] == 'n' && w[1] == 'h' && buf[i] == '3'))) w[wl++] = buf[i++];
      w[wl] = 0;

      const int k = limits_word(w);
      if (k < 0) LIM_ERR("unknown word '%.8s'", w);

      if (cur >= 0 && !lim_commit(cur, nums, have, cand, seen, e2, sizeof e2)) LIM_ERR("%s", e2);
      cur = -1; have = 0;
      if (k == LT_QUERY) want_query = true;
      else if (k == LT_RESET) want_reset = true;
      else cur = k;
      tokens++;
    } else if ((c >= '0' && c <= '9') || c == '.') {
      char nb[16]; size_t nl = 0;
      while (i < n && ((buf[i] >= '0' && buf[i] <= '9') || buf[i] == '.') && nl < sizeof(nb) - 1) nb[nl++] = buf[i++];
      nb[nl] = 0;
      if (cur < 0)  LIM_ERR("put T H C or N before each number");
      if (have >= 2) LIM_ERR("too many numbers");
      char* end = NULL;
      const float v = strtof(nb, &end);
      if (end == nb || *end) LIM_ERR("bad number '%.8s'", nb);
      nums[have++] = v;
      tokens++;
    } else if (c == '?') {
      if (cur >= 0 && !lim_commit(cur, nums, have, cand, seen, e2, sizeof e2)) LIM_ERR("%s", e2);
      cur = -1; have = 0;
      want_query = true;
      tokens++;
      i++;
    } else {
      i++;                       // space, comma, colon, '=', anything else: a separator
    }
  }
  if (cur >= 0 && !lim_commit(cur, nums, have, cand, seen, e2, sizeof e2)) LIM_ERR("%s", e2);

  if (tokens == 0) return LC_NONE;

  const bool any = seen[0] || seen[1] || seen[2] || seen[3];
  if ((want_query || want_reset) && any) LIM_ERR("send settings, or LIMITS, or RESET - not mixed");
  if (want_query && want_reset)          LIM_ERR("send LIMITS or RESET, not both");
  if (want_query) return LC_QUERY;
  if (want_reset) return LC_RESET;
  if (!any)       LIM_ERR("nothing to set");

  if (!limits_valid(cand, err, ecap)) return LC_ERROR;
  L = cand;
  return LC_SET;
#undef LIM_ERR
}

// Compact form used in replies: "T12-38 H25-85 C2500 N35"
static inline void limits_format(const Limits& L, char* out, size_t cap) {
  snprintf(out, cap, "T%g-%g H%g-%g C%g N%g",
           (double)L.temp_lo, (double)L.temp_hi, (double)L.hum_lo, (double)L.hum_hi,
           (double)L.co2_hi, (double)L.nh3_hi);
}

// ── self-test ─────────────────────────────────────────────────────
// Runs against the real parser at every boot, like the power-cut logic does.
// Returns how many checks passed; `total` and `first_fail` (1-based, 0 = none)
// say how it went. Anything but all-pass means: do not ship this unit.
static inline int limits_selftest(int* total_out, int* first_fail) {
  int pass = 0, total = 0, ff = 0;
  char err[64];
  const Limits D = limits_make(12, 38, 25, 85, 2500, 35);
#define LCHECK(cond) do { total++; if (cond) pass++; else if (!ff) ff = total; } while (0)

  { Limits L = D; LimCmd c = limits_parse("T 20 32", L, err, sizeof err);
    LCHECK(c == LC_SET && L.temp_lo == 20 && L.temp_hi == 32 && L.hum_lo == 25 && L.co2_hi == 2500); }   // one setting leaves the rest alone
  { Limits L = D; LimCmd c = limits_parse("t20 32 h40 75 c2500 n25", L, err, sizeof err);
    LCHECK(c == LC_SET && L.temp_lo == 20 && L.hum_hi == 75 && L.hum_lo == 40 && L.co2_hi == 2500 && L.nh3_hi == 25); } // glued letters+digits
  { Limits L = D; LimCmd c = limits_parse("Temp: 22, 30; Hum: 45, 70", L, err, sizeof err);
    LCHECK(c == LC_SET && L.temp_lo == 22 && L.temp_hi == 30 && L.hum_lo == 45 && L.hum_hi == 70); }     // words and punctuation
  { Limits L = D; LimCmd c = limits_parse("LIMITS", L, err, sizeof err);
    LCHECK(c == LC_QUERY && L.temp_lo == 12); }
  { Limits L = D; LimCmd c = limits_parse("?", L, err, sizeof err);
    LCHECK(c == LC_QUERY); }
  { Limits L = D; LimCmd c = limits_parse("reset", L, err, sizeof err);
    LCHECK(c == LC_RESET); }
  { Limits L = D; LimCmd c = limits_parse("T 40 20", L, err, sizeof err);
    LCHECK(c == LC_ERROR && L.temp_lo == 12 && L.temp_hi == 38); }                                       // high below low: refused, unchanged
  { Limits L = D; LimCmd c = limits_parse("T 20", L, err, sizeof err);
    LCHECK(c == LC_ERROR); }                                                                              // one number for a pair
  { Limits L = D; LimCmd c = limits_parse("C 99999", L, err, sizeof err);
    LCHECK(c == LC_ERROR && L.co2_hi == 2500); }                                                          // out of the safe range
  { Limits L = D; LimCmd c = limits_parse("blah", L, err, sizeof err);
    LCHECK(c == LC_ERROR); }
  { Limits L = D; LimCmd c1 = limits_parse("", L, err, sizeof err);
    LimCmd c2 = limits_parse("   ,, ", L, err, sizeof err);
    LCHECK(c1 == LC_NONE && c2 == LC_NONE); }                                                             // blank: ignored
  { Limits L = D; LimCmd c = limits_parse("T 20 32 C abc", L, err, sizeof err);
    LCHECK(c == LC_ERROR && L.temp_lo == 12 && L.temp_hi == 38); }                                       // all or nothing
  { Limits L = D; LimCmd c = limits_parse("NH3 30", L, err, sizeof err);
    LCHECK(c == LC_SET && L.nh3_hi == 30); }
  { Limits L = D; LimCmd c = limits_parse("t 12.5 33.5", L, err, sizeof err);
    LCHECK(c == LC_SET && L.temp_lo == 12.5f && L.temp_hi == 33.5f); }                                   // decimals
  { Limits L = D; LimCmd c = limits_parse("LIMITS T 20 32", L, err, sizeof err);
    LCHECK(c == LC_ERROR); }                                                                              // mixed intent
  { Limits L = D; LimCmd c = limits_parse("20 32", L, err, sizeof err);
    LCHECK(c == LC_ERROR); }                                                                              // numbers with no letter
  { Limits L = D; LimCmd c = limits_parse("H 90 95", L, err, sizeof err);
    LCHECK(c == LC_ERROR); }
  { Limits L = D; LimCmd c = limits_parse("nh3 4", L, err, sizeof err);
    LCHECK(c == LC_ERROR); }                                                                              // below the floor: cannot disable an alarm
  { Limits L = D; LimCmd c = limits_parse("T 10 13", L, err, sizeof err);
    LCHECK(c == LC_SET && L.temp_lo == 10 && L.temp_hi == 13); }                                         // the narrowest allowed band
  { Limits L = D; LimCmd c = limits_parse("T 0 50 H 0 100 C 5000 N 50", L, err, sizeof err);
    LCHECK(c == LC_SET); }                                                                                // the widest allowed
#undef LCHECK
  if (total_out) *total_out = total;
  if (first_fail) *first_fail = ff;
  return pass;
}
