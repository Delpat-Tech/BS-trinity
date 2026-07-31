'use client';

import { useEffect, useMemo, useRef } from 'react';

export type ThemeMode = 'light' | 'dark';

interface InteractiveWaterBackdropProps {
  theme?: ThemeMode;
  className?: string;
}

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ox: number;
  oy: number;
  phase: number;
  drift: number;
  size: number;
  alpha: number;
  color: string;
};

type ThemePalette = {
  base: string;
  overlay: string;
  primary: [number, number, number];
  secondary: [number, number, number];
  neutral: [number, number, number];
  neutralThreshold: number;
  alphaFloor: number;
};

const THEME_PALETTES: Record<ThemeMode, ThemePalette> = {
  light: {
    base: 'linear-gradient(180deg, #e8eaed 0%, #eff1f4 55%, #f2f3f5 100%)',
    overlay: 'linear-gradient(180deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.28) 100%)',
    primary: [58, 133, 247],
    secondary: [102, 164, 255],
    neutral: [178, 184, 198],
    neutralThreshold: 0.22,
    alphaFloor: 0.14,
  },
  dark: {
    base: 'linear-gradient(180deg, #020305 0%, #080d1a 55%, #030712 100%)',
    overlay: 'linear-gradient(180deg, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.45) 100%)',
    primary: [92, 138, 255],
    secondary: [132, 176, 255],
    neutral: [178, 204, 255],
    neutralThreshold: 0.08,
    alphaFloor: 0.12,
  },
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const lerp = (start: number, end: number, amount: number) => start + (end - start) * amount;
const mixColor = (
  from: [number, number, number],
  to: [number, number, number],
  amount: number,
): [number, number, number] => [
  Math.round(lerp(from[0], to[0], amount)),
  Math.round(lerp(from[1], to[1], amount)),
  Math.round(lerp(from[2], to[2], amount)),
];
const colorToRgb = (color: [number, number, number]) =>
  `rgb(${color[0]}, ${color[1]}, ${color[2]})`;

export function InteractiveWaterBackdrop({ theme = 'dark', className }: InteractiveWaterBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const palette = useMemo(() => THEME_PALETTES[theme] || THEME_PALETTES.dark, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    let width = 1;
    let height = 1;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let animationFrame = 0;
    let lastPaint = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowPowerDevice =
      reducedMotion
      || window.matchMedia('(pointer: coarse)').matches
      || ((navigator.hardwareConcurrency || 8) <= 4);
    const frameInterval = lowPowerDevice ? 22 : 16;

    const pointer = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      velocityX: 0,
      velocityY: 0,
      active: false,
      lastActiveAt: 0,
    };
    let hoverProgress = 0;

    const particles: Particle[] = [];

    const createParticleColor = (): [number, number, number] => {
      const tone = Math.random();
      if (tone < palette.neutralThreshold) {
        return mixColor(palette.neutral, palette.secondary, tone / Math.max(palette.neutralThreshold, 0.001));
      }
      return mixColor(palette.primary, palette.secondary, (tone - palette.neutralThreshold) / Math.max(1 - palette.neutralThreshold, 0.001));
    };

    const getParticleCount = () => {
      const area = width * height;
      const densityBase = lowPowerDevice ? 4000 : 2900;
      const minimum = lowPowerDevice ? 330 : 420;
      const maximum = lowPowerDevice ? 760 : 1100;
      return clamp(Math.round(area / densityBase), minimum, maximum);
    };

    const buildParticles = () => {
      particles.length = 0;
      const count = getParticleCount();
      const cols = Math.max(1, Math.ceil(Math.sqrt((count * width) / Math.max(height, 1))));
      const rows = Math.max(1, Math.ceil(count / cols));
      const cellWidth = width / cols;
      const cellHeight = height / rows;

      for (let index = 0; index < count; index += 1) {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const ox = col * cellWidth + Math.random() * cellWidth;
        const oy = row * cellHeight + Math.random() * cellHeight;
        const color = colorToRgb(createParticleColor());

        particles.push({
          x: ox,
          y: oy,
          vx: (Math.random() - 0.5) * 0.05,
          vy: (Math.random() - 0.5) * 0.05,
          ox,
          oy,
          phase: Math.random() * Math.PI * 2,
          drift: 0.55 + Math.random() * 1.1,
          size: 0.6 + Math.random() * 1.45,
          alpha: 0.18 + Math.random() * 0.52,
          color,
        });
      }
    };

    const applyBurst = (intensity: number) => {
      const burstRadius = Math.min(width, height) * (width < 768 ? 0.26 : 0.2);
      const burstRadiusSq = burstRadius * burstRadius;

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];
        const dx = particle.x - pointer.targetX;
        const dy = particle.y - pointer.targetY;
        const distanceSq = dx * dx + dy * dy;

        if (distanceSq >= burstRadiusSq) continue;

        const distance = Math.sqrt(distanceSq) || 0.0001;
        const falloff = 1 - distance / burstRadius;
        const force = intensity * falloff * falloff;
        particle.vx += (dx / distance) * force;
        particle.vy += (dy / distance) * force;
      }
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, Math.floor(bounds.width));
      height = Math.max(1, Math.floor(bounds.height));
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      pointer.x = width * 0.5;
      pointer.y = height * 0.5;
      pointer.targetX = pointer.x;
      pointer.targetY = pointer.y;
      pointer.velocityX = 0;
      pointer.velocityY = 0;
      pointer.active = false;
      pointer.lastActiveAt = 0;

      buildParticles();
    };

    const updatePointerTarget = (clientX: number, clientY: number) => {
      const nextX = clamp(clientX, 0, width);
      const nextY = clamp(clientY, 0, height);
      pointer.velocityX = clamp(nextX - pointer.targetX, -32, 32);
      pointer.velocityY = clamp(nextY - pointer.targetY, -32, 32);
      pointer.targetX = nextX;
      pointer.targetY = nextY;
      pointer.active = true;
      pointer.lastActiveAt = performance.now();
    };

    const handlePointerMove = (event: PointerEvent) => {
      updatePointerTarget(event.clientX, event.clientY);
    };

    const handlePointerDown = (event: PointerEvent) => {
      updatePointerTarget(event.clientX, event.clientY);
      applyBurst(1.3);
    };

    const handlePointerLeave = () => {
      pointer.active = false;
      pointer.lastActiveAt = 0;
    };

    const paint = (timestamp: number) => {
      if (timestamp - lastPaint < frameInterval) {
        animationFrame = window.requestAnimationFrame(paint);
        return;
      }

      lastPaint = timestamp;
      context.clearRect(0, 0, width, height);

      if (pointer.active && performance.now() - pointer.lastActiveAt > 1700) {
        pointer.active = false;
      }

      const idleTargetX = width * 0.5;
      const idleTargetY = height * 0.5;

      pointer.x = lerp(pointer.x, pointer.active ? pointer.targetX : idleTargetX, pointer.active ? 0.2 : 0.04);
      pointer.y = lerp(pointer.y, pointer.active ? pointer.targetY : idleTargetY, pointer.active ? 0.2 : 0.04);
      pointer.velocityX *= 0.82;
      pointer.velocityY *= 0.82;

      hoverProgress = lerp(hoverProgress, pointer.active ? 1 : 0, pointer.active ? 0.16 : 0.08);

      const minDim = Math.min(width, height);
      const ringRadius = minDim * (width < 768 ? 0.19 : 0.17);
      const ringWidth = minDim * (lowPowerDevice ? 0.024 : 0.02);
      const ringWidth2 = minDim * (lowPowerDevice ? 0.09 : 0.075);
      const maxInfluenceRadius = ringRadius + ringWidth2 * 1.2;
      const maxInfluenceRadiusSq = maxInfluenceRadius * maxInfluenceRadius;
      const springForce = reducedMotion ? 0.014 : 0.026;
      const noiseForce = lowPowerDevice ? 0.0065 : 0.01;
      const ringDisplacement = lowPowerDevice ? 1.15 : 1.45;
      const damping = reducedMotion ? 0.9 : 0.92;
      const time = timestamp * 0.001;

      context.globalCompositeOperation = 'source-over';

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];

        const noisePhase = time * particle.drift + particle.phase;
        const noiseX = Math.sin(noisePhase) * noiseForce;
        const noiseY = Math.cos(noisePhase * 1.09) * noiseForce;

        const returnX = (particle.ox - particle.x) * springForce;
        const returnY = (particle.oy - particle.y) * springForce;

        let repulsionX = 0;
        let repulsionY = 0;

        if (pointer.active) {
          const dx = particle.x - pointer.x;
          const dy = particle.y - pointer.y;
          const distanceSq = dx * dx + dy * dy;

          if (distanceSq < maxInfluenceRadiusSq) {
            const distance = Math.sqrt(distanceSq) || 0.0001;
            const normalizedX = dx / distance;
            const normalizedY = dy / distance;

            const ringDelta = Math.abs(distance - ringRadius);
            const ringBand = clamp(1 - ringDelta / ringWidth, 0, 1);
            const ringBandWide = clamp(1 - ringDelta / ringWidth2, 0, 1);
            const smoothRing = ringBand * ringBand * (3 - 2 * ringBand);
            const smoothRingWide = ringBandWide * ringBandWide * (3 - 2 * ringBandWide);

            const innerRadius = ringRadius * 0.68;
            const innerFalloff = clamp(1 - distance / innerRadius, 0, 1);
            const smoothInner = innerFalloff * innerFalloff;

            const cursorVelocityInfluence = 0.012 * (smoothRing + smoothRingWide);
            const force = hoverProgress * (
              smoothRing * ringDisplacement
              + smoothRingWide * ringDisplacement * 0.42
              + smoothInner * ringDisplacement * 0.32
            );

            repulsionX += normalizedX * force;
            repulsionY += normalizedY * force;
            repulsionX += pointer.velocityX * cursorVelocityInfluence;
            repulsionY += pointer.velocityY * cursorVelocityInfluence;
          }
        }

        particle.vx += noiseX + returnX + repulsionX;
        particle.vy += noiseY + returnY + repulsionY;

        particle.vx = clamp(particle.vx, -3.2, 3.2) * damping;
        particle.vy = clamp(particle.vy, -3.2, 3.2) * damping;

        particle.x += particle.vx;
        particle.y += particle.vy;

        const speed = Math.hypot(particle.vx, particle.vy);
        const radius = clamp(particle.size + speed * 0.22, 0.6, 3.2);
        const alpha = clamp(particle.alpha + speed * 0.06, palette.alphaFloor, 0.95);

        context.fillStyle = particle.color;
        context.globalAlpha = alpha * 0.18;
        context.beginPath();
        context.arc(particle.x, particle.y, radius * 2.1, 0, Math.PI * 2);
        context.fill();

        context.globalAlpha = alpha;
        context.beginPath();
        context.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
        context.fill();
      }

      context.globalAlpha = 1;
      context.globalCompositeOperation = 'source-over';

      animationFrame = window.requestAnimationFrame(paint);
    };

    resize();
    paint(0);

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave);
    window.addEventListener('blur', handlePointerLeave);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('blur', handlePointerLeave);
    };
  }, [palette]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${className ?? ''}`.trim()}
    >
      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{ background: palette.base }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
      />
      <div className="absolute inset-0" style={{ background: palette.overlay }} />
    </div>
  );
}
