export interface Service {
  id: number;
  name: string;
  status: number; // 0: OK, 1: Recovering, 2: Faulty, 3: Flag Not Found, etc.
  offense: number;
  defense: number;
  sla: number;
}

export interface Team {
  id: number;
  rank: number;
  name: string;
  image: string;
  nop?: boolean;
  services: Service[];
  offense: number;
  defense: number;
  sla: number;
  total: number;
  lastTickChange?: {
    offense: number;
    defense: number;
    sla: number;
  };
}

export interface GameEvent {
  id: string;
  type: 'attack' | 'service_down' | 'service_up' | 'sla_up' | 'rank_change';
  message: string;
  timestamp: number;
}

export interface Summary {
  up: number;
  recovering: number;
  down: number;
  unknown: number;
}

export interface GameState {
  tick: number;
  teams: Team[];
  events: GameEvent[];
  statusDescriptions?: Record<string, string>;
  services?: string[];
  summary?: Summary;
}

export interface LiveMeta {
  source: string;
  pollIntervalMs: number;
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  failures: number;
  lastError: string | null;
  endpoints: {
    scoreboard: string;
    status: string;
  };
}

export interface LiveApiResponse extends GameState {
  meta: LiveMeta;
}
