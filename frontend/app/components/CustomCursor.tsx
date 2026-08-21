"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/**
 * CustomCursor — A smooth-tracking glowing dot cursor using Framer Motion.
 * Expands when hovering over clickable elements (buttons, links, inputs).
 * Hidden on touch devices.
 */
export default function CustomCursor() {
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  const springConfig = { damping: 25, stiffness: 400, mass: 0.5 };
  const smoothX = useSpring(cursorX, springConfig);
  const smoothY = useSpring(cursorY, springConfig);

  useEffect(() => {
    // Detect touch device
    const isTouch =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);
    if (isTouch) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);

    // Track hover on clickable elements
    const handleElementHover = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const clickable = target.closest(
        'button, a, input, select, textarea, [role="button"], .clickable, label'
      );
      setIsHovering(!!clickable);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseover", handleElementHover);
    document.addEventListener("mouseenter", handleMouseEnter);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseover", handleElementHover);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [cursorX, cursorY, isVisible]);

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999]"
        style={{
          x: smoothX,
          y: smoothY,
          translateX: "-50%",
          translateY: "-50%",
        }}
        animate={{
          width: isHovering ? 64 : 24,
          height: isHovering ? 64 : 24,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{
          width: { type: "spring", damping: 25, stiffness: 300 },
          height: { type: "spring", damping: 25, stiffness: 300 },
          opacity: { duration: 0.2 },
        }}
      >
        <div
          className="w-full h-full rounded-full blur-[2px]"
          style={{
            background: isHovering
              ? "radial-gradient(circle, rgba(251, 191, 36, 0.8) 0%, rgba(251, 191, 36, 0) 70%)"
              : "radial-gradient(circle, rgba(34, 211, 238, 0.6) 0%, rgba(34, 211, 238, 0) 70%)",
            transition: "background 0.3s ease",
          }}
        />
      </motion.div>
    </>
  );
}
