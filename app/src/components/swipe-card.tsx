"use client";

import { useCallback } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Phone, ChevronRight } from "lucide-react";

const SWIPE_THRESHOLD = 80;

interface SwipeCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;   // Status change action (revealed on left swipe)
  onSwipeRight?: () => void;  // Call action (revealed on right swipe)
  leftLabel?: string;         // Default: "Status"
  rightLabel?: string;        // Default: "Call"
  disabled?: boolean;         // Disable swipe (e.g., desktop)
}

export function SwipeCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftLabel = "Status",
  rightLabel = "Call",
  disabled = false,
}: SwipeCardProps) {
  const x = useMotionValue(0);

  // Action zone opacity — revealed as card slides
  const leftActionOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const rightActionOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number } }) => {
      const offset = info.offset.x;

      if (offset > SWIPE_THRESHOLD && onSwipeRight) {
        // Swipe right → call action
        animate(x, 120, { type: "spring", stiffness: 300, damping: 30 });
        onSwipeRight();
        setTimeout(() => animate(x, 0, { type: "spring", stiffness: 300, damping: 30 }), 300);
      } else if (offset < -SWIPE_THRESHOLD && onSwipeLeft) {
        // Swipe left → status change action
        animate(x, -120, { type: "spring", stiffness: 300, damping: 30 });
        onSwipeLeft();
        setTimeout(() => animate(x, 0, { type: "spring", stiffness: 300, damping: 30 }), 300);
      } else {
        // Snap back to center
        animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
      }
    },
    [x, onSwipeLeft, onSwipeRight]
  );

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{ overscrollBehaviorX: "contain" }}
    >
      {/* Right action zone — revealed on left swipe (status change) */}
      <motion.div
        className="absolute inset-y-0 right-0 flex w-[120px] items-center justify-center gap-1.5 bg-brand-500 text-white"
        style={{ opacity: rightActionOpacity }}
        aria-hidden="true"
      >
        <ChevronRight className="h-5 w-5" />
        <span className="text-sm font-semibold">{leftLabel}</span>
      </motion.div>

      {/* Left action zone — revealed on right swipe (call) */}
      <motion.div
        className="absolute inset-y-0 left-0 flex w-[120px] items-center justify-center gap-1.5 bg-emerald-600 text-white"
        style={{ opacity: leftActionOpacity }}
        aria-hidden="true"
      >
        <Phone className="h-5 w-5" />
        <span className="text-sm font-semibold">{rightLabel}</span>
      </motion.div>

      {/* Draggable card content */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -150, right: 150 }}
        dragElastic={0.3}
        style={{ x, touchAction: "pan-y" }}
        onDragEnd={handleDragEnd}
        className="relative z-10 touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}
