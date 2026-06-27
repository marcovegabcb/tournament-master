import { registerSportConfig } from './sport-config';

registerSportConfig({
  name: 'Football',
  icon: '⚽',
  defaultMinPlayers: 11,
  defaultMaxPlayers: 22,
  statFields: [
    { key: 'goals', label: 'Gls' },
    { key: 'assists', label: 'Ast' },
    { key: 'yellowCards', label: 'YC' },
    { key: 'redCards', label: 'RC' },
  ],
  autoCalcScore: true,
  scoreStatKey: 'goals',
  usesPenalties: true,
  statCaps: { yellowCards: 1, redCards: 1 },
  validate(home, away) {
    for (const [group, label] of [[home, 'Home'], [away, 'Away']] as const) {
      const totalA = group.reduce((sum, p) => sum + (p.stats['assists'] ?? 0), 0);
      const totalG = group.reduce((sum, p) => sum + (p.stats['goals'] ?? 0), 0);
      if (totalA > totalG) {
        return `${label} team has ${totalA} assists but only ${totalG} goals total.`;
      }
    }
    return null;
  },
});
