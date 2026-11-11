/** Linear-space brand colours (the renderer converts to sRGB at the end). */
const COMMON = /* glsl */ `
const vec3 CRIMSON = vec3(1.0, 0.0194, 0.0395);
const vec3 CRIMSON_DEEP = vec3(0.337, 0.0092, 0.0194);
const vec3 METAL = vec3(0.533, 0.485, 0.479);

float sq(float x){ return x * x; }
float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i), b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
// Shared by the portrait AND the dissolve particles so they stay in sync.
// Low value = dissolves first. Machine side (right) goes first.
float dissolveField(vec2 uv){
  float n = vnoise(uv * vec2(6.0, 8.0)) * 0.55 + vnoise(uv * vec2(22.0, 30.0)) * 0.15;
  return n * 0.9 + (1.0 - uv.x) * 0.37;
}
`;

export const planeVertex = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/** The portrait. Two instances (human half / machine half) share this shader. */
export const portraitFragment = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
uniform float uSide, uSeam, uOverlap;
uniform float uReveal, uScan, uScanAmp, uExit, uTime, uAspect;
uniform vec2 uEyeUv;
varying vec2 vUv;
${COMMON}
void main(){
  if (uSide < 0.5) { if (vUv.x > uSeam + uOverlap) discard; }
  else             { if (vUv.x < uSeam) discard; }

  vec3 col = texture2D(uTex, vUv).rgb;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));

  // 1. Light spreads outward from the cybernetic eye
  vec2 d = (vUv - uEyeUv) * vec2(uAspect, 1.0);
  float r = uReveal * 1.9 - length(d) * 0.95;
  float vis = smoothstep(0.0, 0.6, r);
  float flick = 1.0 + (vnoise(vec2(uTime * 9.0, vUv.y * 4.0)) - 0.5) * 0.35 * (1.0 - uReveal);
  col *= vis * flick;

  // 2. Red scan band across the face (highlights features by luminance)
  float y = 1.0 - vUv.y;
  float sy = mix(0.14, 0.70, uScan);
  float env = sin(3.14159265 * clamp(uScan, 0.0, 1.0)) * uScanAmp;
  float fx = smoothstep(0.12, 0.30, vUv.x) * (1.0 - smoothstep(0.78, 0.95, vUv.x));
  float band = exp(-sq((y - sy) / 0.045));
  float line = exp(-sq((y - sy) / 0.004));
  col += CRIMSON * (band * (0.10 + lum * 1.1) + line * 0.55) * env * fx * vis;

  // 3. Exit: noise dissolve with a hot crimson edge
  float df = uExit * 1.3 - dissolveField(vUv);
  float present = 1.0 - smoothstep(0.0, 0.03, df);
  float edge = smoothstep(-0.14, 0.0, df) * (1.0 - smoothstep(0.0, 0.03, df)) * smoothstep(0.0, 0.05, uExit);
  col += CRIMSON * edge * (0.7 + lum) * 1.4;

  // Soft rectangular vignette so the plane melts into the page background
  float m = smoothstep(0.0, 0.12, vUv.x) * (1.0 - smoothstep(0.88, 1.0, vUv.x))
          * smoothstep(0.0, 0.20, vUv.y) * (1.0 - smoothstep(0.92, 1.0, vUv.y));

  gl_FragColor = vec4(col, m * present * smoothstep(0.0, 0.05, vis));
  #include <colorspace_fragment>
}
`;

/** Additive glow quad for the cybernetic eye: hot core, halo, anamorphic streak. */
export const eyeFragment = /* glsl */ `
precision highp float;
uniform float uIntensity;
varying vec2 vUv;
${COMMON}
void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  float r2 = dot(p, p);
  float core = exp(-r2 * 40.0);
  float halo = exp(-r2 * 5.5) * 0.5;
  float streak = exp(-sq(p.y / 0.05)) * exp(-sq(p.x / 0.85)) * 0.45;
  // The quad is a square: fade everything to zero before its edges so no hard rectangle / cut-off streak is ever visible.
  float fade = (1.0 - smoothstep(0.55, 1.0, abs(p.x))) * (1.0 - smoothstep(0.55, 1.0, abs(p.y)));
  vec3 c = (CRIMSON * (core * 1.6 + halo + streak) + vec3(1.0, 0.45, 0.45) * core * 0.45) * fade;
  gl_FragColor = vec4(c * uIntensity, 1.0);
  #include <colorspace_fragment>
}
`;

/** The thin luminous seam between human and machine. */
export const seamFragment = /* glsl */ `
precision highp float;
uniform float uIntensity;
varying vec2 vUv;
${COMMON}
void main(){
  float across = exp(-sq((vUv.x - 0.5) / 0.12));
  float along = smoothstep(0.0, 0.12, vUv.y) * (1.0 - smoothstep(0.82, 1.0, vUv.y));
  gl_FragColor = vec4(CRIMSON * across * along * uIntensity, 1.0);
  #include <colorspace_fragment>
}
`;

/** Ambient dust drifting through the scene at several depths. */
export const dustVertex = /* glsl */ `
uniform float uTime, uPixelRatio, uExit, uSize;
uniform vec2 uMouse, uBox;
attribute vec3 aSeed;
varying float vAlpha;
varying float vMix;
void main(){
  vec3 p = position;
  float speed = (0.05 + aSeed.x * 0.12) * (1.0 + uExit * 5.0);
  p.y = mod(p.y + uTime * speed + uBox.y * 0.5, uBox.y) - uBox.y * 0.5;
  p.x += sin(uTime * 0.25 + aSeed.y * 6.2831) * 0.12;
  p.z += cos(uTime * 0.20 + aSeed.z * 6.2831) * 0.10;
  p.xy += uMouse * (0.02 + (p.z + 1.2) * 0.04);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (6.0 + aSeed.z * 18.0) * uSize * uPixelRatio / -mv.z;
  float tw = 0.5 + 0.5 * sin(uTime * (0.8 + aSeed.x * 2.0) + aSeed.y * 20.0);
  vAlpha = (0.25 + 0.75 * tw) * (0.35 + aSeed.y * 0.65);
  vMix = aSeed.z;
}
`;

export const dustFragment = /* glsl */ `
precision highp float;
uniform float uOpacity;
varying float vAlpha;
varying float vMix;
${COMMON}
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = 1.0 - smoothstep(0.0, 0.5, d);
  a *= a;
  vec3 c = mix(METAL, CRIMSON, step(0.55, vMix) * 0.9);
  gl_FragColor = vec4(c, a * vAlpha * uOpacity);
  #include <colorspace_fragment>
}
`;

/** The portrait turning into particles. Each particle samples its own colour from the image. */
export const burstVertex = /* glsl */ `
uniform sampler2D uTex;
uniform float uTime, uPixelRatio, uExit, uSize;
uniform vec2 uPlane;
attribute vec2 aUv;
attribute vec3 aRand;
varying float vAlpha;
varying vec3 vColor;
${COMMON}
void main(){
  float t = clamp((uExit * 1.3 - dissolveField(aUv)) / 0.30, 0.0, 1.0);
  vec3 base = vec3((aUv - 0.5) * uPlane, 0.0);
  vec3 dir = normalize(vec3((aRand.x - 0.35) * 1.4, aRand.y * 0.9 + 0.15, (aRand.z - 0.15) * 1.6));
  float travel = t * t * (0.9 + aRand.z * 2.4);
  vec3 p = base + dir * travel;
  p.xy += vec2(sin(uTime * 1.3 + aRand.y * 6.28), cos(uTime * 1.1 + aRand.x * 6.28)) * 0.06 * t;

  vec3 tex = texture2D(uTex, aUv).rgb;
  vColor = mix(tex * 1.6, CRIMSON, 0.35 + t * 0.55);
  vAlpha = step(0.0001, t) * smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.5, 1.0, t));

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (4.0 + aRand.x * 10.0) * uSize * uPixelRatio * (1.0 - t * 0.5) / -mv.z;
}
`;

export const burstFragment = /* glsl */ `
precision highp float;
varying float vAlpha;
varying vec3 vColor;
${COMMON}
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = 1.0 - smoothstep(0.1, 0.5, d);
  gl_FragColor = vec4(vColor, a * vAlpha);
  #include <colorspace_fragment>
}
`;
