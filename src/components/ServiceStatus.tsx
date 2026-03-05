import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface ServiceStatusProps {
  status: number;
  name: string;
  compact?: boolean;
}

const STATUS_COLORS = {
  0: "bg-cyber-green/20 text-cyber-green border-cyber-green", // up
  1: "bg-cyber-red/20 text-cyber-red border-cyber-red", // down
  2: "bg-cyber-yellow/20 text-cyber-yellow border-cyber-yellow", // faulty
  3: "bg-orange-500/20 text-orange-500 border-orange-500", // flag not found
  4: "bg-cyber-blue/20 text-cyber-blue border-cyber-blue", // recovering
  5: "bg-purple-500/20 text-purple-500 border-purple-500", // timeout
  "-1": "bg-gray-800 text-gray-500 border-gray-700", // not checked
};

const STATUS_LABELS = {
  0: "up",
  1: "down",
  2: "faulty",
  3: "flag not found",
  4: "recovering",
  5: "timeout",
  "-1": "not checked",
};

const SHORT_STATUS_LABELS = {
  0: "UP",
  1: "DWN",
  2: "FLT",
  3: "FLG",
  4: "RCV",
  5: "T/O",
  "-1": "UNK",
};

export const ServiceStatus: React.FC<ServiceStatusProps> = ({ status, name, compact = false }) => {
  const colorClass = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS["-1"];
  const label = STATUS_LABELS[status as keyof typeof STATUS_LABELS] || "unknown";
  const shortLabel = SHORT_STATUS_LABELS[status as keyof typeof SHORT_STATUS_LABELS] || "UNK";

  return (
    <div className={cn(
      "flex items-center justify-center border rounded px-2 py-1 font-mono transition-all duration-300 uppercase",
      colorClass,
      compact ? "text-xs w-12 h-6" : "text-sm w-full h-8"
    )} title={`${name}: ${label}`}>
      {status === 0 && (
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-current mr-2"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      <span className="font-bold tracking-wider">{compact ? shortLabel : label}</span>
    </div>
  );
};
