import { useEffect, useRef } from "react";

/** Soft orange glow that follows the cursor (desktop only). */
export default function CursorGlow() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    let x = window.innerWidth / 2, y = window.innerHeight / 2;
    let rx = x, ry = y;
    let raf = 0;

    const onMove = (e: MouseEvent) => { x = e.clientX; y = e.clientY; };
    const tick = () => {
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;
      if (dotRef.current) dotRef.current.style.transform = `translate(${x - 5}px, ${y - 5}px)`;
      if (ringRef.current) ringRef.current.style.transform = `translate(${rx - 18}px, ${ry - 18}px)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(tick);
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf); };
  }, []);

  return (
    <>
      <div
        ref={ringRef}
        className="pointer-events-none fixed left-0 top-0 z-[999] h-9 w-9 rounded-full border border-[#ff5b1f]/40 mix-blend-screen"
        style={{ transition: "border-color .2s" }}
        aria-hidden
      />
      <div
        ref={dotRef}
        className="pointer-events-none fixed left-0 top-0 z-[999] h-2.5 w-2.5 rounded-full bg-[#ff5b1f] shadow-[0_0_18px_rgba(255,91,31,.7)]"
        aria-hidden
      />
    </>
  );
}
