import React, { useEffect, useRef, useState } from 'react';
import { GameState, LiveApiResponse, LiveMeta, Team } from './types';
import { TeamRow, TeamDetail } from './components/TeamComponents';
import { Ticker } from './components/Ticker';
import { ToastContainer } from './components/NotificationToast';
import { AnimatePresence } from 'motion/react';
import { Clock, Play, Pause, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from './lib/utils';
import eventLogo from '../mcsc-logo.png';

const EMPTY_GAME_STATE: GameState = {
  tick: 0,
  teams: [],
  events: [],
};

const parsedPollInterval = Number(import.meta.env.VITE_LIVE_SCORE_UI_POLL_INTERVAL_MS || 2500);
const UI_POLL_INTERVAL_MS = Number.isFinite(parsedPollInterval) && parsedPollInterval > 0 ? parsedPollInterval : 2500;

export default function App() {
  const [gameState, setGameState] = useState<GameState>(EMPTY_GAME_STATE);
  const [meta, setMeta] = useState<LiveMeta | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [autoFocus, setAutoFocus] = useState(false);
  const [isViewLocked, setIsViewLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastUiUpdateAt, setLastUiUpdateAt] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isRequestInFlightRef = useRef(false);
  const appliedTeamUrlParamRef = useRef(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    let isCancelled = false;

    async function fetchLiveState() {
      if (isRequestInFlightRef.current) {
        return;
      }
      isRequestInFlightRef.current = true;
      setIsRefreshing(true);

      try {
        const response = await fetch('/api/live', {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
          },
        });

        const raw = await response.text();
        let payload: unknown = null;
        if (raw) {
          try {
            payload = JSON.parse(raw);
          } catch {
            payload = raw;
          }
        }

        if (!response.ok) {
          const responseError = typeof payload === 'object' && payload !== null && 'error' in payload
            ? String((payload as { error: unknown }).error)
            : `Request failed with HTTP ${response.status}`;
          throw new Error(responseError);
        }

        const liveData = payload as LiveApiResponse;

        if (isCancelled) {
          return;
        }

        setGameState({
          tick: Number(liveData.tick || 0),
          teams: Array.isArray(liveData.teams) ? liveData.teams : [],
          events: Array.isArray(liveData.events) ? liveData.events : [],
          statusDescriptions: liveData.statusDescriptions || {},
          services: Array.isArray(liveData.services) ? liveData.services : [],
          summary: liveData.summary,
        });
        setMeta(liveData.meta || null);
        setFetchError(null);
        setLastUiUpdateAt(Date.now());
      } catch (error) {
        if (!isCancelled) {
          setFetchError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
        isRequestInFlightRef.current = false;
      }
    }

    void fetchLiveState();
    const interval = window.setInterval(() => {
      void fetchLiveState();
    }, UI_POLL_INTERVAL_MS);

    return () => {
      isCancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (selectedTeamId === null) {
      return;
    }
    const stillExists = gameState.teams.some((team) => team.id === selectedTeamId);
    if (!stillExists) {
      setSelectedTeamId(null);
      setIsViewLocked(false);
    }
  }, [gameState.teams, selectedTeamId]);

  const selectedTeam: Team | null =
    selectedTeamId === null ? null : gameState.teams.find((team) => team.id === selectedTeamId) || null;

  const autoFocusIndexRef = useRef(-1);
  const gameStateRef = useRef(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (!autoFocus || isViewLocked) {
      return;
    }

    const interval = window.setInterval(() => {
      const teams = gameStateRef.current.teams;
      if (teams.length === 0) return;

      const teamPoolSize = Math.min(teams.length, 10);
      
      if (autoFocusIndexRef.current === -1) {
        // We are on scoreboard, move to first team
        const team = teams[0];
        setSelectedTeamId(team.id);
        autoFocusIndexRef.current = 0;
      } else if (autoFocusIndexRef.current < teamPoolSize - 1) {
        // Move to next team
        autoFocusIndexRef.current += 1;
        const team = teams[autoFocusIndexRef.current];
        setSelectedTeamId(team.id);
      } else {
        // Back to scoreboard
        setSelectedTeamId(null);
        autoFocusIndexRef.current = -1;
      }
    }, 10000);

    return () => window.clearInterval(interval);
  }, [autoFocus, isViewLocked]);

  // Sync index ref if selectedTeamId changes externally (e.g. user clicks)
  useEffect(() => {
    if (!autoFocus) return;
    if (selectedTeamId === null) {
      autoFocusIndexRef.current = -1;
    } else {
      const idx = gameState.teams.findIndex(t => t.id === selectedTeamId);
      if (idx !== -1 && idx < 10) {
        autoFocusIndexRef.current = idx;
      }
    }
  }, [selectedTeamId, autoFocus, gameState.teams]);

  useEffect(() => {
    if (appliedTeamUrlParamRef.current || gameState.teams.length === 0) {
      return;
    }
    appliedTeamUrlParamRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const teamIdParam = params.get('team');
    if (!teamIdParam) {
      return;
    }

    const teamId = Number(teamIdParam);
    if (!Number.isFinite(teamId)) {
      return;
    }

    const team = gameState.teams.find((item) => item.id === teamId);
    if (team) {
      setSelectedTeamId(team.id);
      setIsViewLocked(true);
      setAutoFocus(false);
    }
  }, [gameState.teams]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (isViewLocked && selectedTeamId !== null) {
      url.searchParams.set('team', selectedTeamId.toString());
    } else if (!isViewLocked) {
      url.searchParams.delete('team');
    }
    window.history.replaceState({}, '', url);
  }, [isViewLocked, selectedTeamId]);

  const summary = gameState.summary || { up: 0, recovering: 0, down: 0, unknown: 0 };
  const lastSuccessLabel = meta?.lastSuccessAt ? new Date(meta.lastSuccessAt).toLocaleTimeString() : 'n/a';
  const sourceLabel = meta?.source || 'disconnected';

  return (
    <div className="min-h-screen bg-cyber-black text-white selection:bg-cyber-green/30 pb-16 relative overflow-hidden">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />
      <div className="scanlines" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <header className="flex items-center justify-between mb-12 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-cyber-green/10 rounded-lg border border-cyber-green/20">
              <img
                src={eventLogo}
                alt="Eschaton CTF AD Round"
                className="w-14 h-14 object-contain"
              />
            </div>
            <div>
              <h1 className="text-4xl font-display font-bold tracking-tighter uppercase">
                Eschaton<span className="text-cyber-green"> CTF AD Round</span>
              </h1>
              <p className="text-gray-500 font-mono text-sm tracking-widest">OFFICIAL LIVE SCOREBOARD</p>
            </div>
          </div>
          
          <div className="flex items-center gap-8 flex-wrap justify-end">
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
                <select 
                    className="bg-white/5 border border-white/10 text-gray-300 font-mono text-sm rounded px-3 py-2 focus:outline-none focus:border-cyber-blue"
                    onChange={(e) => {
                        const teamId = Number(e.target.value);
                        const team = gameState.teams.find(t => t.id === teamId);
                        if (team) {
                            setSelectedTeamId(team.id);
                            setIsViewLocked(true);
                            setAutoFocus(false);
                        }
                    }}
                    value={selectedTeamId ?? ''}
                    disabled={gameState.teams.length === 0}
                >
                    <option value="" disabled>Select Team to Monitor...</option>
                    {gameState.teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
            </div>

            <button
              onClick={() => {
                setAutoFocus(!autoFocus);
                if (autoFocus) setSelectedTeamId(null);
                setIsViewLocked(false);
              }}
              disabled={gameState.teams.length === 0}
              className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded border font-mono text-sm uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                  autoFocus 
                  ? "bg-cyber-blue/20 border-cyber-blue text-cyber-blue" 
                  : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
              )}
            >
              {autoFocus ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {autoFocus ? "Stop Auto-Focus" : "Start Auto-Focus"}
            </button>

            <div className="text-right">
              <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-1">Feed</div>
              <div
                className={cn(
                  "font-mono text-sm uppercase",
                  fetchError ? 'text-cyber-red' : sourceLabel === 'remote' ? 'text-cyber-green' : 'text-cyber-yellow'
                )}
              >
                {sourceLabel}
                {isRefreshing ? ' · refreshing' : ''}
              </div>
              <div className="text-xs font-mono text-gray-500">
                last success: {lastSuccessLabel}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-1">Current Tick</div>
              <div className="text-3xl font-mono font-bold text-cyber-blue flex items-center justify-end gap-2">
                <Clock className="w-5 h-5 animate-pulse" />
                {gameState.tick}
              </div>
            </div>
          </div>
        </header>

        <div className="mb-4 font-mono text-xs uppercase tracking-widest text-gray-500 flex flex-wrap gap-6">
          <span>Services Up: <span className="text-cyber-green">{summary.up}</span></span>
          <span>Recovering: <span className="text-cyber-blue">{summary.recovering}</span></span>
          <span>Down/Faulty: <span className="text-cyber-red">{summary.down}</span></span>
          <span>Unknown: <span className="text-gray-400">{summary.unknown}</span></span>
          <span>UI Refresh: <span className="text-gray-300">{lastUiUpdateAt ? new Date(lastUiUpdateAt).toLocaleTimeString() : 'n/a'}</span></span>
        </div>

        {fetchError && (
          <div className="mb-6 p-3 bg-cyber-red/10 border border-cyber-red/30 text-cyber-red font-mono text-xs uppercase tracking-wider">
            Feed error: {fetchError}
          </div>
        )}

        <div className="grid grid-cols-12 gap-4 px-4 py-2 font-mono text-xs text-gray-500 uppercase tracking-widest border-b border-white/10 mb-2">
          <div className="col-span-3">Team</div>
          <div className="col-span-4">Service Status</div>
          <div className="col-span-5 grid grid-cols-4 gap-4 text-right">
            <div>Offense</div>
            <div>Defense</div>
            <div>SLA</div>
            <div>Total</div>
          </div>
        </div>

        <div className="space-y-1">
          <AnimatePresence mode='popLayout'>
            {gameState.teams.map((team) => (
                <TeamRow
                key={team.id}
                team={team}
                rank={team.rank}
                onSelect={(teamToSelect) => {
                    setAutoFocus(false);
                    setSelectedTeamId(teamToSelect.id);
                    setIsViewLocked(false);
                }}
                isExpanded={false}
                />
            ))}
          </AnimatePresence>
        </div>

        {!isLoading && gameState.teams.length === 0 && (
          <div className="mt-6 p-6 border border-white/10 bg-white/5 rounded-xl text-center font-mono text-sm text-gray-400 uppercase tracking-wider">
            No team data available yet. Backend may still be syncing.
          </div>
        )}
      </div>

      <Ticker events={gameState.events} />
      <ToastContainer events={gameState.events} />

      <AnimatePresence>
        {selectedTeam && (
          <TeamDetail 
            team={selectedTeam} 
            isLocked={isViewLocked}
            onToggleLock={() => setIsViewLocked(!isViewLocked)}
            onClose={() => {
              if (!isViewLocked) {
                setSelectedTeamId(null);
                setAutoFocus(false);
              }
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
