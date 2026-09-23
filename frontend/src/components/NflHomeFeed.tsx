import { useNflSeason } from '../hooks/useNfl';
import { NflQueryState } from './NflCommon';
import { NflSchedule } from '../pages/NflPage';
import type { SportEvent } from '../types/sports';

export function NflHomeFeed({ onSelectEvent, onViewStandings }: { onSelectEvent: (event: SportEvent) => void; onViewStandings: () => void }) {
  const season = useNflSeason();
  return <div className="nba-page nfl-page" data-sport="nfl"><button className="nba-more" onClick={onViewStandings}>Ver classificação por divisão</button><NflQueryState query={season} />
    {season.data && <NflSchedule key={season.data.year} year={season.data.year} season={season.data} onEvent={onSelectEvent} />}
  </div>;
}
