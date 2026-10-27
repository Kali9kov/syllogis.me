import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../.claude/skills/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../.claude/skills/anatomy/kit/tube.mjs";
import { glCamera } from "../../.claude/skills/anatomy/kit/gl.mjs";
import { kitScript, glScript } from "../../.claude/skills/anatomy/scripts/inline-kit.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--dark") ? "dark" : "light";
const DEG = Math.PI / 180;

const W = 760;
const H = 480;
const AZIMUTH = 40;

// World: x runs from the satellite toward Earth, y across, z up. Units: 240 = 20,180 km.
const ZS = 58;
const BUS = { x: -162, y: -30, w: 70, d: 60, r: 1.5 };
const BUS_Z = [24, 92];
const DECK = BUS.x + BUS.w;
const GP_T = 1.5;
const HELIX_L = 12.5;
const A = [DECK + GP_T + HELIX_L, 0, ZS];
const EARTH = [A[0] + M.RS_UNITS, 0];
const RE = M.RE_UNITS;
const TOP = 46;
const RX_R = RE - 6.5;
const BASE = { x: -200, y: -92, w: 528, d: 184, r: 10 };
const BASE_H = 12;
const FOOT_H = 5;
const SADA_X = -134;
const BETA = 32 * DEG;
const WING = { inner: [50, 92], outer: [94, 136], half: 28 };
const PED = [-127, 0];

const DISH_AT = [EARTH[0] - 44 * Math.cos(30 * DEG), -44 * Math.sin(30 * DEG)];
const MON = [EARTH[0] - RX_R * Math.cos(60 * DEG), -RX_R * Math.sin(60 * DEG)];
const MCS = { x: EARTH[0] - 6, y: -48, w: 18, d: 14, r: 1.2 };
const MCS_H = 9;
const AXLE = [DISH_AT[0], DISH_AT[1], 79];
const SB = [DECK - 10, -20, 84];

const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [SADA_X - 15, 136, ZS + 24],
    [SADA_X + 15, 136, ZS - 24],
    [SADA_X - 15, -136, ZS + 24],
    [SADA_X + 15, -136, ZS - 24],
    [BUS.x, BUS.y, BUS_Z[1] + 4],
    [AXLE[0], AXLE[1], AXLE[2] + 16],
  ],
  W,
  H,
  { pad: 26, azimuth: AZIMUTH },
);

const V = G.viewOf(P);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const path = (points, closed = false) => k.pathOf(points.map(at), closed);
const depth = (point) => G.dot3(point, V);
const byDepth = (list) => [...list].sort((a, b) => a.key - b.key);
const quad = (points, shade) => `<path class="iso-shade" data-shade="${shade}" d="${path(points, true)}"/>`;
const topQuad = (points) => `<path class="iso-top" d="${path(points, true)}"/>`;
const X = [1, 0, 0];
const Y = [0, 1, 0];
const Z = [0, 0, 1];
const along = (o, a, u, v) => G.frameOf(o, a, u, v);

// ---------- base plate ----------
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P)}"/>`];
  const feet = [...k.corners(BASE, 24), [BASE.x + BASE.w / 2, BASE.y + 24], [BASE.x + BASE.w / 2, BASE.y + BASE.d - 24]];
  for (const [x, y] of [...feet].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))) {
    out.push(S(k.cylinder(x, y, 8, -BASE_H - FOOT_H, 1.6, P, 32), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 6.2, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 32), { tone: "mid" }));
  }
  out.push(S(k.slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.6), { tone: "mid", inner: Ln(k.sideSeam(BASE, -4, P, 8), { tone: "faint" }) }));
  out.push(Ln(k.planOutline(k.insetPlan(BASE, 6), 0, P), { tone: "lo" }));
  const screws = k.corners(BASE, 12);
  out.push(Ln(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 18)).join(""), { tone: "lo" }));
  out.push(Dots(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));

  // Range ruler: from the antenna to the sub-satellite point, a minor tick every 500 km.
  const step = 500 * M.UNITS_PER_KM;
  const strip = { x: A[0] - 6, y: BASE.y + BASE.d - 18, w: M.NADIR_UNITS + 12, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(A[0], A[0] + M.NADIR_UNITS, step, 10, strip.y + 0.8, 0.6, [2, 3.8], P);
  out.push(Ln(ticks.minor, { tone: "lo" }), Ln(ticks.major, { tone: "mid" }));
  out.push(Ln(k.lineOnTop([A[0], strip.y + 0.8], [A[0], strip.y + 5.6], 0.6, P), { tone: "hi" }));
  out.push(Ln(k.lineOnTop([A[0] + M.NADIR_UNITS, strip.y + 0.8], [A[0] + M.NADIR_UNITS, strip.y + 5.6], 0.6, P), { tone: "hi" }));
  out.push(Dots([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));

  // Label plate with the one engraved label.
  const plate = { x: -138, y: BASE.y + BASE.d - 26, w: 46, d: 16, r: 1.2 };
  out.push(S(k.slabOf(plate, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(Ln(k.planOutline(k.insetPlan(plate, 1.6), 0.8, P, 4), { tone: "faint" }));
  out.push(k.faceTextSvg(k.topMatrix([plate.x + 5, plate.y + 6.2], 0.8, P, "x"), "GPS IIF", { size: 3.4, tone: "mid" }));
  for (const [x0, x1, y] of [[plate.x + 5, plate.x + 37, plate.y + 9.4], [plate.x + 5, plate.x + 30, plate.y + 11.6], [plate.x + 5, plate.x + 22, plate.y + 13.6]]) {
    out.push(Ln(k.lineOnTop([x0, y], [x1, y], 0.8, P), { tone: "lo", free: true }));
  }
  out.push(Dots([at([plate.x + 2.4, plate.y + 2.4, 0.8]), at([plate.x + plate.w - 2.4, plate.y + plate.d - 2.4, 0.8])], { size: 0.45 }));
  return out.join("");
}

// ---------- Earth, a turned plinth drawn to scale ----------
function earth() {
  const [ex, ey] = EARTH;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: ex - RE, y: ey - RE, w: RE * 2, d: RE * 2, r: RE }, 0, 4, P)}" style="opacity:.5"/>`];
  out.push(S(k.cylinder(ex, ey, RE + 4, 0, 3, P, 160, 0.6), { tone: "lo" }));
  const bolts = [];
  for (let i = 0; i < 36; i++) {
    const t = (i / 36) * Math.PI * 2;
    const facing = Math.cos(t) * k.towardViewer(P)[0] + Math.sin(t) * k.towardViewer(P)[1];
    const alpha = G.fadeOf(facing, [-0.05, 0.4]);
    if (alpha > 0.02) {
      const [x, y] = at([ex + (RE + 2) * Math.cos(t), ey + (RE + 2) * Math.sin(t), 3]);
      bolts.push([x, y, alpha]);
    }
  }
  out.push(Dots(bolts, { size: 0.5, tone: "mid" }));
  const seams = [12, 24, 36].map((z) => k.sideArc(ex, ey, RE, z, P, 128)).join("");
  out.push(S(k.cylinder(ex, ey, RE, 3, TOP - 3, P, 160, 1.2), { tone: "mid", inner: Ln(seams, { tone: "faint" }) }));
  out.push(Ln(k.ring(ex, ey, RE - 4, TOP, P, 160), { tone: "lo" }));
  out.push(Ln(k.ring(ex, ey, RE - 5.4, TOP, P, 160), { tone: "faint" }));
  out.push(Ln(k.ring(ex, ey, 34, TOP, P, 128), { tone: "faint" }));
  out.push(S(k.cylinder(ex, ey, 10, TOP, 2, P, 64, 0.5), { tone: "mid" }));
  out.push(Ln(k.ring(ex, ey, 6.5, TOP + 2, P, 48), { tone: "faint" }));
  out.push(Dots([0, 1, 2, 3, 4, 5].map((i) => at([ex + 8.2 * Math.cos((i * Math.PI) / 3), ey + 8.2 * Math.sin((i * Math.PI) / 3), TOP + 2])), { size: 0.45 }));
  out.push(Dots([at([ex, ey, TOP + 2])], { size: 0.6, tone: "hi" }));
  return out.join("");
}

// ---------- the satellite ----------
const wingFrame = () => along([SADA_X, 0, ZS], [Math.cos(BETA), 0, Math.sin(BETA)], Y, [-Math.sin(BETA), 0, Math.cos(BETA)]);
const wingPoint = (F, s, u, v) => G.add3(G.add3(F.o, G.mul3(F.a, s)), G.add3(G.mul3(F.u, u), G.mul3(F.v, v)));

function panel(F, y0, y1) {
  const h = WING.half;
  const out = [S(G.prismOf(F, [[y0, -h], [y1, -h], [y1, h], [y0, h]], -0.7, 0.7, P), { tone: "hi", crease: "lo" })];
  const cells = [];
  for (let i = 1; i < 8; i++) {
    const v = -h + (i * 2 * h) / 8;
    cells.push(path([wingPoint(F, 0.7, y0, v), wingPoint(F, 0.7, y1, v)]));
  }
  for (let j = 1; j < 6; j++) {
    const u = y0 + ((y1 - y0) * j) / 6;
    cells.push(path([wingPoint(F, 0.7, u, -h), wingPoint(F, 0.7, u, h)]));
  }
  out.push(Ln(cells.join(""), { tone: "faint" }));
  out.push(Ln(path([wingPoint(F, 0.7, y0, 0), wingPoint(F, 0.7, y1, 0)]), { tone: "lo" }));
  return out.join("");
}

function wing(sign) {
  const F = wingFrame();
  const out = [];
  const hub = [SADA_X, sign * 44.6, ZS];
  const struts = [-18, 18].map((v) => {
    const end = wingPoint(F, 0, sign * WING.inner[0], v);
    const dir = G.unit3(G.sub3(end, hub));
    const len = G.len3(G.sub3(end, hub));
    return { key: depth(G.lerp3(hub, end, 0.5)), svg: S(G.solidOf([[2.4, 0.9], [len, 0.9]], G.frameAlong(hub, dir), P), { tone: "mid" }) };
  });
  const cross = (() => {
    const a = wingPoint(F, 0, sign * (WING.inner[0] - 4), -18);
    const b = wingPoint(F, 0, sign * (WING.inner[0] - 4), 18);
    return S(G.solidOf([[0, 0.7], [G.len3(G.sub3(b, a)), 0.7]], G.frameAlong(a, G.unit3(G.sub3(b, a))), P), { tone: "mid" });
  })();
  const ball = S(G.sphereOf(hub, 2.8, P), { tone: "mid" });
  const panels = [panel(F, sign * WING.inner[0], sign * WING.inner[1]), panel(F, sign * WING.outer[0], sign * WING.outer[1])];
  const hinges = [-20, 20].map((v) => S(G.prismOf(F, [[sign * (WING.inner[1] - 1.6), v - 2.2], [sign * (WING.outer[0] + 1.6), v - 2.2], [sign * (WING.outer[0] + 1.6), v + 2.2], [sign * (WING.inner[1] - 1.6), v + 2.2]], -1.1, 1.1, P), { tone: "mid" }));
  if (sign > 0) out.push(ball, ...byDepth(struts).map((s) => s.svg), cross, ...panels, ...hinges);
  else out.push(...panels, ...hinges, cross, ...byDepth(struts).map((s) => s.svg), ball);
  return out.join("");
}

function pedestal() {
  const [px, py] = PED;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: px - 22, y: py - 22, w: 44, d: 44, r: 4 }, 0, 4, P)}"/>`];
  const foot = { x: px - 21, y: py - 21, w: 42, d: 42, r: 3 };
  out.push(S(k.slabOf(foot, 0, 5, P, 4, 0.6), { tone: "mid" }));
  const screws = k.corners(foot, 5);
  out.push(Ln(screws.map(([x, y]) => k.ring(x, y, 1.8, 5, P, 14)).join(""), { tone: "lo" }));
  out.push(Dots(screws.map(([x, y]) => at([x, y, 5])), { size: 0.45 }));
  out.push(S(k.cylinder(px, py, 10, 5, 2.4, P, 48, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(px, py, 7, 7.4, 10.6, P, 48), { tone: "mid", crease: "none", inner: Ln(k.sideArc(px, py, 7, 12.4, P, 24), { tone: "faint" }) }));
  const head = { x: px - 19, y: py - 19, w: 38, d: 38, r: 2 };
  out.push(S(k.slabOf(head, 18, 6, P, 4, 0.6), { tone: "mid" }));
  out.push(Dots(k.corners(head, 4).map(([x, y]) => at([x, y, 24])), { size: 0.45 }));
  return out.join("");
}

function bus() {
  const [z0, z1] = BUS_Z;
  const out = [];
  const seam = Ln(k.sideSeam(BUS, z1 - 6, P, 8) + k.sideSeam(BUS, z0 + 6, P, 8), { tone: "faint" });
  out.push(S(k.slabOf(BUS, z0, z1 - z0, P, 8, 0.8), { tone: "hi", crease: "lo", inner: seam }));
  // deck (Earth-facing) panel border
  out.push(Ln(path([[DECK, -26, z0 + 9], [DECK, 26, z0 + 9], [DECK, 26, z1 - 9], [DECK, -26, z1 - 9]], true), { tone: "faint" }));
  // top: OSR radiator with tiles, thruster pods
  const osr = { x: BUS.x + 6, y: BUS.y + 6, w: 40, d: 48, r: 1 };
  out.push(S(k.slabOf(osr, z1, 0.6, P, 3), { tone: "mid", crease: "none" }));
  const tiles = [];
  for (let i = 1; i < 8; i++) tiles.push(k.lineOnTop([osr.x + (osr.w * i) / 8, osr.y], [osr.x + (osr.w * i) / 8, osr.y + osr.d], z1 + 0.6, P));
  for (let j = 1; j < 10; j++) tiles.push(k.lineOnTop([osr.x, osr.y + (osr.d * j) / 10], [osr.x + osr.w, osr.y + (osr.d * j) / 10], z1 + 0.6, P));
  out.push(Ln(tiles.join(""), { tone: "faint" }));
  const pods = [[DECK - 8, BUS.y + 8], [DECK - 8, BUS.y + BUS.d - 8], [DECK - 20, 0]].map(([x, y]) => ({ key: k.depthOf([x, y, z1], P), x, y }));
  for (const { x, y } of byDepth(pods)) {
    const plan = { x: x - 3.4, y: y - 3.4, w: 6.8, d: 6.8, r: 1 };
    out.push(S(k.slabOf(plan, z1, 2.6, P, 3, 0.4), { tone: "mid" }));
    out.push(S(k.cylinder(x, y, 1.7, z1 + 2.6, 2.2, P, 20), { tone: "mid" }));
    out.push(Ln(k.ring(x, y, 1, z1 + 4.8, P, 16), { tone: "lo" }));
  }
  return out.join("");
}

function clockBay() {
  const x0 = -125, x1 = -98, zA = 31, zB = 57, face = BUS.y + BUS.d, back = face - 12;
  const opening = path([[x0, face, zA], [x1, face, zA], [x1, face, zB], [x0, face, zB]], true);
  const inside = [];
  inside.push(quad([[x0, back, zA], [x1, back, zA], [x1, back, zB], [x0, back, zB]], 0));
  inside.push(quad([[x0, back, zA], [x0, face, zA], [x0, face, zB], [x0, back, zB]], 1));
  inside.push(topQuad([[x0, back, zA], [x1, back, zA], [x1, face, zA], [x0, face, zA]]));
  inside.push(Ln(path([[x0, back, zA], [x1, back, zA]]) + path([[x0, back, zA], [x0, back, zB]]) + path([[x0, back, zA], [x0, face, zA]]), { tone: "faint" }));
  // two rubidium clocks on cradles, end plates facing +x
  for (const zc of [38, 50.5]) {
    const F = along([x0 + 3, face - 6.5, zc], X, Y, Z);
    inside.push(S(k.slabOf({ x: x0 + 4, y: face - 10, w: 3, d: 7, r: 0.6 }, zc - 5.6, 1.6, P, 2), { tone: "lo" }));
    inside.push(S(k.slabOf({ x: x1 - 7, y: face - 10, w: 3, d: 7, r: 0.6 }, zc - 5.6, 1.6, P, 2), { tone: "lo" }));
    inside.push(S(G.disc(0, 20, 4.6, F, P), { tone: "hi", crease: "lo", inner: Ln(G.arcOf(F, 3, 4.6, P) + G.arcOf(F, 17, 4.6, P), { tone: "faint" }) }));
    inside.push(Ln(G.circleOf(F, 20, 2.6, P), { tone: "lo" }));
    inside.push(Dots([at(G.pointOf(F, 20, 0, 0))], { size: 0.8, tone: "hi" }));
  }
  const id = "gs-bay";
  return `<clipPath id="${id}"><path d="${opening}"/></clipPath><g clip-path="url(#${id})">${inside.join("")}</g>${Ln(opening, { tone: "lo" })}${Dots(
    [[x0 - 2, zA - 2], [x1 + 2, zA - 2], [x1 + 2, zB + 2], [x0 - 2, zB + 2]].map(([x, z]) => at([x, face, z])),
    { size: 0.45 },
  )}`;
}

function sideFace() {
  const face = BUS.y + BUS.d;
  const out = [clockBay()];
  // OSR radiator panel on +y face
  const rad = { x: -159, y: face, w: 17, d: 0.6, r: 0 };
  out.push(S(k.slabOf(rad, 30, 56, P, 2), { tone: "mid", crease: "none" }));
  const tiles = [];
  for (let i = 1; i < 4; i++) tiles.push(path([[rad.x + (rad.w * i) / 4, face + 0.6, 30], [rad.x + (rad.w * i) / 4, face + 0.6, 86]]));
  for (let j = 1; j < 10; j++) tiles.push(path([[rad.x, face + 0.6, 30 + (56 * j) / 10], [rad.x + rad.w, face + 0.6, 30 + (56 * j) / 10]]));
  out.push(Ln(tiles.join(""), { tone: "faint" }));
  // solar array drive
  const F = along([SADA_X, face, ZS], Y, X, Z);
  out.push(S(G.disc(0, 2, 7.6, F, P), { tone: "mid" }));
  out.push(Dots(G.dotsOf(F, 2, 6.4, 8, P, { all: true }), { size: 0.45 }));
  out.push(S(G.disc(2, 9, 5.4, F, P), { tone: "mid", inner: Ln(G.arcOf(F, 5.5, 5.4, P), { tone: "faint" }) }));
  out.push(S(G.disc(9, 12.4, 2.6, F, P), { tone: "hi" }));
  return out.join("");
}

function helix([y, z]) {
  const F = along([DECK + GP_T, y, z], X, Y, Z);
  const tip = DECK + GP_T + HELIX_L;
  const c = k.coil(DECK + GP_T + 1.6, tip - 1, [y, z], 2.3, 4.5, "x", P, 20);
  return [
    S(G.disc(0, 1.6, 2.9, F, P), { tone: "mid" }),
    Ln(c.back, { tone: "lo" }),
    S(G.disc(1.6, HELIX_L - 0.6, 0.9, F, P), { tone: "mid", crease: "none" }),
    Ln(c.front, { tone: "hi" }),
    S(G.disc(HELIX_L - 0.6, HELIX_L, 2.6, F, P), { tone: "hi" }),
  ].join("");
}

function deck() {
  const items = [];
  const F = along([DECK, 0, ZS], X, Y, Z);
  items.push({ key: -1e6, svg: S(G.disc(0, GP_T, 22, F, P), { tone: "mid" }) + Dots(G.dotsOf(F, GP_T, 20.4, 24, P, { all: true }), { size: 0.4, tone: "lo" }) });
  const spots = [];
  for (let i = 0; i < 4; i++) spots.push([7 * Math.cos((45 + 90 * i) * DEG), ZS + 7 * Math.sin((45 + 90 * i) * DEG)]);
  for (let i = 0; i < 8; i++) spots.push([15.5 * Math.cos((22.5 + 45 * i) * DEG), ZS + 15.5 * Math.sin((22.5 + 45 * i) * DEG)]);
  for (const spot of spots) items.push({ key: depth([DECK, spot[0], spot[1]]), svg: helix(spot) });
  // S-band TT&C horn (the uplink lands here)
  const FS = along([DECK, SB[1], SB[2]], X, Y, Z);
  items.push({
    key: depth([DECK, SB[1], SB[2]]),
    svg: S(G.disc(0, 1.2, 4.6, FS, P), { tone: "mid" }) + Dots(G.dotsOf(FS, 1.2, 3.8, 6, P, { all: true }), { size: 0.4 }) + S(G.solidOf([[1.2, 2.2], [3, 2.2], [9.6, 4.2], [10, 4.2]], FS, P), { tone: "hi", crease: "lo" }) + Ln(G.circleOf(FS, 10, 3.2, P), { tone: "lo" }),
  });
  // laser retro-reflector array
  const lra = { x: DECK, y: 12, w: 2.4, d: 16, r: 0.5 };
  const cubes = [];
  for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) cubes.push(at([DECK + 2.4, lra.y + 2 + i * 3, 80 + 2 + j * 3]));
  items.push({ key: depth([DECK, 20, 86]), svg: S(k.slabOf(lra, 80, 10, P, 2, 0.3), { tone: "mid" }) + Dots(cubes, { size: 0.75, tone: "mid" }) });
  // Earth sensors
  for (const y of [-21, 21]) {
    const Fe = along([DECK, y, 33], X, Y, Z);
    items.push({ key: depth([DECK, y, 33]), svg: S(k.slabOf({ x: DECK, y: y - 4, w: 3, d: 8, r: 0.8 }, 29, 8, P, 2, 0.3), { tone: "mid" }) + S(G.disc(3, 4.4, 2.2, Fe, P), { tone: "hi" }) + Ln(G.circleOf(Fe, 4.4, 1.2, P), { tone: "lo" }) });
  }
  return byDepth(items).map((item) => item.svg).join("");
}

function satellite() {
  return [wing(-1), pedestal(), bus(), sideFace(), deck(), wing(1)].join("");
}

// ---------- ground antenna (uplink) ----------
const DISH = (() => {
  const a = G.unit3(G.sub3(SB, AXLE));
  const e = G.unit3(G.cross3(a, Z));
  const hub = G.add3(AXLE, G.mul3(a, 4));
  const F = G.frameAlong(hub, a);
  return { a, e, hub, F, feed: G.pointOf(F, 15.5, 0, 0) };
})();

function dish() {
  const [dx, dy] = DISH_AT;
  const { a, e, F } = DISH;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: dx - 10, y: dy - 10, w: 20, d: 20, r: 10 }, TOP, 2, P)}" style="opacity:.6"/>`];
  out.push(S(k.cylinder(dx, dy, 9.5, TOP, 1.6, P, 48, 0.4), { tone: "lo" }));
  out.push(Dots([0, 1, 2, 3].map((i) => at([dx + 7.6 * Math.cos(((i + 0.5) * Math.PI) / 2), dy + 7.6 * Math.sin(((i + 0.5) * Math.PI) / 2), TOP + 1.6])), { size: 0.45 }));
  out.push(S(k.cylinder(dx, dy, 4.4, TOP + 1.6, 15, P, 32), { tone: "mid", crease: "none", inner: Ln(k.sideArc(dx, dy, 4.4, TOP + 9, P, 20), { tone: "faint" }) }));
  out.push(S(k.cylinder(dx, dy, 6.6, TOP + 16.6, 3.6, P, 40, 0.4), { tone: "mid" }));
  out.push(Ln(k.knurl(dx, dy, 6.6, TOP + 16.6, TOP + 20.2, 40, P), { tone: "lo" }));
  const yz = TOP + 20.2;
  const arm = (side) => {
    const p = G.add3(AXLE, G.mul3(e, side * 9.5));
    return { key: depth(p), svg: S(k.slabOf({ x: p[0] - 1.6, y: p[1] - 1.6, w: 3.2, d: 3.2, r: 0.8 }, yz + 1.6, AXLE[2] + 2.4 - yz - 1.6, P, 2, 0.3), { tone: "mid" }) };
  };
  out.push(S(k.slabOf({ x: dx - 2.2, y: dy - 11.1, w: 4.4, d: 22.2, r: 1 }, yz, 1.6, P, 3, 0.3), { tone: "mid" }));
  const arms = byDepth([arm(-1), arm(1)]);
  out.push(arms[0].svg);
  // feed on three struts, then the bowl seen from behind
  const rim = [90, 210, 330].map((t) => G.pointOf(F, 5.6, 14.6, t * DEG));
  const tipAt = [90, 210, 330].map((t) => G.pointOf(F, 13, 1.4, t * DEG));
  out.push(Ln(rim.map((p, i) => path([p, tipAt[i]])).join(""), { tone: "lo" }));
  out.push(S(G.disc(12.5, 15.5, 1.9, F, P), { tone: "mid" }));
  out.push(S(G.solidOf([[0, 3.6], [0.7, 5.6, 1], [1.9, 9, 1], [3.5, 12.4, 1], [5, 14.6, 1], [5.6, 15.2]], F, P), { tone: "mid", crease: "lo", inner: Ln(G.arcOf(F, 1.9, 9, P, { slope: 2.6 }) + G.arcOf(F, 3.5, 12.4, P, { slope: 1.8 }), { tone: "faint" }) }));
  out.push(S(G.disc(-4, 0.2, 3.4, F, P), { tone: "mid" }));
  out.push(Ln(G.circleOf(F, -4, 1.6, P), { tone: "lo" }));
  const axle = G.frameAlong(G.sub3(AXLE, G.mul3(e, 11.4)), e);
  out.push(S(G.disc(0, 22.8, 1.3, axle, P), { tone: "mid", crease: "none" }));
  out.push(arms[1].svg);
  for (const side of [-1, 1]) {
    const Fc = G.frameAlong(G.add3(AXLE, G.mul3(e, side * 11.2)), G.mul3(e, side));
    out.push(S(G.disc(0, 1.4, 2.3, Fc, P), { tone: "mid" }));
  }
  void a;
  return out.join("");
}

// ---------- ground segment: monitor station, master control, cables to the dish ----------
function chokeRing(cx, cy, z, { lit = false } = {}) {
  const out = [];
  out.push(S(k.cylinder(cx, cy, 10, z, 1.2, P, 72), { tone: "mid" }));
  out.push(S(k.cylinder(cx, cy, 10, z + 1.2, 2.4, P, 72, 0.4), { tone: "hi", crease: "lo" }));
  out.push(Ln(k.ring(cx, cy, 8.2, z + 3.6, P, 64) + k.ring(cx, cy, 6.4, z + 3.6, P, 56), { tone: "lo" }));
  out.push(Ln(k.ring(cx, cy, 4.6, z + 3.6, P, 48), { tone: "faint" }));
  const F = along([cx, cy, z + 3.6], Z, X, Y);
  out.push(S(G.solidOf([[0, 3.6], [0.9, 3.5, 1], [1.9, 3.0, 1], [2.7, 2.1, 1], [3.2, 1.1, 1], [3.4, 0]], F, P), { tone: "hi", lit }));
  return out.join("");
}

function monitor() {
  const [mx, my] = MON;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: mx - 6, y: my - 6, w: 12, d: 12, r: 6 }, TOP, 2, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.cylinder(mx, my, 5.6, TOP, 1.4, P, 40, 0.3), { tone: "lo" }));
  out.push(S(k.cylinder(mx, my, 4.4, TOP + 1.4, 6.4, P, 40), { tone: "mid", inner: Ln(k.sideArc(mx, my, 4.4, TOP + 4.6, P, 24), { tone: "faint" }) }));
  out.push(S(k.cylinder(mx, my, 5.2, TOP + 7.8, 1, P, 40, 0.3), { tone: "mid" }));
  out.push(S(k.cylinder(mx, my, 1.6, TOP + 8.8, 1.6, P, 20), { tone: "mid", crease: "none" }));
  out.push(chokeRing(mx, my, TOP + 10.4));
  return out.join("");
}

function console_() {
  const z = TOP;
  const out = [`<path class="iso-halo" d="${k.haloOf(MCS, z, 2, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.slabOf(MCS, z, MCS_H, P, 4, 0.6), { tone: "mid", inner: Ln(k.sideSeam(MCS, z + 2, P, 4), { tone: "faint" }) }));
  const vents = [0, 1, 2, 3].map((i) => k.planOutline({ x: MCS.x + 3, y: MCS.y + 3 + i * 2.4, w: 9, d: 1, r: 0.5 }, z + MCS_H, P, 2)).join("");
  out.push(Ln(vents, { tone: "lo" }));
  out.push(Dots([at([MCS.x + MCS.w - 3, MCS.y + 3, z + MCS_H]), at([MCS.x + MCS.w - 3, MCS.y + MCS.d - 3, z + MCS_H])], { size: 0.45 }));
  const fx = MCS.x + MCS.w;
  out.push(Ln(path([[fx, MCS.y + 2.6, z + 3.6], [fx, MCS.y + 9, z + 3.6], [fx, MCS.y + 9, z + 7.4], [fx, MCS.y + 2.6, z + 7.4]], true), { tone: "lo" }));
  out.push(Dots([at([fx, MCS.y + 11, z + 6.6]), at([fx, MCS.y + 12.2, z + 6.6])], { size: 0.55, tone: "hi" }));
  return out.join("");
}

const CABLE_Z = TOP + 0.7;
const CABLES = [
  [[MON[0] + 4.4, MON[1], CABLE_Z], [MON[0] + 12, MON[1], CABLE_Z], [MON[0] + 18, MCS.y + 5, CABLE_Z], [MCS.x + 0.5, MCS.y + 5, CABLE_Z]],
  [[MCS.x + 0.5, MCS.y + 10, CABLE_Z], [DISH_AT[0] + 16, MCS.y + 10, CABLE_Z], [DISH_AT[0] + 16, DISH_AT[1], CABLE_Z], [DISH_AT[0] + 9.4, DISH_AT[1], CABLE_Z]],
].map((points) => G.fillet(points, 3.2, 7));

function cables() {
  return CABLES.map((route) => tubePieces(route, 0.7, P, { maxLength: 400 }).map((piece) => tubeSvg(piece, { tone: "mid" })).join("")).join("") + `<circle class="gs-pulse" r="1.6" cx="0" cy="0" style="opacity:0"/>`;
}

const PULSE = (() => {
  const points = [...CABLES[0], ...CABLES[1]].map((p) => at(p).map((n) => Math.round(n * 10) / 10));
  return points;
})();

// ---------- receiver: a geodetic choke-ring antenna on an edge carriage ----------
function receiver() {
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: -7, y: -7, w: 14, d: 14, r: 7 }, TOP, 2, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.cylinder(0, 0, 6.8, TOP, 3, P, 48, 0.4), { tone: "mid" }));
  out.push(Ln(k.knurl(0, 0, 6.8, TOP, TOP + 3, 48, P), { tone: "lo" }));
  const screws = [90, 210, 330].map((t) => ({ x: 4.6 * Math.cos(t * DEG), y: 4.6 * Math.sin(t * DEG) }));
  for (const s of screws.sort((p, q) => k.depthOf([p.x, p.y, 0], P) - k.depthOf([q.x, q.y, 0], P))) {
    out.push(S(k.cylinder(s.x, s.y, 1.4, TOP + 3, 2, P, 16), { tone: "mid" }));
    out.push(Ln(k.knurl(s.x, s.y, 1.4, TOP + 3, TOP + 5, 10, P, 0.2), { tone: "lo" }));
  }
  out.push(S(k.cylinder(0, 0, 5.8, TOP + 5, 1.2, P, 40, 0.3), { tone: "mid" }));
  out.push(S(k.cylinder(0, 0, 1.6, TOP + 6.2, 2.2, P, 20), { tone: "mid", crease: "none" }));
  out.push(chokeRing(0, 0, TOP + 8.4, { lit: true }));
  return out.join("");
}

// ---------- fallback (no WebGL): the fronts as lines ----------
const MASK = Math.asin(RE / M.RS_UNITS);
const earthHit = (phi) => {
  const D = M.RS_UNITS;
  const disc = RE * RE - D * D * Math.sin(phi) ** 2;
  return disc > 0 ? D * Math.cos(phi) - Math.sqrt(disc) : Infinity;
};
function fallback() {
  const fronts = [];
  for (let r = 40; r < 320; r += M.BIT_UNITS) {
    const pts = [];
    for (let i = 0; i <= 48; i++) {
      const phi = -MASK + (2 * MASK * i) / 48;
      if (r > earthHit(phi)) {
        if (pts.length > 1) fronts.push(k.pathOf(pts));
        pts.length = 0;
        continue;
      }
      pts.push(at([A[0] + r * Math.cos(phi), A[1] + r * Math.sin(phi), ZS]));
    }
    if (pts.length > 1) fronts.push(k.pathOf(pts));
  }
  const rays = [-MASK, MASK].map((phi) => k.pathOf([at(A), at([A[0] + earthHit(phi * 0.999) * Math.cos(phi), earthHit(phi * 0.999) * Math.sin(phi), ZS])]));
  return `<g class="gs-fallback">${Ln(fronts.join(""), { tone: "blue", free: true })}${Ln(rays.join(""), { tone: "faint" })}${Ln(path([DISH.feed, SB]), { tone: "faint", dotted: true })}</g>`;
}

const back = [base(), earth(), cables(), console_(), fallback(), satellite()];
const rxRest = [EARTH[0] - RX_R, 0];
const front = [monitor(), dish(), `<g data-part="receiver" transform="${k.translateAlong(P, [rxRest[0], rxRest[1], 0])}">${receiver()}</g>`];

const DATA = {
  W,
  H,
  P,
  camera: glCamera(P),
  A,
  zs: ZS,
  earth: [EARTH[0], EARTH[1], RE],
  rxR: RX_R,
  mask: Math.sin(MASK),
  sb: SB,
  feed: DISH.feed,
  speed: M.SPEED,
  bitShown: M.BIT_SHOWN,
  bitUnits: M.BIT_UNITS,
  unitsPerKm: M.UNITS_PER_KM,
  pulse: PULSE,
};

const LABEL =
  "A GPS Block IIF satellite on a test bench, its Earth-facing deck of twelve helical antennas pointed at a turned plinth that stands for the Earth, drawn to the same scale as the 20,180 km path between them. A ground antenna on the plinth sends corrections up to the satellite's S-band horn; through a cutaway in the satellite's side you see its two rubidium clocks. A fan of L1 signal leaves the helix array and spreads to the Earth's edge, carrying 50-bit-per-second navigation data; a choke-ring receiver rides the plinth's rim and reads the range, the signal's travel time and the range error that the corrections shrink.";

const backSvg = k.figureSvg({ width: W, height: H, label: LABEL, body: back, className: "gs-back" });
const frontSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg gs-layer gs-front" viewBox="0 0 ${W} ${H}" aria-hidden="true">${front.join("")}</svg>`;
const stage = `<div class="gs-stage" tabindex="0" role="slider" aria-label="GPS satellite. Move the pointer left and right, or use the arrow keys, to move the receiver from the horizon to overhead; press Space, Enter or click to send an upload of fresh corrections." aria-valuemin="5" aria-valuemax="90" aria-valuenow="60"><span class="gs-said" aria-live="polite"></span>${backSvg}<canvas class="gs-layer gs-gl" aria-hidden="true"></canvas>${frontSvg}</div>`;

const e60 = 60;
const caption = `A GPS satellite keeps time with rubidium clocks and broadcasts it. Its clocks drive a ${M.F0_MHZ} MHz reference, and ${M.L1_MHZ.toFixed(2)} MHz L1 is 154 times that. On L1 it sends a 1,023-chip code that repeats every millisecond, and over the code a 50 bit/s navigation message. Part of that message is the satellite's own position (ephemeris) and how far its clock is off (clock correction), and both come up from the ground. Monitor stations watch every satellite, the master station predicts its orbit and clock, and a ground antenna uploads the prediction on S-band (${M.S_UP_MHZ} MHz), about once a day. The satellite cannot fix itself: it can only pass the new numbers on. A receiver uses them to turn travel time into range. From ${M.fmt(M.ALT_KM)} km up the Earth fills ±${M.MASK_DEG.toFixed(1)}° of the sky, so a signal takes ${M.delayMs(90).toFixed(1)} ms to reach the point directly below and ${M.delayMs(0).toFixed(1)} ms to reach the horizon. At ${e60}° elevation it takes ${M.delayMs(e60).toFixed(1)} ms. That is 3–4 navigation bits in flight, and each bit is ${M.fmt(M.BIT_UNITS / M.UNITS_PER_KM)} km long. The older the uploaded prediction gets, the larger the range error (red band, 1 m drawn as 10 units, an illustrative fit of about 0.25 m when fresh and 0.76 m a day later). Here the signal moves ${M.SLOW}× slower than light, and the hours between uploads pass ${M.fmt(M.HOURS_PER_S * 3600)}× faster.`;

const CSS = readFileSync(join(HERE, "gnss.css"), "utf8");
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const MODEL = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

const body = `<div class="gs">${k.plateHtml({
  fig: "Fig 1",
  title: "GPS satellite",
  hint: "Move across for elevation · click to upload",
  readout: `elev 60° · ${M.delayMs(60).toFixed(1)} ms · age 0 h · URE 0.25 m`,
  keys: [
    { mark: "lit", label: "Choke-ring receiver on the Earth's rim" },
    { mark: "blue", label: "L1 signal: code epochs, nav-bit fronts, fresh data brighter" },
    { mark: "raised", label: "Satellite, ground antenna and the Earth to scale" },
    { mark: "red", label: "Range error at the receiver" },
  ],
  caption,
  body: stage,
})}</div>`;

const name = theme === "dark" ? "gnss-satellite-dark.html" : "gnss-satellite.html";
const page = k.pageHtml({ title: "GPS satellite", theme, body: `<style>${CSS}</style>${body}`, script: kitScript() + glScript() + MODEL + LIVE, width: 820 });
writeFileSync(join(HERE, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`);
