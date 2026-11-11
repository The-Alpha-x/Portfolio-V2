/** Scene 06 shaders. The portrait is the SAME artwork as Scene 01, graded softer. planeVertex / eyeFragment are reused from Scene 01. */
export { planeVertex, eyeFragment } from "../hero/shaders";

const C = /* glsl */ `
const vec3 CRIMSON = vec3(1.0, 0.0194, 0.0395);
const vec3 CRIMSON_DEEP = vec3(0.337, 0.0092, 0.0194);
const vec3 METAL = vec3(0.533, 0.485, 0.479);
float sq(float x){ return x * x; }
`;

/** Whole portrait on one plane. Light spreads out from the cybernetic eye (uReveal), shadows are lifted toward a dim crimson. */
export const portraitFragment = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
uniform float uReveal, uTime, uAspect;
uniform vec2 uEyeUv;
varying vec2 vUv;
${C}
void main(){
  vec3 col = texture2D(uTex, vUv).rgb;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));

  vec2 d = (vUv - uEyeUv) * vec2(uAspect, 1.0);
  float r = uReveal * 1.9 - length(d) * 0.95;
  float vis = smoothstep(0.0, 0.6, r);

  // softer red: calmer highlights, shadows lifted toward deep crimson, slow breathing
  float breathe = 0.95 + 0.05 * sin(uTime * 0.8);
  col = col * 0.9 * breathe + CRIMSON_DEEP * 0.16 * (1.0 - lum);
  col *= vis;

  // melt into the page: stronger on the text side (left), soft on the other edges
  float m = smoothstep(0.0, 0.26, vUv.x) * (1.0 - smoothstep(0.88, 1.0, vUv.x))
          * smoothstep(0.0, 0.22, vUv.y) * (1.0 - smoothstep(0.9, 1.0, vUv.y));
  gl_FragColor = vec4(col, m * smoothstep(0.0, 0.05, vis));
  #include <colorspace_fragment>
}
`;

/** Large, dim crimson halo behind the portrait. */
export const haloFragment = /* glsl */ `
precision highp float;
uniform float uIntensity;
varying vec2 vUv;
${C}
void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  float g = exp(-dot(p, p) * 3.2);
  gl_FragColor = vec4(CRIMSON_DEEP * g * uIntensity, 1.0);
  #include <colorspace_fragment>
}
`;

/** Embers that outlive the machinery. */
export const emberVertex = /* glsl */ `
uniform float uTime, uPixelRatio;
uniform vec3 uBox;
attribute vec3 aSeed;
varying float vAlpha;
varying float vMix;
void main(){
  vec3 p = position;
  p.y = mod(p.y + uTime * (0.04 + aSeed.x * 0.09) + uBox.y * 0.5, uBox.y) - uBox.y * 0.5;
  p.x += sin(uTime * 0.2 + aSeed.y * 6.2831) * 0.18;
  p.z += cos(uTime * 0.17 + aSeed.z * 6.2831) * 0.14;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (5.0 + aSeed.z * 14.0) * uPixelRatio / -mv.z;
  float tw = 0.5 + 0.5 * sin(uTime * (0.6 + aSeed.x * 1.6) + aSeed.y * 20.0);
  vAlpha = (0.2 + 0.8 * tw) * (0.3 + aSeed.y * 0.7);
  vMix = aSeed.z;
}
`;

export const emberFragment = /* glsl */ `
precision highp float;
uniform float uOpacity;
varying float vAlpha;
varying float vMix;
${C}
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = 1.0 - smoothstep(0.0, 0.5, d);
  a *= a;
  vec3 c = mix(METAL, CRIMSON, step(0.5, vMix) * 0.85);
  gl_FragColor = vec4(c, a * vAlpha * uOpacity);
  #include <colorspace_fragment>
}
`;
