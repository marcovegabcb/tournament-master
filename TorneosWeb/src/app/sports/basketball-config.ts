import { registerSportConfig } from './sport-config';

registerSportConfig({
  name: 'Basketball',
  icon: '🏀',
  defaultMinPlayers: 5,
  defaultMaxPlayers: 15,
  statFields: [
    { key: 'points', label: 'Pts' },
    { key: 'rebounds', label: 'Reb' },
    { key: 'assists', label: 'Ast' },
  ],
  autoCalcScore: true,
  scoreStatKey: 'points',
});
