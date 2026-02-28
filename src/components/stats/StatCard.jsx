import React from 'react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

export default function StatCard({ icon: Icon, label, value, subvalue, color = "blue", delay = 0 }) {
  const colorClasses = {
    blue: "from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400",
    green: "from-emerald-500/20 to-green-600/5 border-emerald-500/20 text-emerald-400",
    orange: "from-orange-500/20 to-orange-600/5 border-orange-500/20 text-orange-400",
    purple: "from-purple-500/20 to-purple-600/5 border-purple-500/20 text-purple-400",
    pink: "from-pink-500/20 to-pink-600/5 border-pink-500/20 text-pink-400",
    lime: "from-lime-400/20 to-yellow-400/5 border-lime-400/20 text-lime-300",
    yellow: "from-yellow-400/20 to-amber-400/5 border-yellow-400/20 text-yellow-300"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        "bg-gradient-to-br border rounded-2xl p-5 backdrop-blur-sm",
        colorClasses[color]
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2 rounded-xl bg-slate-900/50", colorClasses[color])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
      {subvalue && (
        <p className="text-xs text-slate-500 mt-1">{subvalue}</p>
      )}
    </motion.div>
  );
}