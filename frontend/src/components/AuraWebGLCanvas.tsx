import React, { useEffect, useRef, useState } from 'react';

export interface AuraPalette {
  id: string;
  name: string;
  tagline: string;
  isDark: boolean;
  colors: [string, string, string, string, string];
  ui: {
    glassBg: string;
    glassBorder: string;
    glassHover: string;
    pillBg: string;
    textPrimary: string;
    textSecondary: string;
    textDim: string;
    accentColor: string;
    accentSoft: string;
    shadowColor: string;
  };
}

export const AURA_PALETTES: AuraPalette[] = [
  {
    id: 'serene-dawn',
    name: 'Serene Dawn',
    tagline: 'Clarity, gentle awakening & open horizons',
    isDark: false,
    colors: [
      '#F4EBE1', // Base warm alabaster mist
      '#F6C6B5', // Soft peach horizon
      '#C9D6EA', // Morning periwinkle sky
      '#E2CFEA', // Pale lavender cloud
      '#F9DFB9', // Sunlit apricot glow
    ],
    ui: {
      glassBg: 'rgba(255, 255, 255, 0.38)',
      glassBorder: 'rgba(35, 37, 51, 0.14)',
      glassHover: 'rgba(255, 255, 255, 0.58)',
      pillBg: 'rgba(255, 255, 255, 0.36)',
      textPrimary: '#232533',
      textSecondary: 'rgba(35, 37, 51, 0.72)',
      textDim: 'rgba(35, 37, 51, 0.52)',
      accentColor: '#6d4aff',
      accentSoft: 'rgba(109, 74, 255, 0.12)',
      shadowColor: 'rgba(55, 45, 70, 0.08)',
    },
  },
  {
    id: 'deep-intuition',
    name: 'Deep Intuition',
    tagline: 'Introspection, twilight mystery & inner wisdom',
    isDark: true,
    colors: [
      '#111324', // Deep midnight indigo base
      '#2E295E', // Royal twilight violet
      '#1E4E68', // Abyssal teal
      '#5B3765', // Mystic plum
      '#3B4F8C', // Celestial sapphire
    ],
    ui: {
      glassBg: 'rgba(20, 23, 42, 0.42)',
      glassBorder: 'rgba(255, 255, 255, 0.16)',
      glassHover: 'rgba(255, 255, 255, 0.15)',
      pillBg: 'rgba(255, 255, 255, 0.07)',
      textPrimary: '#F3F4F8',
      textSecondary: 'rgba(243, 244, 248, 0.72)',
      textDim: 'rgba(243, 244, 248, 0.50)',
      accentColor: '#c4b5fd',
      accentSoft: 'rgba(167, 139, 250, 0.18)',
      shadowColor: 'rgba(5, 6, 15, 0.38)',
    },
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    tagline: 'Warmth, creative radiance & emotional presence',
    isDark: false,
    colors: [
      '#F5E1CE', // Warm sand base
      '#F2A679', // Sun-drenched terracotta
      '#E88D8A', // Dusty rose dusk
      '#F7CC86', // Honey amber glow
      '#D99B82', // Muted sienna
    ],
    ui: {
      glassBg: 'rgba(255, 248, 242, 0.36)',
      glassBorder: 'rgba(45, 30, 24, 0.14)',
      glassHover: 'rgba(255, 255, 255, 0.55)',
      pillBg: 'rgba(255, 255, 255, 0.34)',
      textPrimary: '#2D1E18',
      textSecondary: 'rgba(45, 30, 24, 0.72)',
      textDim: 'rgba(45, 30, 24, 0.52)',
      accentColor: '#9c3d2b',
      accentSoft: 'rgba(156, 61, 43, 0.12)',
      shadowColor: 'rgba(75, 35, 15, 0.10)',
    },
  },
  {
    id: 'forest-breath',
    name: 'Forest Breath',
    tagline: 'Grounding, botanical calm & restorative balance',
    isDark: false,
    colors: [
      '#DCE6DF', // Misty sage base
      '#94B8A3', // Eucalyptus leaf
      '#7FA6A0', // River stone teal
      '#C2D5B8', // Sunlit moss
      '#A6C2B5', // Soft lichen
    ],
    ui: {
      glassBg: 'rgba(245, 252, 248, 0.36)',
      glassBorder: 'rgba(26, 41, 35, 0.14)',
      glassHover: 'rgba(255, 255, 255, 0.56)',
      pillBg: 'rgba(255, 255, 255, 0.34)',
      textPrimary: '#1A2923',
      textSecondary: 'rgba(26, 41, 35, 0.72)',
      textDim: 'rgba(26, 41, 35, 0.52)',
      accentColor: '#1f6350',
      accentSoft: 'rgba(31, 99, 80, 0.12)',
      shadowColor: 'rgba(20, 45, 35, 0.09)',
    },
  },
  {
    id: 'cosmic-stillness',
    name: 'Cosmic Stillness',
    tagline: 'Weightless expansion, astral silence & transcendence',
    isDark: true,
    colors: [
      '#0A0C14', // Obsidian cosmos base
      '#1C2541', // Deep nebula navy
      '#3A2449', // Dark amethyst aurora
      '#193C40', // Northern lights bioluminescence
      '#2E355B', // Starlight slate
    ],
    ui: {
      glassBg: 'rgba(15, 18, 30, 0.48)',
      glassBorder: 'rgba(255, 255, 255, 0.15)',
      glassHover: 'rgba(255, 255, 255, 0.14)',
      pillBg: 'rgba(255, 255, 255, 0.07)',
      textPrimary: '#F0F2F9',
      textSecondary: 'rgba(240, 242, 249, 0.70)',
      textDim: 'rgba(240, 242, 249, 0.48)',
      accentColor: '#c4b5fd',
      accentSoft: 'rgba(167, 139, 250, 0.18)',
      shadowColor: 'rgba(0, 0, 0, 0.45)',
    },
  },
];

function hexToRgbNormalized(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255,
  ];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const VERTEX_SHADER_SRC = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SRC = `
  precision highp float;
  varying vec2 v_uv;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_mouse;
  uniform float u_grain;
  uniform float u_warp;

  uniform vec3 u_color0;
  uniform vec3 u_color1;
  uniform vec3 u_color2;
  uniform vec3 u_color3;
  uniform vec3 u_color4;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187,
                        0.366025403784439,
                       -0.577350269189626,
                        0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float hashGrain(vec2 p, float t) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031 + fract(t * 0.37));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  void main() {
    vec2 uv = v_uv;
    float aspect = u_resolution.x / max(u_resolution.y, 1.0);
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

    vec2 parallax = (u_mouse - 0.5) * vec2(aspect, 1.0) * 0.22;
    vec2 q = p - parallax * 0.65;

    float t = u_time * 0.18;

    float n1 = snoise(q * 1.15 + vec2(t * 0.7, -t * 0.5));
    float n2 = snoise(q * 1.85 - vec2(t * 0.5, t * 0.65) + n1 * 0.6);
    vec2 warped = q + vec2(n1, n2) * (0.38 * u_warp);

    vec2 center1 = vec2(
      sin(t * 0.85) * 0.42 * aspect,
      cos(t * 0.65) * 0.32
    ) + parallax * 0.35;

    vec2 center2 = vec2(
      cos(t * 0.62 + 1.8) * 0.45 * aspect,
      sin(t * 0.78 + 1.1) * 0.36
    ) - parallax * 0.25;

    vec2 center3 = vec2(
      sin(t * 0.55 + 3.6) * 0.38 * aspect,
      sin(t * 0.92 + 2.4) * 0.35
    ) + parallax * 0.45;

    vec2 center4 = vec2(
      cos(t * 0.74 + 4.9) * 0.35 * aspect,
      cos(t * 0.52 + 3.7) * 0.38
    ) - parallax * 0.30;

    float d1 = length(warped - center1);
    float d2 = length(warped - center2);
    float d3 = length(warped - center3);
    float d4 = length(warped - center4);

    float w1 = smoothstep(1.15, 0.0, d1);
    float w2 = smoothstep(1.20, 0.0, d2);
    float w3 = smoothstep(1.10, 0.0, d3);
    float w4 = smoothstep(1.25, 0.0, d4);

    float auroraWave = 0.5 + 0.5 * snoise(warped * 1.35 + vec2(-t * 0.4, t * 0.3));

    vec3 col = u_color0;
    col = mix(col, u_color1, w1 * 0.82);
    col = mix(col, u_color2, w2 * 0.78);
    col = mix(col, u_color3, w3 * 0.75);
    col = mix(col, u_color4, w4 * 0.72);

    vec3 auroraTint = mix(u_color1, u_color3, auroraWave);
    col = mix(col, auroraTint, 0.24 * u_warp);

    float vig = smoothstep(1.45, 0.15, length(p * vec2(0.85, 1.05)));
    col *= mix(0.86, 1.04, vig);

    float grainNoise = hashGrain(gl_FragCoord.xy, floor(u_time * 18.0)) - 0.5;
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    float grainMask = mix(0.09, 0.065, lum);
    col += grainNoise * u_grain * grainMask * 2.2;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

export function applyPaletteCssVariables(palette: AuraPalette) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--glass-bg', palette.ui.glassBg);
  root.style.setProperty('--glass-border', palette.ui.glassBorder);
  root.style.setProperty('--glass-hover', palette.ui.glassHover);
  root.style.setProperty('--pill-bg', palette.ui.pillBg);
  root.style.setProperty('--text-primary', palette.ui.textPrimary);
  root.style.setProperty('--text-secondary', palette.ui.textSecondary);
  root.style.setProperty('--shadow-color', palette.ui.shadowColor);

  // Sync Aura design tokens with the active palette
  root.style.setProperty('--bg', palette.colors[0]);
  root.style.setProperty('--text', palette.ui.textPrimary);
  root.style.setProperty('--text-muted', palette.ui.textSecondary);
  root.style.setProperty('--text-dim', palette.ui.textDim);
  root.style.setProperty('--border', palette.ui.glassBorder);
  root.style.setProperty('--accent', palette.ui.accentColor);
  root.style.setProperty('--accent-soft', palette.ui.accentSoft);
  root.setAttribute('data-aura-theme', palette.isDark ? 'dark' : 'light');
}

interface AuraWebGLCanvasProps {
  paletteIndex: number;
  breathingSpeed?: number;
  grainIntensity?: number;
  warpComplexity?: number;
}

export const AuraWebGLCanvas: React.FC<AuraWebGLCanvasProps> = ({
  paletteIndex,
  breathingSpeed = 1.0,
  grainIntensity = 0.35,
  warpComplexity = 0.55,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [webglFallbackColors, setWebglFallbackColors] = useState<string[]>(
    AURA_PALETTES[paletteIndex]?.colors || AURA_PALETTES[1].colors
  );

  const engineRef = useRef<{
    activeColors: [number, number, number][];
    sourceColors: [number, number, number][];
    targetColors: [number, number, number][];
    lerpProgress: number;
    lerpDuration: number;
    accumulatedTime: number;
    lastFrameTime: number;
    breathingSpeed: number;
    grainIntensity: number;
    warpComplexity: number;
    targetMouse: { x: number; y: number };
    currentMouse: { x: number; y: number };
    pointerSmoothing: number;
  }>({
    activeColors: (AURA_PALETTES[paletteIndex] || AURA_PALETTES[1]).colors.map(
      hexToRgbNormalized
    ),
    sourceColors: (AURA_PALETTES[paletteIndex] || AURA_PALETTES[1]).colors.map(
      hexToRgbNormalized
    ),
    targetColors: (AURA_PALETTES[paletteIndex] || AURA_PALETTES[1]).colors.map(
      hexToRgbNormalized
    ),
    lerpProgress: 1.0,
    lerpDuration: 1.1,
    accumulatedTime: 0,
    lastFrameTime: typeof performance !== 'undefined' ? performance.now() : 0,
    breathingSpeed,
    grainIntensity,
    warpComplexity,
    targetMouse: { x: 0.5, y: 0.5 },
    currentMouse: { x: 0.5, y: 0.5 },
    pointerSmoothing: 0.022,
  });

  useEffect(() => {
    engineRef.current.breathingSpeed = breathingSpeed;
    engineRef.current.grainIntensity = grainIntensity;
    engineRef.current.warpComplexity = warpComplexity;
  }, [breathingSpeed, grainIntensity, warpComplexity]);

  useEffect(() => {
    const safeIdx =
      ((paletteIndex % AURA_PALETTES.length) + AURA_PALETTES.length) %
      AURA_PALETTES.length;
    const palette = AURA_PALETTES[safeIdx];
    const st = engineRef.current;
    st.sourceColors = st.activeColors.map((c) => [...c] as [number, number, number]);
    st.targetColors = palette.colors.map(hexToRgbNormalized);
    st.lerpProgress = 0.0;

    applyPaletteCssVariables(palette);
    setWebglFallbackColors(palette.colors);
  }, [paletteIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl =
      (canvas.getContext('webgl', {
        alpha: false,
        antialias: true,
        preserveDrawingBuffer: false,
      }) as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);

    if (!gl) {
      return;
    }

    function compileShader(
      ctx: WebGLRenderingContext,
      type: number,
      source: string
    ): WebGLShader | null {
      const shader = ctx.createShader(type);
      if (!shader) return null;
      ctx.shaderSource(shader, source);
      ctx.compileShader(shader);
      if (!ctx.getShaderParameter(shader, ctx.COMPILE_STATUS)) {
        ctx.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      time: gl.getUniformLocation(program, 'u_time'),
      mouse: gl.getUniformLocation(program, 'u_mouse'),
      grain: gl.getUniformLocation(program, 'u_grain'),
      warp: gl.getUniformLocation(program, 'u_warp'),
      color0: gl.getUniformLocation(program, 'u_color0'),
      color1: gl.getUniformLocation(program, 'u_color1'),
      color2: gl.getUniformLocation(program, 'u_color2'),
      color3: gl.getUniformLocation(program, 'u_color3'),
      color4: gl.getUniformLocation(program, 'u_color4'),
    };

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const onPointerMove = (e: PointerEvent) => {
      engineRef.current.targetMouse.x = e.clientX / Math.max(window.innerWidth, 1);
      engineRef.current.targetMouse.y =
        1.0 - e.clientY / Math.max(window.innerHeight, 1);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        engineRef.current.targetMouse.x =
          e.touches[0].clientX / Math.max(window.innerWidth, 1);
        engineRef.current.targetMouse.y =
          1.0 - e.touches[0].clientY / Math.max(window.innerHeight, 1);
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    let rafId = 0;
    const animate = (now: number) => {
      const st = engineRef.current;
      const dt = Math.min((now - st.lastFrameTime) / 1000, 0.1);
      st.lastFrameTime = now;

      st.accumulatedTime += dt * st.breathingSpeed;

      st.currentMouse.x = lerp(
        st.currentMouse.x,
        st.targetMouse.x,
        st.pointerSmoothing
      );
      st.currentMouse.y = lerp(
        st.currentMouse.y,
        st.targetMouse.y,
        st.pointerSmoothing
      );

      if (st.lerpProgress < 1.0) {
        st.lerpProgress = Math.min(1.0, st.lerpProgress + dt / st.lerpDuration);
        const eased = easeInOutCubic(st.lerpProgress);
        for (let i = 0; i < 5; i++) {
          st.activeColors[i][0] = lerp(
            st.sourceColors[i][0],
            st.targetColors[i][0],
            eased
          );
          st.activeColors[i][1] = lerp(
            st.sourceColors[i][1],
            st.targetColors[i][1],
            eased
          );
          st.activeColors[i][2] = lerp(
            st.sourceColors[i][2],
            st.targetColors[i][2],
            eased
          );
        }
      }

      gl.uniform1f(uniforms.time, st.accumulatedTime);
      gl.uniform2f(uniforms.mouse, st.currentMouse.x, st.currentMouse.y);
      gl.uniform1f(uniforms.grain, st.grainIntensity);
      gl.uniform1f(uniforms.warp, st.warpComplexity);

      gl.uniform3fv(uniforms.color0, st.activeColors[0]);
      gl.uniform3fv(uniforms.color1, st.activeColors[1]);
      gl.uniform3fv(uniforms.color2, st.activeColors[2]);
      gl.uniform3fv(uniforms.color3, st.activeColors[3]);
      gl.uniform3fv(uniforms.color4, st.activeColors[4]);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  return (
    <canvas
      id="aura-canvas"
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        display: 'block',
        pointerEvents: 'none',
        background: `radial-gradient(circle at 30% 25%, ${webglFallbackColors[1]} 0%, ${webglFallbackColors[2]} 45%, ${webglFallbackColors[0]} 100%)`,
        transition: 'background 1.6s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    />
  );
};
