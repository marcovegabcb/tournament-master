import { registerSportConfig } from './sport-config';

registerSportConfig({
  name: 'Volleyball',
  icon: '🏐',
  defaultMinPlayers: 6,
  defaultMaxPlayers: 11,
  statFields: [
    { key: 'kills', label: 'Kills' },
    { key: 'blocks', label: 'Blk' },
    { key: 'aces', label: 'Aces' },
  ],
  autoCalcScore: false,
  scoreStatKey: '',
  useSets: true,
  setsToWin: 3,
  setPointCap: 25,
  usesGoldenSet: true,
  goldenSetPoints: 15,
});
