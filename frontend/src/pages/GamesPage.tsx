import { useState } from 'react';
import { Trophy } from 'lucide-react';
import type { GameStatus, League, SportCode, SportEvent, Team } from '../types/sports';
import { EventCard } from '../components/EventCard';
export function GamesPage({ events, getLeague, getTeam, onSelect }: { events: SportEvent[]; getLeague: (id: string) => League; getTeam: (id: string) => Team; onSelect: (event: SportEvent) => void }) {
  const [sport, setSport] = useState<SportCode | 'all'>('all');
  const [status, setStatus] = useState<GameStatus | 'all'>('all');
  const filtered = events.filter((event) => (sport === 'all' || getLeague(event.leagueId).sport === sport) && (status === 'all' || event.status === status));
  return <section aria-label="Agenda e resultados">
    <div className="page-intro">
      <h2>Agenda e resultados</h2>
      <p>Partidas por esporte e competição.</p>
    </div>
    <div className="filters" aria-label="Filtros de jogos">
      <label>Esporte<select value={sport} onChange={(event) => setSport(event.target.value as typeof sport)}>
        <option value="all">Todos os esportes</option>
        <option value="football">Futebol</option>
        <option value="basketball">Basquete</option>
        <option value="american_football">Futebol americano</option>
      </select>
      </label>
      <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
        <option value="all">Todos os jogos</option>
        <option value="live">Ao vivo</option>
        <option value="scheduled">Próximos</option>
        <option value="finished">Resultados</option>
      </select>
      </label>
    </div>
    {filtered.length ? <div className="game-list">
      {filtered.map((event) => <EventCard key={event.id} event={event} home={getTeam(event.homeTeamId)} away={getTeam(event.awayTeamId)} competition={getLeague(event.leagueId)} onSelect={onSelect} />)}
    </div> : <div className="empty-state">
      <Trophy size={25} />
      <h3>Nenhum jogo encontrado.</h3>
      <p>Altere os filtros para ampliar a agenda.</p>
    </div>}
  </section>;
}
