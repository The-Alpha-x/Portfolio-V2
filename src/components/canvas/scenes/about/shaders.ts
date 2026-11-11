/**
 * Corridor shaders. Everything is analytic: the red light strips are *lines* (xy position, running
 * along z), so walls/ribs are lit by distance to those lines — no scene lights, no env maps.
 * Corridor-local space: x ±3, y ±2, z from +10 (entrance) to −100 (end).
 */
const COMMON = /* glsl */ `
const vec3 CRIMSON = vec3(1.0, 0.0194, 0.0395);
const vec3 CRIMSON_DEEP = vec3(0.337, 0.0092, 0.0194);
const vec3 METAL = vec3(0.533, 0.485, 0.479);
const vec3 VOID = vec3(0.00244, 0.00244, 0.00273); // #080809 in linear space

float sq(float x){ return x * x; }
float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i), b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
// Light fixtures are segmented every 5 units; the gaps sit behind the structural ribs.
float dashMask(float z){
  float f = fract(z / 5.0);
  return smoothstep(0.04, 0.07, f) * (1.0 - smoothstep(0.93, 0.96, f));
}
float pulse(float z, float s, float t){ return 0.65 + 0.35 * sin(z * 0.21 - t * 0.8 + s * 1.7); }
`;

/* ───────────────────────────  walls + ribs  ─────────────────────────── */

export const surfaceVertex = /* glsl */ `
uniform float uFlip;
varying vec3 vLocal;
varying vec3 vN;
varying float vDepth;
void main(){
  vec4 lp = vec4(position, 1.0);
  vec3 nn = normal;
  #ifdef USE_INSTANCING
    lp = instanceMatrix * lp;
    nn = mat3(instanceMatrix) * nn; // axis-aligned boxes → direction preserved
  #endif
  vN = normalize(nn) * uFlip;
  vLocal = lp.xyz; // corridor-local (the meshes sit at the origin of the corridor group)
  vec4 mv = viewMatrix * modelMatrix * lp;
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

export const surfaceFragment = /* glsl */ `
precision highp float;
uniform float uTime, uFade, uExit, uRib, uStripI;
uniform vec3 uCam;          // camera position in corridor-local space
uniform vec2 uStrips[5];    // light strip positions (xy)
varying vec3 vLocal;
varying vec3 vN;
varying float vDepth;
${COMMON}

void main(){
  vec3 n = normalize(vN);
  vec3 V = normalize(uCam - vLocal);
  vec3 an = abs(n);

  // ── exit: the shell dissolves from the camera outward, leaving only the light path
  vec2 pf = vec2(vLocal.z * 0.35, vLocal.x + vLocal.y * 1.7);
  float fr = vDepth / 72.0 + (vnoise(pf) - 0.5) * 0.30;
  float df = uExit * 1.55 - 0.1 - fr;
  if (df > 0.0) discard;

  // ── panel layout (per face)
  vec2 p; vec2 cs;
  if (an.x > 0.5)      { p = vec2(vLocal.z, vLocal.y); cs = vec2(4.0, 1.0); }
  else if (an.y > 0.5) { p = vec2(vLocal.z, vLocal.x); cs = vec2(4.0, 2.0); }
  else                 { p = vec2(vLocal.x, vLocal.y); cs = vec2(1.5, 1.0); }
  vec2 id = floor(p / cs);
  vec2 f = fract(p / cs);
  vec2 de = min(f, 1.0 - f) * cs;
  float dEdge = min(de.x, de.y);
  float groove = 1.0 - smoothstep(0.0, 0.03, dEdge);
  float bevel = (1.0 - smoothstep(0.03, 0.10, dEdge)) * (1.0 - groove);
  float h = hash21(id + (an.x > 0.5 ? 1.0 : (an.y > 0.5 ? 2.0 : 3.0)));
  float brushed = vnoise(vec2(p.x * 0.5, p.y * 22.0));

  vec3 alb = mix(vec3(0.016, 0.017, 0.020), vec3(0.050, 0.051, 0.058), h * 0.6 + brushed * 0.4);
  alb *= 1.0 - groove * 0.85;
  alb = mix(alb, alb * 1.6 + 0.01, uRib); // ribs read as lighter machined metal
  vec2 q = (f - 0.5) * cs;
  float rivet = 1.0 - smoothstep(0.02, 0.05, length(abs(q) - (cs * 0.5 - 0.22)));
  alb += rivet * 0.03 * (1.0 - uRib);

  // ── lighting from the crimson strips
  vec3 lit = vec3(0.0);
  float spec = 0.0;
  for (int i = 0; i < 5; i++) {
    vec2 d2 = vLocal.xy - uStrips[i];
    float dist = length(d2) + 0.02;
    vec3 L = normalize(vec3(-d2, 0.0));
    float ndl = 0.35 + 0.65 * max(dot(n, L), 0.0); // grazing wrap so walls glow near their own strip
    float att = 1.0 / (1.0 + sq(dist * 0.75));
    float I = att * ndl * (0.7 + 0.3 * dashMask(vLocal.z)) * (0.85 + 0.15 * pulse(vLocal.z, float(i), uTime));
    lit += CRIMSON * I;
    vec3 H = normalize(L + V);
    spec += pow(max(dot(n, H), 0.0), 24.0) * att * (0.6 + 0.4 * brushed);
  }
  lit *= uStripI;
  spec *= uStripI;

  vec3 col = alb * lit * 3.0;
  col += CRIMSON * spec * 0.22 * (0.4 + bevel * 1.6);
  col += bevel * lit * 0.035;
  col += METAL * 0.0035 * (0.5 + 0.5 * h); // faint cold fill

  // polished floor: long streak reflections under every strip
  if (n.y > 0.5) {
    float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 2.5);
    for (int i = 0; i < 5; i++) {
      col += CRIMSON * exp(-sq((vLocal.x - uStrips[i].x) / 0.2))
           * (0.7 + 0.3 * dashMask(vLocal.z)) * fres * 0.25 * uStripI;
    }
  }

  // far end: a thin gate of light
  if (an.z > 0.5 && vLocal.z < -99.0) {
    float slit = exp(-sq(vLocal.x / 0.35)) * smoothstep(-2.0, -1.5, vLocal.y) * (1.0 - smoothstep(1.2, 1.9, vLocal.y));
    col += (CRIMSON * 0.9 + vec3(0.15, 0.06, 0.06)) * slit;
  }

  // dissolve edge
  col += CRIMSON * smoothstep(-0.12, 0.0, df) * 1.6 * smoothstep(0.0, 0.05, uExit);

  // atmosphere
  float fogF = 1.0 - exp(-sq(vDepth * 0.021));
  vec3 fogCol = VOID + CRIMSON_DEEP * 0.018 * (0.3 + fogF);
  col = mix(col, fogCol, fogF);
  col = mix(VOID, col, uFade);

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

/* ─────────────────────────────  light strips  ───────────────────────────── */

export const stripVertex = /* glsl */ `
uniform float uZ0;
varying vec2 vUv;
varying float vDepth;
varying float vZ;
void main(){
  vUv = uv;
  vZ = position.z + uZ0;
  vec4 mv = viewMatrix * modelMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

export const stripFragment = /* glsl */ `
precision highp float;
uniform float uTime, uIntensity, uSeed, uW;
varying vec2 vUv;
varying float vDepth;
varying float vZ;
${COMMON}
void main(){
  float d = abs(vUv.x - 0.5) * uW;
  float core = exp(-sq(d / 0.018));
  float halo = exp(-sq(d / 0.30)) * 0.22;
  float dm = dashMask(vZ);
  float near = smoothstep(0.7, 3.5, vDepth);
  float far = 1.0 - 0.5 * (1.0 - exp(-sq(vDepth * 0.012)));
  float a = (core * dm * 1.3 + halo * (0.55 + 0.45 * dm)) * pulse(vZ, uSeed, uTime) * near * far * uIntensity;
  vec3 c = CRIMSON * a + vec3(1.0, 0.5, 0.5) * core * dm * 0.18 * uIntensity * near;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}
`;

/* ──────────────────────────  volumetric haze slices  ────────────────────────── */

export const hazeVertex = /* glsl */ `
varying vec2 vUv;
varying vec2 vXY;
varying float vDepth;
void main(){
  vUv = uv;
  vXY = position.xy;
  vec4 mv = viewMatrix * modelMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

export const hazeFragment = /* glsl */ `
precision highp float;
uniform float uTime, uSeed, uIntensity;
uniform vec2 uStrips[5];
varying vec2 vUv;
varying vec2 vXY;
varying float vDepth;
${COMMON}
float fbm(vec2 p){
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 3; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; }
  return s;
}
void main(){
  vec2 q = vUv * vec2(3.0, 2.0) + uSeed * 10.0 + vec2(uTime * 0.03, -uTime * 0.02);
  float n = fbm(q);
  float edge = smoothstep(0.0, 0.35, vUv.x) * (1.0 - smoothstep(0.65, 1.0, vUv.x))
             * smoothstep(0.0, 0.30, vUv.y) * (1.0 - smoothstep(0.70, 1.0, vUv.y));
  float g = 0.0;
  for (int i = 0; i < 5; i++) g += exp(-sq(length(vXY - uStrips[i]) / 1.8));
  float a = smoothstep(0.38, 0.9, n) * edge * (0.03 + 0.10 * clamp(g, 0.0, 1.5));
  a *= smoothstep(1.5, 6.0, vDepth) * (1.0 - smoothstep(30.0, 70.0, vDepth)) * uIntensity;
  vec3 c = mix(METAL * 0.5, CRIMSON, clamp(g, 0.0, 1.0));
  gl_FragColor = vec4(c * a, 1.0);
  #include <colorspace_fragment>
}
`;

/* ───────────────────────────────  floating dust  ─────────────────────────────── */

export const dustVertex = /* glsl */ `
uniform float uTime, uPixelRatio, uSize;
uniform vec2 uStrips[5];
attribute vec3 aSeed;
varying float vAlpha;
varying float vMix;
void main(){
  vec3 p = position;
  p.y = mod(p.y + uTime * (0.02 + aSeed.x * 0.05) + 2.0, 4.0) - 2.0;
  p.x += sin(uTime * 0.15 + aSeed.y * 6.2831) * 0.18;
  p.z += cos(uTime * 0.12 + aSeed.z * 6.2831) * 0.25;

  float lightNear = 0.0;
  for (int i = 0; i < 5; i++) { float d = length(p.xy - uStrips[i]); lightNear += exp(-d * d / 1.4); }

  vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.0);
  float depth = -mv.z;
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (5.0 + aSeed.z * 14.0) * uSize * uPixelRatio / max(depth, 0.5);

  float tw = 0.5 + 0.5 * sin(uTime * (0.7 + aSeed.x * 1.8) + aSeed.y * 20.0);
  float fade = smoothstep(0.8, 4.0, depth) * (1.0 - smoothstep(25.0, 60.0, depth));
  vAlpha = (0.15 + 0.85 * tw) * (0.25 + clamp(lightNear, 0.0, 1.0) * 0.9) * fade;
  vMix = aSeed.z;
}
`;

export const dustFragment = /* glsl */ `
precision highp float;
uniform float uIntensity;
varying float vAlpha;
varying float vMix;
${COMMON}
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = 1.0 - smoothstep(0.0, 0.5, d);
  a *= a;
  vec3 c = mix(METAL, CRIMSON, step(0.6, vMix) * 0.9);
  gl_FragColor = vec4(c, a * vAlpha * uIntensity);
  #include <colorspace_fragment>
}
`;

/* ─────────────────  timeline nodes (HUD rings the corridor becomes)  ───────────────── */

export const ringVertex = /* glsl */ `
varying vec2 vP;
void main(){
  vP = position.xy;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}
`;

export const ringFragment = /* glsl */ `
precision highp float;
uniform float uTime, uIntensity, uSeed;
varying vec2 vP;
${COMMON}
void main(){
  float r = length(vP);
  float ang = atan(vP.y, vP.x);
  float ring = exp(-sq((r - 1.34) / 0.014));
  float halo = exp(-sq((r - 1.34) / 0.14)) * 0.25;
  float ticks = step(0.82, fract(ang * 24.0 / 6.28318 + 0.5)) * exp(-sq((r - 1.5) / 0.035));
  float arc = pow(0.5 + 0.5 * cos(ang - uTime * 0.6 - uSeed), 6.0);
  float v = ring * (0.5 + 0.9 * arc) + halo * 0.6 + ticks * 0.7;
  vec3 c = CRIMSON * v + vec3(1.0, 0.5, 0.5) * ring * arc * 0.2;
  gl_FragColor = vec4(c * uIntensity, 1.0);
  #include <colorspace_fragment>
}
`;
