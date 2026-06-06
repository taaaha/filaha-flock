import React from 'react';
import Svg, { Circle, Ellipse, Path, Polygon, G } from 'react-native-svg';
import { STATUS } from '../utils/colors';

/**
 * The Filaha chick — a little character that lives on every coop card and
 * changes its FACE with the coop's status. Personality is language-agnostic
 * (no copy to translate for ar/fr/en), which is exactly what a friendly,
 * human-designed farm app needs.
 *
 *   ok       → happy  (smiling eyes, rosy cheeks)
 *   warn     → worried (dot eyes, slanted brows)
 *   danger   → alarmed (wide eyes, open beak)
 *   powerCut → alarmed
 *   offline  → sleepy  (closed eyes)
 *
 * Body colors are fixed warm/cream so the chick always reads clearly on top of
 * any status wash, in both light and dark themes. Only the expression encodes
 * the status — the card's background wash carries the color.
 */

// Fixed, always-readable palette for the character itself.
const BODY = '#fff7ec';
const OUTLINE = '#e6d6ba';
const COMB = '#d9594a';
const BEAK = '#f0a13c';
const EYE = '#3a2c1a';
const CHEEK = '#f3a896';

function bucketOf(status) {
  if (status === STATUS.OK) return 'happy';
  if (status === STATUS.WARN) return 'worried';
  if (status === STATUS.OFFLINE) return 'sleepy';
  // danger + powerCut + anything else
  return 'alarmed';
}

export default function CoopMascot({ status = STATUS.OFFLINE, size = 56 }) {
  const bucket = bucketOf(status);

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {/* Comb — three little bumps */}
      <G>
        <Circle cx="25" cy="13" r="5" fill={COMB} />
        <Circle cx="32" cy="9" r="5.5" fill={COMB} />
        <Circle cx="39" cy="13" r="5" fill={COMB} />
      </G>

      {/* Body */}
      <Ellipse cx="32" cy="40" rx="22" ry="20" fill={BODY} stroke={OUTLINE} strokeWidth="2" />

      {/* Wings — a soft tuck on each side */}
      <Path d="M14 40 q5 5 10 2" fill="none" stroke={OUTLINE} strokeWidth="2" strokeLinecap="round" />
      <Path d="M50 40 q-5 5 -10 2" fill="none" stroke={OUTLINE} strokeWidth="2" strokeLinecap="round" />

      {/* Beak — open when alarmed, closed otherwise */}
      {bucket === 'alarmed' ? (
        <Polygon points="28,43 36,43 32,52" fill={BEAK} />
      ) : (
        <Polygon points="28,43 36,43 32,49" fill={BEAK} />
      )}

      {/* Face per status */}
      {bucket === 'happy' && (
        <G>
          <Circle cx="20" cy="42" r="4" fill={CHEEK} opacity="0.6" />
          <Circle cx="44" cy="42" r="4" fill={CHEEK} opacity="0.6" />
          <Path d="M19 35 Q24 40 29 35" fill="none" stroke={EYE} strokeWidth="2.6" strokeLinecap="round" />
          <Path d="M35 35 Q40 40 45 35" fill="none" stroke={EYE} strokeWidth="2.6" strokeLinecap="round" />
        </G>
      )}

      {bucket === 'worried' && (
        <G>
          <Circle cx="24" cy="37" r="2.6" fill={EYE} />
          <Circle cx="40" cy="37" r="2.6" fill={EYE} />
          <Path d="M19 30 L28 33" fill="none" stroke={EYE} strokeWidth="2.4" strokeLinecap="round" />
          <Path d="M45 30 L36 33" fill="none" stroke={EYE} strokeWidth="2.4" strokeLinecap="round" />
        </G>
      )}

      {bucket === 'alarmed' && (
        <G>
          <Circle cx="24" cy="36" r="4" fill="#fff" stroke={EYE} strokeWidth="1.6" />
          <Circle cx="40" cy="36" r="4" fill="#fff" stroke={EYE} strokeWidth="1.6" />
          <Circle cx="24" cy="36" r="2" fill={EYE} />
          <Circle cx="40" cy="36" r="2" fill={EYE} />
          {/* worried brows */}
          <Path d="M18 29 L27 32" fill="none" stroke={EYE} strokeWidth="2.4" strokeLinecap="round" />
          <Path d="M46 29 L37 32" fill="none" stroke={EYE} strokeWidth="2.4" strokeLinecap="round" />
        </G>
      )}

      {bucket === 'sleepy' && (
        <G>
          <Path d="M20 37 L29 37" fill="none" stroke={EYE} strokeWidth="2.6" strokeLinecap="round" />
          <Path d="M35 37 L44 37" fill="none" stroke={EYE} strokeWidth="2.6" strokeLinecap="round" />
        </G>
      )}
    </Svg>
  );
}
