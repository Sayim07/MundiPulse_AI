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
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  const springConfig = { damping: 25, stiffness: 400, mass: 0.5 };
  const smoothX = useSpring(cursorX, springConfig);
  const smoothY = useSpring(cursorY, springConfig);

  useEffect(() => {
    // Detect touch device
    const isTouch =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(isTouch);
    if (isTouch) return;

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

  if (isTouchDevice) return null;

  return (
    <>
      {/* Main glowing dot */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999]"
        style={{
          x: smoothX,
          y: smoothY,
          translateX: "-50%",
          translateY: "-50%",
        }}
        animate={{
          width: isHovering ? 40 : 12,
          height: isHovering ? 40 : 12,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{
          width: { type: "spring", damping: 20, stiffness: 400 },
          height: { type: "spring", damping: 20, stiffness: 400 },
          opacity: { duration: 0.15 },
        }}
      >
        <div
          className="w-full h-full rounded-full"
          style={{
            background: isHovering
              ? "rgba(0, 255, 136, 0.15)"
              : "rgba(0, 255, 136, 0.9)",
            border: isHovering
              ? "1.5px solid rgba(0, 255, 136, 0.6)"
              : "none",
            boxShadow: isHovering
              ? "0 0 20px rgba(0, 255, 136, 0.3), 0 0 60px rgba(0, 255, 136, 0.1)"
              : "0 0 8px rgba(0, 255, 136, 0.6), 0 0 20px rgba(0, 255, 136, 0.2)",
          }}
        />
      </motion.div>

      {/* Trailing glow ring */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9998]"
        style={{
          x: smoothX,
          y: smoothY,
          translateX: "-50%",
          translateY: "-50%",
        }}
        animate={{
          width: isHovering ? 56 : 28,
          height: isHovering ? 56 : 28,
          opacity: isVisible ? 0.4 : 0,
        }}
        transition={{
          type: "spring",
          damping: 30,
          stiffness: 200,
          opacity: { duration: 0.2 },
        }}
      >
        <div
          className="w-full h-full rounded-full"
          style={{
            border: "1px solid rgba(0, 255, 136, 0.2)",
            background: "transparent",
          }}
        />
      </motion.div>
    </>
  );
}
