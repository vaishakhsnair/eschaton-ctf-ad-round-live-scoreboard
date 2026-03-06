import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Team, Service } from '../types';
import { ServiceStatus } from './ServiceStatus';
import { Shield, Sword, Activity, ChevronRight, X, Terminal } from 'lucide-react';
import { cn } from '../lib/utils';

interface TeamRowProps {
  team: Team;
  rank: number;
  onSelect: (team: Team) => void;
  isExpanded: boolean;
}

export const TeamRow: React.FC<TeamRowProps> = ({ team, rank, onSelect, isExpanded }) => {
  // Animation for defense drop (attacked)
  const isAttacked = (team.lastTickChange?.defense || 0) < 0;
  const isSlaUp = (team.lastTickChange?.sla || 0) > 0;
  
  return (
    <motion.div 
      layout
      layoutId={`team-${team.id}`}
      className={cn(
        "relative grid grid-cols-12 gap-4 items-center p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group",
        isAttacked && "bg-cyber-red/10"
      )}
      onClick={() => onSelect(team)}
      animate={isAttacked ? { x: [-5, 5, -5, 5, 0], transition: { duration: 0.4 } } : {}}
      transition={{ duration: 0.3 }}
    >
      {/* Rank & Identity */}
      <div className="col-span-3 flex items-center gap-4">
        <div className="w-8 h-8 flex items-center justify-center font-display font-bold text-xl text-gray-500">
          {rank}
        </div>
        <img src={team.image} alt={team.name} className="w-10 h-10 rounded bg-gray-800" />
        <div className="font-display font-bold text-lg tracking-wide text-white group-hover:text-cyber-blue transition-colors truncate">
          {team.name}
        </div>
      </div>

      {/* Services Summary */}
      <div className="col-span-4 flex gap-1 flex-wrap overflow-hidden h-6 items-center">
        {team.services.map((svc) => (
          <ServiceStatus key={svc.id} status={svc.status} name={svc.name} compact showName />
        ))}
      </div>

      {/* Stats */}
      <div className="col-span-5 grid grid-cols-4 gap-4 text-right font-mono text-sm items-center">
        <div className="text-cyber-green">
          {team.offense.toFixed(0)}
        </div>
        <div className={cn(
          "transition-colors duration-300",
          isAttacked ? "text-cyber-red font-bold" : "text-gray-300"
        )}>
          {team.defense.toFixed(0)}
        </div>
        <div className="text-cyber-blue flex items-center justify-end gap-1">
          {team.sla.toFixed(0)}
          {isSlaUp && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-cyber-green"
            >
              ▲
            </motion.div>
          )}
        </div>
        <div className="font-bold text-white text-base">
          {team.total.toFixed(0)}
        </div>
      </div>

      {/* Attack Effect Overlay */}
      <AnimatePresence>
        {isAttacked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 border border-cyber-red pointer-events-none box-border"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ... (previous imports)

// Mock history data generator (since we don't have real history in state yet)
const generateHistory = () => {
  return Array.from({ length: 20 }, (_, i) => ({
    tick: i,
    score: 40000 + Math.random() * 5000 + (i * 100),
    offense: 20000 + Math.random() * 2000 + (i * 50),
    defense: -100 - Math.random() * 50,
  }));
};

import NumberTicker from './NumberTicker';

export const TeamDetail: React.FC<{ team: Team; onClose: () => void; isLocked?: boolean; onToggleLock?: () => void }> = ({ team, onClose, isLocked, onToggleLock }) => {
  return (
    <motion.div
      layoutId={`team-${team.id}`}
      className="fixed inset-0 z-50 bg-cyber-black flex flex-col overflow-hidden"
    >
      {/* Top Bar */}
      <div className="shrink-0 flex items-center justify-between p-6 border-b border-white/10 bg-cyber-dark/50 backdrop-blur-md">
        <div className="flex items-center gap-6">
          {!isLocked && (
            <button 
              onClick={onClose}
              className="p-3 hover:bg-white/10 rounded-xl transition-colors flex items-center gap-3 text-cyber-blue"
            >
              <ChevronRight className="w-8 h-8 rotate-180" />
              <span className="font-mono text-lg uppercase tracking-widest">Back</span>
            </button>
          )}
          {isLocked && (
             <div className="flex items-center gap-3 text-cyber-red animate-pulse">
                <Activity className="w-6 h-6" />
                <span className="font-mono text-lg uppercase tracking-widest">LIVE MONITORING</span>
             </div>
          )}
        </div>
        <div className="flex items-center gap-6">
            <button
                onClick={onToggleLock}
                className={cn(
                    "px-6 py-3 rounded-lg border font-mono text-sm uppercase tracking-widest transition-colors",
                    isLocked 
                        ? "bg-cyber-red/20 border-cyber-red text-cyber-red hover:bg-cyber-red/30" 
                        : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                )}
            >
                {isLocked ? "UNLOCK" : "LOCK"}
            </button>
            <div className="font-mono text-gray-500 text-lg">
            ID: {team.id}
            </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 flex flex-col gap-8 overflow-hidden">
        
        {/* Identity Section */}
        <div className="shrink-0 flex items-center gap-8 bg-white/5 border border-white/10 rounded-2xl p-8">
            <img src={team.image} alt={team.name} className="w-32 h-32 rounded-2xl bg-gray-800 border-2 border-white/10 object-cover" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-4 mb-3">
                <span className="px-4 py-1 bg-cyber-blue/10 text-cyber-blue border border-cyber-blue/30 rounded-lg font-mono text-sm">
                  RANK #{team.rank}
                </span>
                <span className="px-4 py-1 bg-white/5 text-gray-400 border border-white/10 rounded-lg font-mono text-sm truncate">
                  10.66.{team.id}.100
                </span>
              </div>
              <h1 className="text-6xl font-display font-bold uppercase tracking-tighter text-white truncate">
                {team.name}
              </h1>
            </div>
            <div className="text-right">
                <div className="text-sm font-mono text-gray-500 uppercase tracking-widest mb-2">Total Score</div>
                <div className="text-7xl font-mono font-bold text-white tabular-nums">
                    <NumberTicker value={team.total} />
                </div>
            </div>
        </div>

        {/* Stats & Services Split */}
        <div className="flex-1 grid grid-cols-12 gap-8 min-h-0">
            
            {/* Huge Stats Column */}
            <div className="col-span-7 flex flex-col gap-6">
                <StatCardBig 
                    label="OFFENSE" 
                    value={team.offense} 
                    icon={<Sword className="w-12 h-12" />}
                    color="text-cyber-green"
                    borderColor="border-cyber-green/30"
                    delta={team.lastTickChange?.offense}
                />
                <StatCardBig 
                    label="DEFENSE" 
                    value={team.defense} 
                    icon={<Shield className="w-12 h-12" />}
                    color="text-cyber-red"
                    borderColor="border-cyber-red/30"
                    delta={team.lastTickChange?.defense}
                />
                <StatCardBig 
                    label="SLA" 
                    value={team.sla} 
                    icon={<Activity className="w-12 h-12" />}
                    color="text-cyber-blue"
                    borderColor="border-cyber-blue/30"
                    delta={team.lastTickChange?.sla}
                    pulseColor="bg-cyber-blue/20"
                    deltaColor="text-cyber-blue"
                />
            </div>

            {/* Services List Column */}
            <div className="col-span-5 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-6 shrink-0">
                    <h3 className="font-mono text-lg text-gray-400 uppercase tracking-widest">Service Health</h3>
                    <div className="px-3 py-1 bg-cyber-yellow/10 text-cyber-yellow border border-cyber-yellow/30 rounded font-mono text-sm">
                        {team.services.filter(s => s.status === 0).length} / {team.services.length} UP
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                    {team.services.map(service => (
                        <ServiceCardBig key={service.id} service={service} />
                    ))}
                </div>
            </div>
        </div>

      </div>
    </motion.div>
  );
};

const StatCardBig = ({ label, value, icon, color, borderColor, delta, pulseColor, deltaColor }: any) => (
  <div className={cn("flex-1 bg-white/5 border rounded-2xl backdrop-blur-sm flex items-center justify-between px-10 relative overflow-hidden group", borderColor)}>
    {/* Background Pulse Effect on Change */}
    {delta !== 0 && (
        <motion.div 
            key={value}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className={cn("absolute inset-0 pointer-events-none", pulseColor ? pulseColor : (delta > 0 ? "bg-cyber-green/20" : "bg-cyber-red/20"))}
        />
    )}

    <div className="flex items-center gap-8">
        <div className={cn("p-4 rounded-xl bg-black/40 border border-white/10", color.replace('text-', 'text-opacity-80 '))}>
            {icon}
        </div>
        <div>
            <div className="font-mono text-sm tracking-[0.2em] text-gray-400 mb-1">{label}</div>
            <div className={cn("text-6xl font-mono font-bold tabular-nums tracking-tight", color)}>
                <NumberTicker value={value} decimalPlaces={0} />
            </div>
        </div>
    </div>

    {delta !== undefined && delta !== 0 && (
      <div className={cn("flex flex-col items-end font-mono")}>
         <div className={cn("text-2xl font-bold", deltaColor ? deltaColor : (delta > 0 ? "text-cyber-green" : "text-cyber-red"))}>
            {delta > 0 ? "+" : ""}{delta.toFixed(0)}
         </div>
         <div className="text-xs text-gray-500 uppercase tracking-widest">Last Tick</div>
      </div>
    )}
  </div>
);

const ServiceCardBig: React.FC<{ service: Service }> = ({ service }) => (
  <div className="bg-white/5 border border-white/10 p-5 rounded-xl flex items-center justify-between group hover:border-white/30 transition-colors">
    <div className="min-w-0 flex-1 mr-6">
      <div className="font-display font-bold text-2xl mb-2 truncate text-white">{service.name}</div>
      <div className="flex gap-6 font-mono text-xs text-gray-500">
        <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyber-green"></span>
            OFF: {service.offense.toFixed(0)}
        </span>
        <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyber-red"></span>
            DEF: {service.defense.toFixed(0)}
        </span>
      </div>
    </div>
    <div className="w-28 shrink-0">
      <ServiceStatus status={service.status} name={service.name} />
    </div>
  </div>
);
