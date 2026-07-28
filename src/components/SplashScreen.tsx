import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Start fade out at 2.4s
    const timer1 = setTimeout(() => {
      setFadeOut(true);
    }, 2400);

    // Call onFinish at 2.8s
    const timer2 = setTimeout(() => {
      onFinish();
    }, 2800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 bg-white flex flex-col items-center justify-between p-8 transition-opacity duration-500 ease-in-out select-none ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Top spacing placeholder */}
      <div className="h-10" />

      {/* Centered Logo with Zoom-Out Animation */}
      <div className="flex flex-col items-center justify-center space-y-6 max-w-sm text-center">
        <motion.div
          initial={{ scale: 1.6, opacity: 0 }}
          animate={{ scale: 1.0, opacity: 1 }}
          transition={{
            duration: 1.2,
            ease: [0.16, 1, 0.3, 1], // Custom smooth ease-out curve
          }}
          className="relative flex items-center justify-center p-4"
        >
          <img
            src="https://iili.io/C0iDIS4.png"
            alt="Logo Aplikasi Ujian"
            className="w-48 h-48 md:w-56 md:h-56 object-contain filter drop-shadow-xl"
            referrerPolicy="no-referrer"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="space-y-1.5"
        >
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight font-heading">
            Aplikasi Ujian Real-time
          </h1>
          <p className="text-xs md:text-sm font-semibold text-slate-500">
            Sistem Evaluasi Digital Berbasis Cloud
          </p>
        </motion.div>
      </div>

      {/* Bottom Center Copyright */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.8 }}
        className="text-center"
      >
        <p className="text-xs font-semibold text-slate-400 tracking-wide">
          copyright © 2026 developed by Ilmiawan
        </p>
      </motion.div>
    </div>
  );
};
