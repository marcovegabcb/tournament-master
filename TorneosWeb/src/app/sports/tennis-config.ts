import { registerSportConfig } from './sport-config';

registerSportConfig({
  name: 'Tennis',
  icon: '🎾',
  statFields: [
    { key: 'aces', label: 'Aces' },
    { key: 'doubleFaults', label: 'DF' },
    { key: 'winners', label: 'Wins' },
  ],
  autoCalcScore: false,
  scoreStatKey: '',
  useSets: true,
  setsToWin: 3,
});
