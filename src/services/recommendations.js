// ─────────────────────────────────────────────────────────────────────
// recommendations — turns a farm's measured state into the one thing its
// owner should actually do next.
//
// The rule this module exists to enforce: never give an instruction that the
// rest of the farm's state contradicts. Telling a farmer to open the vents
// because CO₂ is high, while the house sits 4 °C below the brooding target,
// is worse than saying nothing — it costs him birds. So air quality and
// temperature are resolved TOGETHER, once, and the advice that comes out
// names the conflict and the order to fix it in.
//
// Everything here is derived from buildFarmContext(): current values, how fast
// they are moving, how long until a limit is crossed, the age of the flock,
// and the time of day. Two farms only ever get the same sentence if they are
// genuinely in the same situation.
// ─────────────────────────────────────────────────────────────────────

const UNITS = { co2: 'ppm', nh3: 'ppm', temp: '°C', hum: '%' };

function fmtVal(key, v) {
  if (v == null || isNaN(v)) return '—';
  return key === 'co2' ? String(Math.round(v))
       : key === 'nh3' ? v.toFixed(0)
       : v.toFixed(1);
}

function fmtDuration(hours, t) {
  if (hours == null) return null;
  if (hours < 1) return `${Math.max(5, Math.round(hours * 60))} ${t('unitMin') || 'min'}`;
  return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)} ${t('unitHour') || 'h'}`;
}

// One short, fully-localized line of hard numbers. Every recommendation opens
// with this so the farmer sees the evidence, not just the verdict.
function factLine(s, t) {
  if (!s) return '';
  const unit = UNITS[s.key] || '';
  const parts = [`${t('recNow') || 'Now'} ${fmtVal(s.key, s.value)} ${unit}`];

  const limit = s.breachSide === 'low' ? (s.dangerLow != null ? s.dangerLow : s.warnLow)
              : s.breach === 'danger'  ? s.danger
              : (s.warn != null ? s.warn : s.danger);
  if (limit != null) parts.push(`${t('recLimit') || 'limit'} ${fmtVal(s.key, limit)}`);

  if (s.etaHours != null) {
    parts.push(`${t('recWithin') || 'within'} ${fmtDuration(s.etaHours, t)}`);
  } else if (s.direction === 'falling') {
    parts.push(t('recFalling') || 'falling');
  } else if (s.direction === 'rising') {
    parts.push(t('recRising') || 'rising');
  }
  return parts.join(' • ');
}

function body(fact, ...sentences) {
  return [fact, ...sentences.filter(Boolean)].filter(Boolean).join('\n');
}

// ── The air/heat decision ────────────────────────────────────────────
// CO₂ and NH₃ are one problem — stale air — and the only cure is ventilation.
// Ventilation also removes heat. Whether that is acceptable depends entirely
// on where the house sits against its age-appropriate target, so both are
// decided in a single place instead of by two rules that can disagree.
function airRecommendation(ctx, t) {
  const { sensors, tempGap, tempTarget, isBrooding, isNight, device } = ctx;
  const co2 = sensors.co2;
  const nh3 = sensors.nh3;

  // Whichever gas is further along decides the urgency and the numbers shown.
  const lead = [co2, nh3]
    .filter(Boolean)
    .sort((a, b) => (b.load || 0) - (a.load || 0))[0];
  if (!lead) return null;

  const breached = lead.breach;                    // 'warn' | 'danger' | null
  const approaching = !breached && (lead.load || 0) >= 0.75 && lead.direction === 'rising';
  if (!breached && !approaching) return null;

  // Already improving: the farmer is mid-fix. Confirm it rather than barking a
  // fresh order — the fastest way to make advice feel stupid is to tell someone
  // to do what they are visibly already doing.
  if (lead.direction === 'falling' && breached !== 'danger') {
    return {
      id: `air_improving_${device.id}`,
      icon: 'wind',
      severity: 'info',
      title: `${device.name} — ${t('recAirImprovingTitle') || 'Air is clearing'}`,
      body: body(factLine(lead, t), t('recAirImprovingBody')),
      deviceId: device.id, topicId: 'ventilation', sensorKey: lead.key,
    };
  }

  const severity = breached === 'danger' ? 'danger' : breached === 'warn' ? 'warn' : 'info';
  const tooCold = tempGap != null && tempGap <= -2;
  const tooHot = tempGap != null && tempGap >= 2;

  let title;
  let sentence;
  let note = null;

  if (tooCold) {
    // THE conflict case. Naming it is the whole point of this module.
    title = t('recAirColdTitle') || 'Bad air, but the house is too cold';
    sentence = (t('recAirColdBody') ||
      'Opening the vents now would chill the birds. Raise the heat to {target} °C first, then ventilate in short bursts of a few minutes.')
      .replace('{target}', tempTarget != null ? tempTarget.toFixed(1) : '—');
    note = t('recAirColdWhy') ||
      'Cold birds huddle, stop eating and fall sick — at this gas level that costs you more than the air does.';
  } else if (tooHot) {
    title = t('recAirHotTitle') || 'Ventilate — it fixes the air and the heat';
    sentence = t('recAirHotBody') ||
      'The house is above target as well, so opening up solves both at once. Vents fully open and fans running.';
  } else if (isBrooding) {
    title = t('recAirBroodTitle') || 'Clear the air without chilling the chicks';
    sentence = t('recAirBroodBody') ||
      'Chicks cannot take a draft. Ventilate at roof level only and keep the air still where the birds are.';
  } else {
    title = t('recAirTitle') || 'Increase ventilation';
    sentence = (t('recAirBody') ||
      'Open up step by step, and stop if the temperature falls more than 2 °C below the {target} °C target.')
      .replace('{target}', tempTarget != null ? tempTarget.toFixed(1) : '—');
  }

  // Ammonia is made by wet litter; ventilation alone never fixes it for long.
  if (nh3 && (nh3.breach || (nh3.load || 0) >= 0.75)) {
    note = [note, t('recNh3Litter') ||
      'Ammonia comes from wet litter — find the damp patch under the drinkers and replace it, or it is back tomorrow.']
      .filter(Boolean).join(' ');
  }
  if (isNight && !tooHot) {
    note = [note, t('recNightCare') ||
      'It is night and the outside air is cold, so ventilate in short bursts and watch the temperature.']
      .filter(Boolean).join(' ');
  }

  return {
    id: `air_${device.id}_${lead.key}`,
    icon: lead.key === 'nh3' ? 'alertTriangle' : 'wind',
    severity,
    title: `${device.name} — ${title}`,
    body: body(factLine(lead, t), sentence, note),
    deviceId: device.id, topicId: 'ventilation', sensorKey: lead.key,
  };
}

// ── Temperature against the age target ───────────────────────────────
// Raised only when the air rule has not already taken charge of the house, so
// the farmer never receives two instructions that pull in opposite directions.
function tempRecommendation(ctx, t, airTookOver) {
  const { sensors, tempGap, tempTarget, age, isBrooding, device } = ctx;
  const s = sensors.temp;
  if (!s || tempGap == null || tempTarget == null) return null;

  // Chicks tolerate far less drift than finished birds, so the bar for saying
  // anything moves with the age of the flock.
  const tolerance = isBrooding ? 1.5 : 3;
  if (Math.abs(tempGap) < tolerance) return null;
  if (airTookOver && tempGap < 0) return null;   // already covered, and agreeing

  const severe = Math.abs(tempGap) >= tolerance * 2;
  const cold = tempGap < 0;

  const fact = `${t('recNow') || 'Now'} ${s.value.toFixed(1)} °C • ` +
               `${t('recTarget') || 'target'} ${tempTarget.toFixed(1)} °C` +
               (age != null ? ` • ${t('day') || 'day'} ${age}` : '');

  let sentence;
  if (cold && isBrooding) {
    sentence = t('recTempColdChicks') ||
      'Chicks this young cannot warm themselves. Raise the brooder now, then look at where they sit — huddled under the lamp means it is still too cold.';
  } else if (cold) {
    sentence = t('recTempCold') ||
      'Raise the heat and close the drafts on the windward side. Check the heater is actually firing.';
  } else if (isBrooding) {
    sentence = t('recTempHotChicks') ||
      'Too warm. Lift the brooder or turn it down a step — chicks spread out against the walls when they are overheating.';
  } else {
    sentence = t('recTempHot') ||
      'Increase airflow, wet the roof in the afternoon, and keep cool drinking water within reach at all times.';
  }

  // A gap that is closing does not deserve the same urgency as one that is opening.
  const closing = (cold && s.direction === 'rising') || (!cold && s.direction === 'falling');
  const note = closing
    ? (t('recTempClosing') || 'It is moving back toward target — hold what you are doing.')
    : null;

  return {
    id: `temp_${device.id}`,
    icon: 'thermometer',
    severity: severe ? 'danger' : 'warn',
    title: `${device.name} — ${cold ? (t('recTempColdTitle') || 'Colder than this age needs')
                                    : (t('recTempHotTitle') || 'Warmer than this age needs')}`,
    body: body(fact, sentence, note),
    deviceId: device.id, topicId: 'temperature', sensorKey: 'temp', tool: 'brooder',
  };
}

// ── Heat stress (temperature and humidity together) ──────────────────
function heatStressRecommendation(ctx, t) {
  const { thi, sensors, device, hour, tempGap } = ctx;
  if (!thi || thi.tier === 'safe') return null;

  // THI's cutoffs are derived for market-weight birds. A chick's comfort zone
  // is far higher - a brooding house is SUPPOSED to sit near 31 °C - so scoring
  // one against the adult scale flags "heat stress" on a house that is actually
  // too cold, right beside a card telling the farmer to turn the heat up. Birds
  // below their own age target cannot be heat stressed, so the rule only speaks
  // once the house is genuinely above where it should be for this flock.
  // The margin applies at every age, not just to chicks: a day-12 house sits
  // near 29 °C by design and scores "danger" on the adult THI scale while being
  // exactly where it should be. Heat stress means the house is meaningfully
  // hotter than THIS flock needs - the THI tier then sets how urgent it is.
  const HEAT_MARGIN_C = 2;
  if (tempGap == null || tempGap < HEAT_MARGIN_C) return null;

  const temp = sensors.temp ? sensors.temp.value : null;
  const hum = sensors.hum ? sensors.hum.value : null;
  const fact = `THI ${thi.thi} • ${temp != null ? temp.toFixed(1) + ' °C' : '—'}` +
               `${hum != null ? ' • ' + hum.toFixed(0) + ' %' : ''}`;

  // Before noon there is still time to prepare; after it the damage is already
  // happening. Same reading, different correct action.
  const morning = hour < 12;
  let sentence;
  if (thi.tier === 'emergency') {
    sentence = t('recThiEmergency') ||
      'Birds die at this level. Fans to maximum, wet the roof, cool water in every drinker, and do not handle or move the flock until it drops.';
  } else if (thi.tier === 'danger') {
    sentence = t('recThiDanger') ||
      'Run every fan, wet the roof, and add electrolytes and vitamin C to the drinking water.';
  } else {
    sentence = morning
      ? (t('recThiAlertMorning') ||
         'It will be worse by the afternoon. Wet the roof and flush the water lines with cool water before midday.')
      : (t('recThiAlert') ||
         'Increase airflow and keep the drinking water cool. Feed at dusk instead of during the heat.');
  }

  return {
    id: `thi_${device.id}`,
    icon: 'sun',
    severity: thi.tier === 'emergency' ? 'danger' : thi.tier === 'danger' ? 'warn' : 'info',
    title: `${device.name} — ${t('insightHeatStress') || 'Heat stress risk'}`,
    body: body(fact, sentence),
    deviceId: device.id, topicId: 'summer', sensorKey: 'temp',
  };
}

// ── Humidity ─────────────────────────────────────────────────────────
function humidityRecommendation(ctx, t, airTookOver) {
  const { sensors, device, isBrooding } = ctx;
  const s = sensors.hum;
  if (!s || !s.breach) return null;
  if (airTookOver && s.breachSide === 'high') return null;   // ventilation covers it

  const sentence = s.breachSide === 'high'
    ? (t('recHumHigh') ||
       'Wet litter follows damp air, and ammonia follows wet litter. Look for leaking drinkers and ventilate to dry the bedding.')
    : isBrooding
      ? (t('recHumLowChicks') ||
         'Air this dry burns young airways and lifts dust. Damp the walkway or ease the heating down slightly.')
      : (t('recHumLow') ||
         'Very dry air raises dust and irritates the lungs. Damp the walkway lightly during the day.');

  return {
    id: `hum_${device.id}`,
    icon: 'droplet',
    severity: s.breach === 'danger' ? 'danger' : 'warn',
    title: `${device.name} — ${s.breachSide === 'high'
      ? (t('recHumHighTitle') || 'Air is too damp')
      : (t('recHumLowTitle') || 'Air is too dry')}`,
    body: body(factLine(s, t), sentence),
    deviceId: device.id, topicId: 'ventilation', sensorKey: 'hum',
  };
}

/**
 * Every recommendation for one coop, already de-conflicted and ordered by how
 * much it matters. Returns [] when the coop genuinely needs nothing — the
 * caller decides what to show in that case.
 */
export function deviceRecommendations(ctx, t) {
  if (!ctx || !ctx.hasData) return [];
  const out = [];

  const air = airRecommendation(ctx, t);
  if (air) out.push(air);
  // Once the air rule has issued a ventilation instruction it owns the house;
  // anything that would contradict it is suppressed rather than stacked on top.
  const airTookOver = !!air && air.severity !== 'info';

  const heat = heatStressRecommendation(ctx, t);
  if (heat) out.push(heat);

  // A heat-stress warning already tells the farmer the house is too hot and
  // what to do about it; repeating that as a second card is noise.
  const heatOwnsTemp = !!heat && heat.severity !== 'info';
  const temp = tempRecommendation(ctx, t, airTookOver);
  if (temp && !(heatOwnsTemp && temp.id.indexOf('temp_') === 0 && ctx.tempGap > 0)) out.push(temp);

  const hum = humidityRecommendation(ctx, t, airTookOver);
  if (hum) out.push(hum);

  const RANK = { danger: 0, warn: 1, info: 2, success: 3 };
  return out.sort((a, b) => (RANK[a.severity] != null ? RANK[a.severity] : 9)
                          - (RANK[b.severity] != null ? RANK[b.severity] : 9));
}

/**
 * What to say when nothing is wrong: the farm's actual position, in its own
 * numbers, instead of a rotating tip. A farmer who reads "day 14, 24.6 against
 * a 25 target, air at half the limit" learns something. One who reads "wash
 * your drinkers daily" for the fortieth time learns to ignore the app.
 */
export function statusSummary(ctx, t) {
  if (!ctx || !ctx.hasData) return null;
  const { sensors, tempTarget, age, device } = ctx;

  const bits = [];
  if (age != null) bits.push(`${t('day') || 'Day'} ${age}`);
  if (sensors.temp) {
    bits.push(`${sensors.temp.value.toFixed(1)} °C` +
      (tempTarget != null ? ` / ${tempTarget.toFixed(1)}` : ''));
  }
  if (sensors.co2) {
    bits.push(`CO₂ ${Math.round(sensors.co2.value)}` +
      (sensors.co2.warn ? ` / ${sensors.co2.warn}` : ''));
  }
  if (sensors.nh3) {
    bits.push(`NH₃ ${sensors.nh3.value.toFixed(0)}` +
      (sensors.nh3.warn ? ` / ${sensors.nh3.warn}` : ''));
  }

  // Temperature is deliberately absent: it is judged against the age target,
  // not the flat threshold, so "29.2 of 32" would read as nearly-too-hot on a
  // brooding house that is exactly where it should be. The line above already
  // shows it against its real target.
  const watch = ['co2', 'nh3', 'hum']
    .map((k) => sensors[k])
    .filter((s) => s && s.load != null)
    .sort((a, b) => b.load - a.load)[0];

  const tail = watch && watch.load >= 0.6
    ? (t('recWatchClosest') || 'Closest to its limit: {sensor}.')
        .replace('{sensor}', t(`${watch.key}Short`) || watch.key)
    : (t('recAllClear') || 'Everything is inside its safe range.');

  return {
    id: `ok_${device.id}`,
    icon: 'checkCircle',
    severity: 'success',
    title: `${device.name} — ${t('recStableTitle') || 'Nothing needs doing'}`,
    body: body(bits.join(' • '), tail),
    deviceId: device.id,
  };
}
