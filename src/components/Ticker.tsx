import React from 'react';
import { motion } from 'motion/react';
import { GameEvent } from '../types';
import { AlertTriangle, ArrowUpDown, CheckCircle, ShieldAlert, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';

interface TickerProps {
  events: GameEvent[];
}

export const Ticker: React.FC<TickerProps> = ({ events }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-cyber-dark border-t border-white/10 h-12 flex items-center overflow-hidden z-40">
      <div className="px-4 bg-cyber-blue/10 h-full flex items-center border-r border-white/10 font-mono text-cyber-blue text-sm font-bold tracking-widest uppercase shrink-0">
        Eschaton Feed
      </div>
      <div className="flex-1 overflow-hidden relative flex items-center">
        <motion.div 
          className="flex items-center gap-12 whitespace-nowrap absolute"
          animate={{ x: ["100%", "-100%"] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        >
          {events.map((event) => (
            <div key={event.id} className="flex items-center gap-2 font-mono text-sm">
              {event.type === 'attack' && <ShieldAlert className="w-4 h-4 text-cyber-red" />}
              {event.type === 'service_down' && <AlertTriangle className="w-4 h-4 text-cyber-yellow" />}
              {event.type === 'service_up' && <CheckCircle className="w-4 h-4 text-cyber-green" />}
              {event.type === 'sla_up' && <TrendingUp className="w-4 h-4 text-cyber-blue" />}
              {event.type === 'rank_change' && <ArrowUpDown className="w-4 h-4 text-white" />}
              
              <span className={cn(
                event.type === 'attack' && "text-cyber-red",
                event.type === 'service_down' && "text-cyber-yellow",
                event.type === 'service_up' && "text-cyber-green",
                event.type === 'sla_up' && "text-cyber-blue",
                event.type === 'rank_change' && "text-white",
              )}>
                {event.message}
              </span>
              <span className="text-gray-600 mx-2">///</span>
            </div>
          ))}
          {events.length === 0 && (
            <span className="text-gray-500 italic">Waiting for game events...</span>
          )}
        </motion.div>
      </div>
    </div>
  );
};
