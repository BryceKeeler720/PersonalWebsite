import React, { useEffect, useRef } from 'react';

// Classic donut.c: a torus is swept by two angles (theta around the tube,
// phi around the ring), rotated about two axes (A, B), projected with
// perspective, and z-buffered. Surface luminance indexes into an ASCII ramp.
const WIDTH = 60;
const HEIGHT = 26;
const LUMINANCE = '.,-~:;=!*#$@';
const R1 = 1; // tube radius
const R2 = 2; // ring radius
const K2 = 5; // camera distance
const K1 = (WIDTH * K2 * 3) / (8 * (R1 + R2)); // projection scale
const FRAME_MS = 1000 / 30;

interface DonutTorusProps {
  color: string;
  hudColor: string;
}

const DonutTorus: React.FC<DonutTorusProps> = ({ color, hudColor }) => {
  const preRef = useRef<HTMLPreElement>(null);
  const hudRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let A = 1.0;
    let B = 0.4;
    let raf = 0;
    let last = 0;
    let frames = 0;
    let fpsWindowStart = performance.now();

    const output: string[] = new Array(WIDTH * HEIGHT);
    const zbuffer = new Float32Array(WIDTH * HEIGHT);

    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      if (now - last < FRAME_MS) return;
      last = now;

      output.fill(' ');
      zbuffer.fill(0);

      const cosA = Math.cos(A), sinA = Math.sin(A);
      const cosB = Math.cos(B), sinB = Math.sin(B);

      for (let theta = 0; theta < Math.PI * 2; theta += 0.07) {
        const cosT = Math.cos(theta), sinT = Math.sin(theta);
        const circleX = R2 + R1 * cosT;
        const circleY = R1 * sinT;

        for (let phi = 0; phi < Math.PI * 2; phi += 0.02) {
          const cosP = Math.cos(phi), sinP = Math.sin(phi);

          const x = circleX * (cosB * cosP + sinA * sinB * sinP) - circleY * cosA * sinB;
          const y = circleX * (sinB * cosP - sinA * cosB * sinP) + circleY * cosA * cosB;
          const ooz = 1 / (K2 + cosA * circleX * sinP + circleY * sinA);

          const xp = Math.round(WIDTH / 2 + K1 * ooz * x);
          // characters are ~twice as tall as wide, so halve the y scale
          const yp = Math.round(HEIGHT / 2 - K1 * ooz * y * 0.5);
          if (xp < 0 || xp >= WIDTH || yp < 0 || yp >= HEIGHT) continue;

          const idx = xp + WIDTH * yp;
          if (ooz <= zbuffer[idx]) continue;
          zbuffer[idx] = ooz;

          const lum =
            cosP * cosT * sinB -
            cosA * cosT * sinP -
            sinA * sinT +
            cosB * (cosA * sinT - cosT * sinA * sinP);
          const li = lum > 0 ? Math.min(LUMINANCE.length - 1, Math.floor(lum * 8)) : 0;
          output[idx] = LUMINANCE[li];
        }
      }

      const rows: string[] = [];
      for (let row = 0; row < HEIGHT; row++) {
        rows.push(output.slice(row * WIDTH, (row + 1) * WIDTH).join(''));
      }
      if (preRef.current) preRef.current.textContent = rows.join('\n');

      frames++;
      if (now - fpsWindowStart >= 1000) {
        const fps = (frames * 1000) / (now - fpsWindowStart);
        if (hudRef.current) {
          hudRef.current.textContent = `${fps.toFixed(2)} Hz / ${(1000 / fps).toFixed(2)}ms`;
        }
        frames = 0;
        fpsWindowStart = now;
      }

      A += 0.05;
      B += 0.025;
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="donut-wrapper">
      <span ref={hudRef} className="donut-hud" style={{ color: hudColor }} aria-hidden="true" />
      <pre ref={preRef} className="donut-frame" style={{ color }} aria-label="Spinning 3D ASCII torus" />
    </div>
  );
};

export default DonutTorus;
