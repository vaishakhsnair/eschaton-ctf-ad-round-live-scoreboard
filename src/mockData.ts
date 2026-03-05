import { Team, GameState, Service, GameEvent } from './types';

const TEAM_NAMES = [
  "saarsec", "CzechCyberTeam", "TeamGeramy", "pwnagaukar", "Cyberlandsholdet",
  "FluxFingers", "Dragon Sector", "LC/BC", "Perfect Blue", "Katzebin"
];

const SERVICE_NAMES = [
  "birthdaygram", "birthday-melody", "cake-configurator", "evoting", "nom"
];

const STATUS_CODES = {
  UP: 0,
  DOWN: 1,
  FAULTY: 2,
  FLAG_NOT_FOUND: 3,
  RECOVERING: 4,
  TIMEOUT: 5,
  NOT_CHECKED: -1
};

function generateInitialTeams(): Team[] {
  return TEAM_NAMES.map((name, index) => {
    const services: Service[] = SERVICE_NAMES.map((svcName, i) => ({
      id: i,
      name: svcName,
      status: STATUS_CODES.UP,
      offense: Math.random() * 1000,
      defense: 0,
      sla: Math.random() * 1000
    }));

    const offense = services.reduce((acc, s) => acc + s.offense, 0);
    const defense = services.reduce((acc, s) => acc + s.defense, 0);
    const sla = services.reduce((acc, s) => acc + s.sla, 0);

    return {
      id: 233 + index,
      rank: index + 1,
      name: name,
      image: `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`,
      services,
      offense,
      defense,
      sla,
      total: offense + defense + sla,
      lastTickChange: { offense: 0, defense: 0, sla: 0 }
    };
  });
}

export const initialGameState: GameState = {
  tick: 159,
  teams: generateInitialTeams(),
  events: []
};

export function simulateTick(currentState: GameState): GameState {
  const newTick = currentState.tick + 1;
  const newEvents: GameEvent[] = [];
  
  const newTeams = currentState.teams.map(team => {
    const newServices = team.services.map(service => {
      // Randomly change status
      let newStatus = service.status;
      if (Math.random() > 0.95) {
        const statuses = Object.values(STATUS_CODES);
        const prevStatus = newStatus;
        newStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        if (prevStatus === STATUS_CODES.UP && newStatus !== STATUS_CODES.UP) {
            newEvents.push({
                id: `${newTick}-${team.id}-${service.id}-down`,
                type: 'service_down',
                message: `[${team.name}] Service ${service.name} is DOWN`,
                timestamp: Date.now()
            });
        } else if (prevStatus !== STATUS_CODES.UP && newStatus === STATUS_CODES.UP) {
            newEvents.push({
                id: `${newTick}-${team.id}-${service.id}-up`,
                type: 'service_up',
                message: `[${team.name}] Service ${service.name} RECOVERED`,
                timestamp: Date.now()
            });
        }
      }

      // Randomly add offense points
      const offenseInc = Math.random() > 0.7 ? Math.random() * 50 : 0;
      
      // Randomly subtract defense points (attack)
      const defenseDec = Math.random() > 0.8 ? -(Math.random() * 20) : 0;
      if (defenseDec < -10) {
          newEvents.push({
              id: `${newTick}-${team.id}-${service.id}-attack`,
              type: 'attack',
              message: `[${team.name}] UNDER ATTACK on ${service.name}`,
              timestamp: Date.now()
          });
      }
      
      // Randomly add SLA
      const slaInc = newStatus === STATUS_CODES.UP ? Math.random() * 10 : 0;

      return {
        ...service,
        status: newStatus,
        offense: service.offense + offenseInc,
        defense: service.defense + defenseDec,
        sla: service.sla + slaInc
      };
    });

    const offense = newServices.reduce((acc, s) => acc + s.offense, 0);
    const defense = newServices.reduce((acc, s) => acc + s.defense, 0);
    const sla = newServices.reduce((acc, s) => acc + s.sla, 0);
    const total = offense + defense + sla;

    return {
      ...team,
      services: newServices,
      offense,
      defense,
      sla,
      total,
      lastTickChange: {
        offense: offense - team.offense,
        defense: defense - team.defense,
        sla: sla - team.sla
      }
    };
  });

  // Re-rank
  newTeams.sort((a, b) => b.total - a.total);
  newTeams.forEach((team, index) => {
    team.rank = index + 1;
  });

  // Keep only last 10 events
  const allEvents = [...newEvents, ...currentState.events].slice(0, 10);

  return {
    tick: newTick,
    teams: newTeams,
    events: allEvents
  };
}
