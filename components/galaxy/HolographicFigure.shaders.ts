/**
 * GLSL shader source for the canonical "Help me Obi-Wan" holographic figure.
 *
 * Effects:
 *   - Fresnel rim glow (edge-lit, viewport-aware)
 *   - Horizontal scanlines tied to world-Y so they read as physical projection
 *     planes the figure passes through, not a screen-space texture overlay
 *   - Per-channel chromatic aberration on the rim — sells the "imperfect
 *     projection" feel without being lurid
 *   - High-frequency flicker plus rare sag/dropout for organic unsteadiness
 *
 * Written in legacy GLSL (varying/attribute) for compatibility with the
 * Three.js r170 default WebGL2 path used by the project's R3F canvas. We are
 * NOT setting `glslVersion = THREE.GLSL3`, so the runtime injects matching
 * defines and the same source compiles on WebGL1 fallbacks if needed.
 *
 * Uniforms:
 *   uTime         — accumulated seconds (caller stops updating under reduced
 *                   motion to freeze flicker; static patterns remain visible)
 *   uColor        — figure base color in linear RGB (THREE.Color → vec3)
 *   uOpacity      — global multiplier 0..1, used for fade-in / `intensity` prop
 *   uFlickerSeed  — per-instance offset so two figures don't blink in lockstep
 */

export const vertexShader = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying vec2 vUv;

  void main() {
    vUv = uv;

    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;

    // World-space normal — the mesh isn't expected to skew non-uniformly, so
    // a normalMatrix-equivalent via the model's upper-3x3 is sufficient and
    // cheaper than passing in normalMatrix.
    vWorldNormal = normalize(mat3(modelMatrix) * normal);

    // View direction in world space (camera → fragment), used for fresnel.
    vViewDir = normalize(cameraPosition - worldPos.xyz);

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uFlickerSeed;

  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying vec2 vUv;

  // Cheap 1D hash for sparse "big flicker" events. Avoids a noise texture.
  float hash11(float x) {
    return fract(sin(x * 12.9898) * 43758.5453);
  }

  void main() {
    // ---- Fresnel rim --------------------------------------------------------
    // Front-facing → 0, edge-on → 1. The pow(.., 2.0) sharpens the rim band.
    float facing = clamp(dot(normalize(vWorldNormal), normalize(vViewDir)), 0.0, 1.0);
    float rim = pow(1.0 - facing, 2.0);

    // ---- Scanlines ----------------------------------------------------------
    // World-Y so the bands sit in space; the figure rotates THROUGH the planes
    // rather than dragging a painted-on texture. The drift term gives the
    // bands a slow upward crawl, like a refresh sweep.
    float scanCoord = vWorldPos.y * 8.0 - uTime * 0.4;
    // step(0.5, fract(...)) = hard 0/1 stripe; soften toward 0.55..0.85
    // brightness so dim bands aren't fully black.
    float scanBand = step(0.5, fract(scanCoord));
    float scan = mix(0.55, 1.0, scanBand);

    // ---- Flicker ------------------------------------------------------------
    // Two interfering sines for fast jitter (small, ~5%).
    float fastFlicker = 0.95 + sin(uTime * 11.0 + uFlickerSeed) *
                              sin(uTime * 31.0 + uFlickerSeed * 2.0) * 0.05;
    // Rare sag — every ~2.5s a brief dimming. smoothstep on hash → soft event.
    float slowTick = floor(uTime * 0.4 + uFlickerSeed);
    float dropoutChance = hash11(slowTick);
    float dropoutPhase = fract(uTime * 0.4 + uFlickerSeed);
    float dropoutEnvelope = smoothstep(0.0, 0.08, dropoutPhase) *
                            (1.0 - smoothstep(0.08, 0.18, dropoutPhase));
    float dropout = step(0.92, dropoutChance) * dropoutEnvelope * 0.35;
    float flicker = fastFlicker - dropout;

    // ---- Chromatic aberration on rim ---------------------------------------
    // R lags, B leads — the same direction CRT-era projection artifacts split.
    vec3 rimColor = vec3(rim * 0.30, rim * 0.55, rim * 1.00);

    // ---- Composite ----------------------------------------------------------
    vec3 base = uColor * scan * flicker;
    vec3 finalColor = base + rimColor * uColor;

    // Edge fade keeps the silhouette readable while still letting the body
    // show through. The +0.30 floor is the "it's still there" minimum.
    float alpha = (rim + 0.30) * uOpacity * scan * flicker;

    gl_FragColor = vec4(finalColor, clamp(alpha, 0.0, 1.0));
  }
`;
