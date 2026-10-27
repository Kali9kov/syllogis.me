// GPS truth for the figure: one source for the drawing, the shader, the readout and the caption.

export const C_KM_S = 299792.458;
export const RE_KM = 6371;
export const ALT_KM = 20180;
export const RS_KM = RE_KM + ALT_KM;
export const F0_MHZ = 10.23;
export const L1_MHZ = 154 * F0_MHZ;
export const S_UP_MHZ = 1783.74;
export const CHIP_RATE = 1.023e6;
export const CODE_MS = 1023 / CHIP_RATE * 1000;
export const BIT_MS = 20;
export const SUBFRAME_S = 6;
export const MASK_DEG = (Math.asin(RE_KM / RS_KM) * 180) / Math.PI;

// Bench scale: the nadir path, 20,180 km, is drawn 240 units long.
export const NADIR_UNITS = 240;
export const UNITS_PER_KM = NADIR_UNITS / ALT_KM;
export const RE_UNITS = RE_KM * UNITS_PER_KM;
export const RS_UNITS = RS_KM * UNITS_PER_KM;

// The signal is shown slowed: one 20 ms nav bit takes BIT_SHOWN seconds to leave the antenna.
export const BIT_SHOWN = 0.8;
export const SLOW = BIT_SHOWN / (BIT_MS / 1000);
export const BIT_UNITS = C_KM_S * (BIT_MS / 1000) * UNITS_PER_KM;
export const SPEED = BIT_UNITS / BIT_SHOWN;

// Data age between uploads runs fast: HOURS_PER_S hours of age per second on screen.
export const HOURS_PER_S = 3;
export const UPLOAD_EVERY_H = 24;

const DEG = Math.PI / 180;

export const offNadirOf = (elevDeg) => Math.asin((RE_KM * Math.cos(elevDeg * DEG)) / RS_KM) / DEG;
export const centralOf = (elevDeg) => 90 - elevDeg - offNadirOf(elevDeg);
export const rangeKm = (elevDeg) => Math.sqrt(RS_KM ** 2 - (RE_KM * Math.cos(elevDeg * DEG)) ** 2) - RE_KM * Math.sin(elevDeg * DEG);
export const delayMs = (elevDeg) => (rangeKm(elevDeg) / C_KM_S) * 1000;

export function elevOfCentral(gammaDeg) {
  let lo = 0, hi = 90;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (centralOf(mid) > gammaDeg) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// Signal-in-space range error against age of the broadcast data: an illustrative fit to
// Block IIF behaviour, about 0.25 m just after an upload and under 0.8 m a day later.
export const ureOf = (ageH) => Math.hypot(0.25, 0.03 * ageH);

export const fmt = (value, digits = 0) => value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
