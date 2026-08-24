#include "format.h"

// ── A tiny bounded UTF-16 string builder ──────────────────────────
// Everything is appended through this, so no message can ever overrun its
// buffer no matter what the sensors report.
namespace {

struct U16 {
  char16_t* buf;
  size_t    cap;
  size_t    n;
  U16(char16_t* b, size_t c) : buf(b), cap(c), n(0) {}

  void put(char16_t ch)          { if (n + 1 < cap) buf[n++] = ch; }
  void add(const char16_t* s)    { while (*s) put(*s++); }
  // ASCII (device id, digits, units) widened into UTF-16. Phones render the
  // Latin/Arabic mix correctly on their own.
  void add(const char* s)        { while (*s) put((char16_t)(uint8_t)*s++); }
  void addInt(int v)             { char t[12]; snprintf(t, sizeof t, "%d", v);      add(t); }
  void addF1(float v)            { char t[16]; snprintf(t, sizeof t, "%.1f", v);    add(t); }
  void addF0(float v)            { char t[16]; snprintf(t, sizeof t, "%.0f", v);    add(t); }
};

const bool AR(int lang) { return lang == FILAHA_LANG_AR; }

// What went wrong, in the farmer's own words. Deliberately everyday terms:
// "غاز الكربون" rather than the textbook "ثاني أكسيد الكربون".
const char16_t* danger_word(FilahaDanger k, int lang) {
  if (AR(lang)) {
    switch (k) {
      case FD_CO2_HIGH:  return u"غاز الكربون مرتفع";
      case FD_NH3_HIGH:  return u"الأمونيا مرتفعة";
      case FD_TEMP_HIGH: return u"الحرارة مرتفعة";
      case FD_TEMP_LOW:  return u"الحرارة منخفضة";
      case FD_HUM_HIGH:  return u"الرطوبة مرتفعة";
      case FD_HUM_LOW:   return u"الرطوبة منخفضة";
    }
    return u"خطر";
  }
  switch (k) {
    case FD_CO2_HIGH:  return u"Taux de CO2 eleve";
    case FD_NH3_HIGH:  return u"Ammoniac eleve";
    case FD_TEMP_HIGH: return u"Temperature trop haute";
    case FD_TEMP_LOW:  return u"Temperature trop basse";
    case FD_HUM_HIGH:  return u"Humidite trop haute";
    case FD_HUM_LOW:   return u"Humidite trop basse";
  }
  return u"Danger";
}

const char16_t* danger_unit(FilahaDanger k) {
  switch (k) {
    case FD_CO2_HIGH:
    case FD_NH3_HIGH:  return u" ppm";
    case FD_TEMP_HIGH:
    case FD_TEMP_LOW:  return u" C";
    case FD_HUM_HIGH:
    case FD_HUM_LOW:   return u" %";
  }
  return u"";
}

}  // namespace

// "خطر DEV01: الحرارة مرتفعة 39.5 C. تدخل فورا."
// "ALERTE DEV01: Temperature trop haute 39.5 C. Intervenez vite."
size_t filaha_sms_danger(char16_t* out, size_t cap, const char* device_id,
                         FilahaDanger kind, float value, int lang) {
  U16 s(out, cap);
  const bool ar = AR(lang);
  s.add(ar ? u"خطر " : u"ALERTE ");
  s.add(device_id);
  s.add(u": ");
  s.add(danger_word(kind, lang));
  s.put(u' ');
  // CO2 is a whole number; everything else reads better with one decimal.
  if (kind == FD_CO2_HIGH) s.addF0(value); else s.addF1(value);
  s.add(danger_unit(kind));
  s.add(ar ? u". تدخل فورا." : u". Intervenez vite.");
  return s.n;
}

// "انقطعت الكهرباء في القن DEV01. البطارية 72%."
// "COUPURE DE COURANT - poulailler DEV01. Batterie 72%."
size_t filaha_sms_power_cut(char16_t* out, size_t cap, const char* device_id,
                            int bat_pct, int lang) {
  U16 s(out, cap);
  if (AR(lang)) {
    s.add(u"انقطعت الكهرباء في القن ");
    s.add(device_id);
    s.add(u". البطارية ");
    s.addInt(bat_pct);
    s.add(u"%.");
  } else {
    s.add(u"COUPURE DE COURANT - poulailler ");
    s.add(device_id);
    s.add(u". Batterie ");
    s.addInt(bat_pct);
    s.add(u"%.");
  }
  return s.n;
}

// "عادت الكهرباء في القن DEV01. البطارية 72%."
size_t filaha_sms_power_back(char16_t* out, size_t cap, const char* device_id,
                             int bat_pct, int lang) {
  U16 s(out, cap);
  if (AR(lang)) {
    s.add(u"عادت الكهرباء في القن ");
    s.add(device_id);
    s.add(u". البطارية ");
    s.addInt(bat_pct);
    s.add(u"%.");
  } else {
    s.add(u"Courant retabli - poulailler ");
    s.add(device_id);
    s.add(u". Batterie ");
    s.addInt(bat_pct);
    s.add(u"%.");
  }
  return s.n;
}

// "تقرير DEV01: حرارة 28.4 رطوبة 60% غاز 850 بطارية 87%"
size_t filaha_sms_daily(char16_t* out, size_t cap, const char* device_id,
                        const SensorReading& r, int lang) {
  U16 s(out, cap);
  const bool ar = AR(lang);
  s.add(ar ? u"تقرير " : u"Rapport ");
  s.add(device_id);
  s.add(u": ");
  if (r.has_temp) { s.add(ar ? u"حرارة " : u"temp ");  s.addF1(r.temp_c);  s.put(u' '); }
  if (r.has_hum)  { s.add(ar ? u"رطوبة " : u"hum ");   s.addF0(r.hum_pct); s.add(u"% "); }
  if (r.has_co2)  { s.add(ar ? u"غاز "   : u"CO2 ");   s.addF0(r.co2_ppm); s.put(u' '); }
  if (r.has_nh3)  { s.add(ar ? u"أمونيا " : u"NH3 ");  s.addF1(r.nh3_ppm); s.put(u' '); }
  if (r.has_bat && r.bat_pct >= 0 && r.bat_pct <= 100) {
    s.add(ar ? u"بطارية " : u"batt ");
    s.addInt(r.bat_pct);
    s.put(u'%');
  }
  return s.n;
}

// "رسالة تجريبية من جهاز فلاحة فلوك DEV01. كل شيء يعمل."
size_t filaha_sms_test(char16_t* out, size_t cap, const char* device_id, int lang) {
  U16 s(out, cap);
  if (AR(lang)) {
    s.add(u"رسالة تجريبية من جهاز فلاحة فلوك ");
    s.add(device_id);
    s.add(u". كل شيء يعمل.");
  } else {
    s.add(u"Message de test Filaha Flock ");
    s.add(device_id);
    s.add(u". Tout fonctionne.");
  }
  return s.n;
}

// "تم إطفاء الجهاز DEV01 يدويا."
size_t filaha_sms_shutdown(char16_t* out, size_t cap, const char* device_id, int lang) {
  U16 s(out, cap);
  if (AR(lang)) {
    s.add(u"تم إطفاء الجهاز ");
    s.add(device_id);
    s.add(u" يدويا.");
  } else {
    s.add(u"Appareil ");
    s.add(device_id);
    s.add(u" eteint manuellement.");
  }
  return s.n;
}
