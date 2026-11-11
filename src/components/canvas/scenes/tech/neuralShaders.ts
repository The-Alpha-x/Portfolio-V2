/**
 * Scene 05 shaders. three r171 compiles ShaderMaterial as GLSL ES 3.00 (WebGL2), so `texelFetch` is available and
 * `attribute`/`varying` are mapped by three's prefix. All outputs end with colorspace_fragment (no tone mapping → no dimming).
 */

/** Merged circuit traces. Per-edge state (grow, lit) comes from a 1-row RGBA8 data texture written by NeuralSim. */
export const PATH_VERT = /* glsl */ `
attribute float aS;
attribute float aTot;
attribute float aEdge;
attribute float aKind;
uniform sampler2D uState;
varying float vS;
varying float vTot;
varying float vEdge;
varying float vKind;
varying float vGrow;
varying float vLit;
void main() {
  vec4 st = texelFetch(uState, ivec2(int(aEdge + 0.5), 0), 0);
  vGrow = st.r;
  vLit = st.g;
  vS = aS; vTot = aTot; vEdge = aEdge; vKind = aKind;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const PATH_FRAG = /* glsl */ `
uniform float uTime;
uniform float uPulse;
uniform float uFinal;
uniform vec3 uColor;
uniform vec3 uHot;
varying float vS;
varying float vTot;
varying float vEdge;
varying float vKind;
varying float vGrow;
varying float vLit;
float hash(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
void main() {
  float grow = vGrow;
  if (grow < 0.004) discard;
  float t = clamp(vS / max(vTot, 0.0001), 0.0, 1.0);
  float done = step(0.992, grow);
  // draw-on: everything behind the growth front is visible, with a bright head just behind it
  float m = mix(1.0 - smoothstep(grow - 0.05, grow, t), 1.0, done);
  float head = (1.0 - done) * smoothstep(grow - 0.09, grow - 0.005, t) * m;

  float isRel = step(0.5, vKind) * (1.0 - step(1.5, vKind));
  float isDecor = step(1.5, vKind) * (1.0 - step(2.5, vKind));
  float isStem = step(2.5, vKind);

  float base = mix(0.20, 0.55, uFinal);
  base = mix(base, mix(0.06, 0.15, uFinal), isDecor);
  base = mix(base, 0.0, isRel);
  base = mix(base, 0.42 + 0.2 * uFinal, isStem);

  float lit = vLit;
  float speed = mix(0.55, 1.15, isRel);
  float flow = fract(vS * 0.23 - uTime * speed + hash(vEdge));
  float packet = exp(-flow * 11.0) * smoothstep(0.0, 0.012, flow);
  float amt = uPulse * (1.0 - isStem) * mix(0.5 + 0.35 * uFinal + 0.9 * lit, 0.18, isDecor);
  amt = mix(amt, 1.2 * lit, isRel);

  float b = base + lit * 0.9 + packet * amt * 0.95 + head;
  float hotMix = clamp(lit * 0.9 + packet * amt * 0.7 + head, 0.0, 1.0);
  vec3 col = mix(uColor, uHot, hotMix);
  float a = clamp(b, 0.0, 1.5) * m;
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`;

/** Soft round glow sprites for nodes (instead of post-process bloom). Size in scene units, attenuated by distance. */
export const HALO_VERT = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
uniform float uScale;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vAlpha = aAlpha; vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = clamp(aSize * uScale / max(-mv.z, 0.1), 0.0, 72.0);
  gl_Position = projectionMatrix * mv;
}`;
export const HALO_FRAG = /* glsl */ `
varying float vAlpha;
varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float g = pow(clamp(1.0 - d, 0.0, 1.0), 2.4);
  gl_FragColor = vec4(vColor, g * vAlpha);
  #include <colorspace_fragment>
}`;

/** Slow drifting dust. Motion is computed here, so the CPU does nothing per frame. */
export const DUST_VERT = /* glsl */ `
attribute float aSeed;
uniform float uTime;
uniform float uScale;
uniform float uMotion;
varying float vSeed;
void main() {
  vSeed = aSeed;
  vec3 p = position;
  float t = uTime * uMotion;
  p += vec3(sin(t * 0.11 + aSeed * 6.283), cos(t * 0.13 + aSeed * 9.1), sin(t * 0.09 + aSeed * 3.7)) * 0.55;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = clamp((0.05 + aSeed * 0.07) * uScale / max(-mv.z, 0.1), 1.0, 12.0);
  gl_Position = projectionMatrix * mv;
}`;
export const DUST_FRAG = /* glsl */ `
uniform float uAlpha;
uniform vec3 uColor;
uniform vec3 uWhite;
varying float vSeed;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float g = clamp(1.0 - d, 0.0, 1.0);
  vec3 col = mix(uColor, uWhite, step(0.88, vSeed));
  gl_FragColor = vec4(col, g * g * uAlpha);
  #include <colorspace_fragment>
}`;
