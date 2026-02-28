import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";

export default function ScoreDisplay({ value, label, isServing, color = "blue" }) {
  const colorClasses = {
    blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
    orange: "from-orange-500/20 to-orange-600/10 border-orange-500/30",
    emerald: "from-emerald-500/20 to-green-600/10 border-emerald-400/30",
    lime: "from-lime-400/20 to-yellow-400/10 border-lime-400/30"
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {label && (
        <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
          {label}
        </span>
      )}
      <motion.div
        className={cn(
          "relative min-w-[3rem] h-12 flex items-center justify-center rounded-xl border bg-gradient-to-b",
          colorClasses[color]
        )}
      >
        <AnimatePresence mode="popLayout">
          <motion.span
            key={value}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="text-2xl font-bold text-white tabular-nums px-3"
          >
            {value}
          </motion.span>
        </AnimatePresence>
        {isServing && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/50"
          />
        )}
      </motion.div>
    </div>
  );
}