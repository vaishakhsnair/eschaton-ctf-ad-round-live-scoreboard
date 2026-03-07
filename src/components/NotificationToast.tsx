import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameEvent } from '../types';
import { AlertCircle, CheckCircle2, ShieldAlert, TrendingUp, Award, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface NotificationToastProps {
  event: GameEvent;
  onClose: (id: string) => void;
}

const EVENT_CONFIG = {
  attack: {
    icon: <ShieldAlert className="w-5 h-5 text-cyber-red" />,
    borderColor: "border-cyber-red/50",
    bgColor: "bg-cyber-red/10",
    label: "ATTACK"
  },
  service_down: {
    icon: <AlertCircle className="w-5 h-5 text-cyber-red" />,
    borderColor: "border-cyber-red/50",
    bgColor: "bg-cyber-red/10",
    label: "SERVICE DOWN"
  },
  service_up: {
    icon: <CheckCircle2 className="w-5 h-5 text-cyber-green" />,
    borderColor: "border-cyber-green/50",
    bgColor: "bg-cyber-green/10",
    label: "SERVICE RECOVERED"
  },
  sla_up: {
    icon: <TrendingUp className="w-5 h-5 text-cyber-blue" />,
    borderColor: "border-cyber-blue/50",
    bgColor: "bg-cyber-blue/10",
    label: "SLA GAIN"
  },
  rank_change: {
    icon: <Award className="w-5 h-5 text-cyber-yellow" />,
    borderColor: "border-cyber-yellow/50",
    bgColor: "bg-cyber-yellow/10",
    label: "RANK CHANGE"
  }
};

export const NotificationToast: React.FC<NotificationToastProps> = ({ event, onClose }) => {
  const config = EVENT_CONFIG[event.type];

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(event.id);
    }, 3000);
    return () => clearTimeout(timer);
  }, [event.id, onClose]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      className={cn(
        "flex items-start gap-4 p-4 rounded-xl border backdrop-blur-md shadow-2xl w-80 pointer-events-auto",
        config.bgColor,
        config.borderColor
      )}
    >
      <div className="shrink-0 mt-1">
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-1">
          {config.label}
        </div>
        <div className="text-sm font-display font-medium text-white leading-snug">
          {event.message}
        </div>
      </div>
      <button 
        onClick={() => onClose(event.id)}
        className="shrink-0 p-1 hover:bg-white/10 rounded transition-colors text-gray-500 hover:text-white"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

export const ToastContainer: React.FC<{ events: GameEvent[] }> = ({ events }) => {
  const [visibleEvents, setVisibleEvents] = useState<GameEvent[]>([]);
  const seenEventIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (events.length === 0) return;

    // Identify truly new events that haven't been seen in this session
    const newlyDiscoveredEvents = events.filter(e => !seenEventIdsRef.current.has(e.id));

    if (newlyDiscoveredEvents.length > 0) {
        // Mark these as seen immediately
        newlyDiscoveredEvents.forEach(e => seenEventIdsRef.current.add(e.id));

        // Only show the most recent ones if many arrived at once (e.g. first poll)
        // But if it's the very first poll, we might not want to show all 40 events as toasts.
        // Let's only show events that happened very recently (e.g. within last 30s) or just the top 3.
        const now = Date.now();
        const freshEvents = newlyDiscoveredEvents
            .filter(e => (now - e.timestamp) < 30000)
            .slice(0, 3);

        if (freshEvents.length > 0) {
            setVisibleEvents(prev => [...freshEvents, ...prev].slice(0, 5));
        }
    }
  }, [events]);

  const removeToast = (id: string) => {
    setVisibleEvents(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode='popLayout'>
        {visibleEvents.map(event => (
          <NotificationToast key={event.id} event={event} onClose={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
};
