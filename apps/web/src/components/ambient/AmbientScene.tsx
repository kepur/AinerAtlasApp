import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { SceneMood } from "./types";

type Props = {
  mood: SceneMood;
  /** Faster particles / stronger motion — voice in-call or active chat */
  energized?: boolean;
};

export default function AmbientScene({ mood, energized = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;

    const particles = Array.from({ length: 48 }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: Math.random(),
      speed: 0.0004 + Math.random() * 0.0012,
      size: 1 + Math.random() * 2.5,
    }));

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * devicePixelRatio);
      canvas.height = Math.floor(h * devicePixelRatio);
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const moodHue = mood === "speaking" ? 280 : mood === "thinking" ? 220 : mood === "listening" ? 260 : 250;

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const pulse = 0.5 + Math.sin(t * 0.0015) * 0.5;

      for (const p of particles) {
        p.y -= p.speed * (energized ? 1.6 : 0.8);
        if (p.y < -0.05) {
          p.y = 1.05;
          p.x = Math.random();
        }
        const depth = 0.35 + p.z * 0.65;
        const px = p.x * w;
        const py = p.y * h;
        const alpha = depth * (0.15 + pulse * 0.2);
        ctx.beginPath();
        ctx.fillStyle = `hsla(${moodHue}, 85%, 68%, ${alpha})`;
        ctx.arc(px, py, p.size * depth * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [energized, mood]);

  return (
    <div className="ambient-scene" aria-hidden>
      <canvas ref={canvasRef} className="ambient-canvas" />
      <div className="ambient-mesh" />
      <motion.div
        className="ambient-orb ambient-orb-a"
        animate={{
          x: mood === "speaking" ? [0, 24, -12, 0] : [0, 12, -8, 0],
          y: mood === "thinking" ? [0, -18, 8, 0] : [0, -10, 6, 0],
          scale: energized ? [1, 1.08, 1] : [1, 1.03, 1],
        }}
        transition={{ duration: mood === "speaking" ? 4 : 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="ambient-orb ambient-orb-b"
        animate={{
          x: [0, -16, 10, 0],
          y: [0, 14, -6, 0],
          scale: energized ? [1, 1.12, 1] : [1, 1.04, 1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="ambient-grid" />
    </div>
  );
}
