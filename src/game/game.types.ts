export type JourneyArea = 'village' | 'trail' | 'lighthouse' | 'coast';
export type JourneyAction = 'F' | 'H' | '';

export interface Journey {
  area: JourneyArea;
  objective: string;
  action: JourneyAction;
  dialogue: boolean;
}

export type BattlePhase = 'ready' | 'playing' | 'won' | 'lost';
export type BattleCue = 'waiting' | 'charging' | 'recovering' | 'open';
export type BattleAction = '' | 'Espacio' | 'G' | 'H';
export type GameAction = Exclude<JourneyAction | BattleAction, ''>;

export interface Battle {
  phase: BattlePhase;
  health: number;
  boss: number;
  hint: string;
  action: BattleAction;
  cue: BattleCue;
}
