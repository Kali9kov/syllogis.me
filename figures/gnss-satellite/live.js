const D = __DATA__;
const stage = document.querySelector(".gs-stage");
const svg = stage.querySelector(".gs-back");
const rxPart = stage.querySelector('[data-part="receiver"]');
const pulse = stage.querySelector(".gs-pulse");
const RELAY = 1.4;
const PULSE_LEN = [0];
for (let i = 1; i < D.pulse.length; i++) PULSE_LEN.push(PULSE_LEN[i - 1] + Math.hypot(D.pulse[i][0] - D.pulse[i - 1][0], D.pulse[i][1] - D.pulse[i - 1][1]));
const pulseAt = (share) => {
  const want = share * PULSE_LEN[PULSE_LEN.length - 1];
  let i = 1;
  while (i < PULSE_LEN.length - 1 && PULSE_LEN[i] < want) i++;
  const t = (want - PULSE_LEN[i - 1]) / Math.max(1e-6, PULSE_LEN[i] - PULSE_LEN[i - 1]);
  return [D.pulse[i - 1][0] + (D.pulse[i][0] - D.pulse[i - 1][0]) * t, D.pulse[i - 1][1] + (D.pulse[i][1] - D.pulse[i - 1][1]) * t];
};
const readout = document.querySelector("[data-readout]");
const said = stage.querySelector(".gs-said");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const LIGHT = (stage.closest("[data-theme]")?.getAttribute("data-theme") ?? "dark") === "dark" ? 0 : 1;
const RAD = Math.PI / 180;
const STREAM = 120;
const UP_LEN = Math.hypot(D.sb[0] - D.feed[0], D.sb[1] - D.feed[1], D.sb[2] - D.feed[2]);
const freshOf = (ageH) => Math.exp(-ageH / 10);
const f3 = (v) => v.map((n) => n.toFixed(3)).join(",");

const FRAGMENT = `
uniform float uT;
uniform vec3 uNew;
uniform vec4 uRx;
uniform float uBand;
uniform vec4 uUp;
uniform float uFirst;
uniform float uLight;
const vec3 A=vec3(${f3(D.A)});
const vec3 E=vec3(${f3(D.earth)});
const float ZS=${D.zs.toFixed(2)};
const float MASK=${D.mask.toFixed(5)};
const float SPEED=${D.speed.toFixed(4)};
const float BIT=${D.bitShown.toFixed(4)};
const float BITU=${D.bitUnits.toFixed(4)};
const vec3 SB=vec3(${f3(D.sb)});
const vec3 FEED=vec3(${f3(D.feed)});
const float UPLEN=${UP_LEN.toFixed(3)};
const vec3 DARK_OLD=vec3(.36,.46,.62);
const vec3 DARK_NEW=vec3(.30,.78,1.);
const vec3 DARK_UP=vec3(1.,.6,.2);
const vec3 DARK_ERR=vec3(1.,.3,.26);
const vec3 INK_OLD=vec3(.44,.52,.62);
const vec3 INK_NEW=vec3(.05,.42,.80);
const vec3 INK_UP=vec3(.93,.49,.06);
const vec3 INK_ERR=vec3(.84,.18,.14);
float h1(float n){return hash12(vec2(n,17.31));}
// x: energy in old-data signal, y: energy in fresh-data signal
vec2 fanAt(vec2 q,float px){
  vec2 d=q-A.xy;float r=length(d);
  float c=d.x/max(r,1e-3);float s=d.y/max(r,1e-3);
  float soft=max(.012,1.4*px/max(r,1.));
  float ang=(1.-smoothstep(MASK-soft,MASK+soft*.3,abs(s)))*smoothstep(.2,.5,c);
  float Dd=E.x-A.x;float disc=E.z*E.z-Dd*Dd*s*s;
  float rho=disc>0.?Dd*c-sqrt(disc):1e4;
  float w=ang*(1.-smoothstep(rho-.9,rho+.3,r))*(1.-smoothstep(300.,345.,r))*smoothstep(1.,14.,r);
  if(w<.001)return vec2(0.);
  float spread=inversesqrt(max(r,48.)/48.);
  float tau=uT-r/SPEED;
  float bit=tau/BIT;float n=floor(bit);float f=bit-n;
  float b=step(.5,h1(n));float flip=abs(b-step(.5,h1(n-1.)));
  float edge=min(f,1.-f)*BITU;
  float front=exp(-edge*edge/(1.2+px*px))*(.32+.68*flip);
  float ep=fract(bit*20.);float ee=min(ep,1.-ep)*BITU/20.;
  float fine=smoothstep(3.,6.,BITU/20./px);
  float epoch=exp(-ee*ee/(.18+px*px*.6))*.3*fine;
  float e=w*spread*(.2+.12*b+1.3*front+epoch);
  float fr=mix(uNew.z,uNew.y,smoothstep(-.015,.015,tau-uNew.x));
  return vec2(e*(1.-fr),e*fr);
}
float bandAt(vec2 q){
  vec2 d=q-A.xy;float r=length(d);
  float phi=atan(d.y,d.x);
  float across=1.-smoothstep(.045,.07,abs(phi-uRx.w));
  return window(r,uRx.z-uBand,uRx.z+uBand,.7)*across;
}
vec2 upAt(vec2 vb,float px){
  vec2 pa=project(FEED);vec2 pb=project(SB);vec2 ab=pb-pa;
  float t=clamp(dot(vb-pa,ab)/dot(ab,ab),0.,1.);
  float dist=length(vb-pa-ab*t)/uK;
  float along=t*UPLEN;
  float env=window(along,uUp.y,uUp.x,2.5)*uUp.z;
  float core=exp(-dist*dist/(1.1+px*px));
  float ph=fract((along-uT*SPEED)/9.);
  float blob=exp(-pow((ph-.5)*9./1.7,2.));
  float hit=length(vb-pb)/uK;
  return vec2(core*(.35+.9*blob)*env,exp(-hit*hit/14.)*uUp.w);
}
vec4 inkOf(float e,vec3 colour,float cap){float a=cap*(1.-exp(-2.2*e));return vec4(colour*a,a);}
vec4 over(vec4 top,vec4 under){return top+under*(1.-top.a);}
void main(){
  vec2 vb=viewOf(gl_FragCoord.xy);
  float px=pixelOf();
  vec2 fan=fanAt(onFloor(vb,ZS).xy,px/uCam.z);
  float band=bandAt(onFloor(vb,ZS).xy)*1.3;
  vec2 up=upAt(vb,px);
  vec4 outc;
  if(uLight<.5){
    vec3 col=fan.x*DARK_OLD+fan.y*DARK_NEW+band*DARK_ERR+(up.x+up.y)*DARK_UP;
    col=tonemap(col,1.35);
    float m=max(col.r,max(col.g,col.b));
    outc=vec4(col,m);
  }else{
    vec4 ink=inkOf(fan.x,INK_OLD,.62);
    ink=over(inkOf(fan.y,INK_NEW,.85),ink);
    ink=over(inkOf(band,INK_ERR,.78),ink);
    ink=over(inkOf(up.x+up.y,INK_UP,.9),ink);
    outc=ink;
  }
  outc*=uFirst;
  outc.rgb=min(outc.rgb,vec3(outc.a));
  float n=(hash12(gl_FragCoord.xy+fract(uTime*.61)*91.)+hash12(gl_FragCoord.yx*1.37+fract(uTime*.37)*57.)-1.)/255.;
  outc=max(outc+n*smoothstep(0.,1.5/255.,outc.a),0.);
  gl_FragColor=outc;
}`;

const layer = glLayer({
  canvas: stage.querySelector(".gs-gl"),
  fragment: FRAGMENT,
  view: [D.W, D.H],
  camera: D.camera,
  uniforms: ["uT", "uNew", "uRx", "uBand", "uUp", "uFirst"],
  fixed: { uLight: LIGHT },
});
if (layer) stage.setAttribute("data-gl", "");

const rxAt = (elevDeg) => {
  const g = centralOf(elevDeg) * RAD;
  return [D.earth[0] - D.rxR * Math.cos(g), D.earth[1] + D.rxR * Math.sin(g)];
};

const S = {
  elev: 60,
  elevTarget: 60,
  t: 0,
  age: 6,
  ageOld: 6,
  phase: "day",
  relayAt: -1e9,
  upAt: -1e9,
  arriveAt: -1e9,
  split: -1e9,
  rxGotAt: -1e9,
  holdUntil: 0,
  band: { x: ureOf(6) * 10, v: 0 },
  up: { x: 0, v: 0 },
  first: { x: 0, v: 0 },
};
let touring = !still.matches;
let tourClock = 0;
let idleTimer = 0;
let frame = 0;
let last = 0;
let visible = false;
let lastSaid = "";

const announce = (text) => {
  if (text !== lastSaid) {
    lastSaid = text;
    said.textContent = text;
  }
};

function startUpload() {
  if (S.phase !== "day") return;
  S.phase = "relay";
  S.relayAt = S.t;
  S.ageOld = S.age;
  announce("Master control predicts a new orbit and clock correction");
}

function step(dt) {
  const calm = still.matches;
  S.t += dt;
  if (touring) {
    tourClock += dt;
    const stops = [60, 22, 82, 40];
    S.elevTarget = stops[Math.floor(tourClock / 3.6) % stops.length];
  }
  S.elev = calm ? S.elevTarget : S.elev + (S.elevTarget - S.elev) * (1 - Math.exp(-dt / 0.35));
  if (Math.abs(S.elev - S.elevTarget) < 0.01) S.elev = S.elevTarget;
  const rx = rxAt(S.elev);
  const rho = Math.hypot(rx[0] - D.A[0], rx[1] - D.A[1]);

  if (S.phase === "day") {
    S.age += HOURS_PER_S * dt;
    if (touring && S.age >= UPLOAD_EVERY_H) {
      S.age = UPLOAD_EVERY_H;
      startUpload();
    }
  }
  if (S.phase === "relay" && S.t - S.relayAt >= RELAY) {
    S.phase = "upload";
    S.upAt = S.t;
    announce("Uploading fresh corrections on S-band");
  }
  const share = (S.t - S.relayAt) / RELAY;
  if (share >= 0 && share <= 1.05) {
    const [px, py] = pulseAt(Math.min(1, share));
    pulse.setAttribute("cx", px.toFixed(1));
    pulse.setAttribute("cy", py.toFixed(1));
    pulse.style.opacity = (smooth(0, 0.08, share) * (1 - smooth(0.92, 1.05, share))).toFixed(3);
  } else if (pulse.style.opacity !== "0") pulse.style.opacity = "0";
  const head = (S.t - S.upAt) * D.speed;
  if (S.phase === "upload") {
    if (head >= UP_LEN && S.arriveAt < S.upAt) S.arriveAt = S.t;
    if (head - STREAM >= UP_LEN) {
      S.phase = "broadcast";
      S.split = S.t;
      S.age = 0;
      announce("Satellite broadcasting the new data on L1");
    }
  }
  if (S.phase === "broadcast" && (S.t - S.split) * D.speed >= rho) {
    S.phase = "updated";
    S.rxGotAt = S.t;
    S.holdUntil = S.t + 1.6;
    announce("Receiver has the new data; range error back to " + ureOf(0).toFixed(2) + " m");
  }
  if (S.phase === "updated" && S.t >= S.holdUntil) {
    S.phase = "day";
    S.ageOld = S.age;
  }
  const rxAge = S.phase === "relay" || S.phase === "upload" || S.phase === "broadcast" ? S.ageOld : S.age;
  settle(S.band, ureOf(rxAge) * 10, dt, 0.45, calm);
  settle(S.up, S.phase === "upload" || head - STREAM < UP_LEN + 20 ? (S.phase === "upload" ? 1 : 0) : 0, dt, 0.25, calm);
  settle(S.first, 1, dt, 0.5, calm);

  rxPart.setAttribute("transform", translateAlong(D.P, [rx[0], rx[1], 0]));
  const elevText = Math.round(S.elev);
  let text;
  if (S.phase === "relay") text = `monitor → master control · new orbit & clock`;
  else if (S.phase === "upload") text = `uploading · S-band ${S_UP_MHZ.toFixed(2)} MHz`;
  else if (S.phase === "broadcast") text = `new data on L1 · ${delayMs(S.elev).toFixed(1)} ms to receiver`;
  else if (S.phase === "updated") text = `receiver updated · URE ${ureOf(0).toFixed(2)} m`;
  else text = `elev ${elevText}° · ${delayMs(S.elev).toFixed(1)} ms · age ${Math.floor(S.age)} h · URE ${ureOf(S.age).toFixed(2)} m`;
  if (readout.textContent !== text) readout.textContent = text;

  if (layer) {
    const freshNew = freshOf(S.phase === "upload" || S.phase === "relay" ? S.ageOld : S.age);
    const freshOld = freshOf(S.ageOld);
    const tail = head - STREAM;
    layer.draw(
      {
        uT: S.t,
        uNew: [S.split, S.phase === "day" || S.phase === "relay" ? freshOf(S.phase === "day" ? S.age : S.ageOld) : freshNew, S.phase === "day" ? freshOf(S.age) : freshOld],
        uRx: [rx[0], rx[1], rho, Math.atan2(rx[1] - D.A[1], rx[0] - D.A[0])],
        uBand: S.band.x,
        uUp: [Math.min(head, UP_LEN + 40), tail, S.up.x, calm ? 0 : burst(S.t - S.arriveAt, 0.08, 0.5)],
        uFirst: S.first.x,
      },
      calm ? 0.8 : S.t,
    );
  }
}

const describe = () => {
  stage.setAttribute("aria-valuenow", String(Math.round(S.elevTarget)));
  stage.setAttribute("aria-valuetext", `Receiver at ${Math.round(S.elevTarget)} degrees elevation, ${fmt(rangeKm(S.elevTarget))} km from the satellite, ${delayMs(S.elevTarget).toFixed(1)} milliseconds of travel`);
};

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  step(still.matches ? 0 : dt);
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
const run = () => {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
};
const steer = (elev) => {
  touring = false;
  S.elevTarget = Math.max(5, Math.min(90, elev));
  describe();
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    touring = !still.matches;
    tourClock = 0;
    run();
  }, 3600);
  if (still.matches) step(0);
  run();
};

new IntersectionObserver(
  (entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
  },
  { rootMargin: "120px 0px" },
).observe(stage);
addEventListener("resize", () => step(0));

stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const box = svg.getBoundingClientRect();
  const share = Math.max(0, Math.min(1, ((event.clientX - box.left) / box.width - 0.15) / 0.7));
  steer(5 + share * 85);
});
stage.addEventListener("click", (event) => {
  if (event.pointerType === "touch") {
    const box = svg.getBoundingClientRect();
    steer(5 + Math.max(0, Math.min(1, ((event.clientX - box.left) / box.width - 0.15) / 0.7)) * 85);
  }
  steer(S.elevTarget);
  startUpload();
});
stage.addEventListener("keydown", (event) => {
  const big = event.shiftKey ? 15 : 5;
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = S.elevTarget + big;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = S.elevTarget - big;
  if (event.key === "Home") to = 90;
  if (event.key === "End") to = 5;
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    steer(S.elevTarget);
    startUpload();
    return;
  }
  if (to === null) return;
  event.preventDefault();
  steer(to);
});
stage.addEventListener("focus", () => {
  said.textContent = "";
  lastSaid = "";
  announce(`Receiver at ${Math.round(S.elevTarget)} degrees; data ${Math.floor(S.age)} hours old`);
});
if (still.matches) {
  S.first.x = 1;
  touring = false;
}
describe();
step(0);
