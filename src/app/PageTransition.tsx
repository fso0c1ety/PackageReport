"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Google Cloud Next Colors
const colors = ["#4285F4", "#EA4335", "#FBBC05", "#34A853"];

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAnimating, setIsAnimating] = useState(false);

  // When path changes, start animation
  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 1200); // Match animation duration
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Persistent Overlay Layer */}
      <AnimatePresence mode="wait">
        {isAnimating && (
          <motion.div
            key="overlay"
            initial={{ opacity: 1 }} // Start fully visible
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#23243a', // Solid background to hide content
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
            }}
          >
             {/* Central Animation */}
             <div style={{ position: 'relative', width: 100, height: 100 }}>
               {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    style={{
                      position: 'absolute',
                      width: 40,
                      height: 40,
                      backgroundColor: colors[i],
                      borderRadius: i % 2 === 0 ? '50%' : '8px', 
                      top: 0,
                      left: 0,
                      margin: '30px'
                    }}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                    animate={{ 
                      scale: [0, 1.5, 0],
                      opacity: [1, 1, 0],
                      x: [0, (i % 2 === 0 ? -60 : 60), 0], 
                      y: [0, (i < 2 ? -60 : 60), 0],
                      rotate: [0, 180, 360]
                    }}
                    transition={{
                      duration: 1.0,
                      ease: "easeInOut",
                      times: [0, 0.5, 1]
                    }}
                  />
               ))}
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Content - always rendered but hidden behind overlay */}
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }} // Fade in as overlay fades out
        style={{ width: "100%", height: "100%" }}
      >
        {children}
      </motion.div>
    </div>
  );
}
