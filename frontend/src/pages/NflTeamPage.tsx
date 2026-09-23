import { useState } from 'react';
import { ArrowLeft, Star } from 'lucide-react';
import { useNfl, useNflSeason } from '../hooks/useNfl';
import { NflConferenceLogo, NflEvents, NflQueryState, NflSection, NflTabs } from '../components/NflCommon';
import { TeamCrest } from '../components/TeamCrest';
import type { NflEvent, NflTeamSeason } from '../types/nfl';
import type { Team } from '../types/sports';
import './nba.css';
import './nfl.css';

function TeamSeason({ team, year, current, onEvent }: { team: Team; year: number; current: boolean; onEvent: (event: NflEvent) => void }) {
  const query = useNfl<NflTeamSeason>('team', { year, id: team.espnTeamId ?? team.id.replace('nfl-', '') }, true, current);
  const [tab, setTab] = useState(0);
  const [filter, setFilter] = useState(current ? 'upcoming' : 'finished');
  const data = query.data;
  const events = data?.events.filter((e) => filter === 'all' || (filter === 'finished' ? e.status === 'finished' : e.status !== 'finished')) ?? [];
  if (filter === 'finished') events.reverse();
  return <><NflQueryState query={query} />{data && <>
    {data.warnings.length > 0 && <div className="nba-error" role="alert"><p>{data.warnings.join(' ')}</p><button onClick={() => void query.refetch()}>Atualizar dados</button></div>}
    <section className="team-module"><header><h2>Campanha · {year}</h2></header>
      {data.division && <p className="nfl-group-heading"><NflConferenceLogo name={data.division.split(' ')[0]} />{data.division}</p>}
      <p className="statistics-scope">Temporada regular{data.byeWeek ? ` · Folga na semana ${data.byeWeek}` : ''}</p>
      {data.campaign ? <div className="nba-metrics">{[['Vitórias', 'wins'], ['Derrotas', 'losses'], ['Empates', 'ties'], ['Aproveitamento', 'winPercent'], ['Casa', 'Home'], ['Fora', 'Road'], ['Pontos feitos', 'pointsFor'], ['Pontos sofridos', 'pointsAgainst']].map(([label, key]) => <article key={key}><span>{label}</span><strong>{data.campaign?.stats[key] ?? '—'}</strong></article>)}</div> : <p className="standing-empty">Campanha ainda indisponível.</p>}
    </section>
    <NflTabs label="Detalhes da equipe NFL" labels={current ? ['Agenda', 'Estatísticas', 'Elenco'] : ['Agenda', 'Estatísticas']} selected={tab} onChange={setTab}>
      {tab === 0 && <NflSection title="Agenda e resultados" open>
        <div className="competition-filters">{[['upcoming', 'Próximos'], ['finished', 'Resultados'], ['all', 'Todos']].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
        {!events.length && <p className="standing-empty">Nenhuma partida neste filtro.</p>}
        {[1, 2, 3].map((phase) => { const games = events.filter((e) => e.phase === phase); return games.length ? <NflSection key={`${filter}-${phase}`} title={`${games[0].seasonPhase} · ${games.length} jogos`} open={phase === 2}><NflEvents events={games} onSelect={onEvent} /></NflSection> : null; })}
      </NflSection>}
      {tab === 1 && <section className="team-module"><header><h2>Estatísticas da temporada regular</h2></header>
        <p className="statistics-scope">Totais, médias e percentuais conforme os rótulos da ESPN. Jardas aéreas líquidas descontam sacks sofridos.</p>
        {!data.statistics.length && <p className="standing-empty">Estatísticas ainda indisponíveis.</p>}
        {data.statistics.map((group) => <NflSection key={group.key} title={group.label} open={group.key === 'passing'}><div className="nba-metrics">{group.stats.map((stat) => <article key={stat.key}><span>{stat.label}</span><strong>{stat.value}</strong></article>)}</div></NflSection>)}
      </section>}
      {tab === 2 && current && <section className="team-module"><header><h2>Elenco vigente</h2></header>
        {!data.roster.length && <p className="standing-empty">Elenco ainda indisponível.</p>}
        {data.roster.map((group) => <NflSection key={group.key} title={`${group.label} · ${group.players.length}`} open={group.key === 'offense'}><div className="nfl-roster">{group.players.map((player) => <article key={player.id}>
          {player.photo && <img src={player.photo} alt="" loading="lazy" onError={(e) => { e.currentTarget.hidden = true; }} />}<div><strong>{player.name}</strong><p>#{player.jersey} · {player.position}{player.age ? ` · ${player.age} anos` : ''}</p><p>{[player.height, player.weight].filter(Boolean).join(' · ')}</p><small>{player.status}</small></div>
        </article>)}</div></NflSection>)}
      </section>}
    </NflTabs>
  </>}</>;
}

export function NflTeamPage({ team, saved, onBack, onToggleFavorite, onEvent }: { team: Team; saved: boolean; onBack: () => void; onToggleFavorite: () => void; onEvent: (event: NflEvent) => void }) {
  const season = useNflSeason();
  const [previous, setPrevious] = useState(0);
  return <section className="nba-page nfl-page team-vault-page" data-sport="nfl" aria-label={team.name}>
    <header className="team-vault-topbar"><button onClick={onBack} aria-label="Voltar"><ArrowLeft size={20} /></button><b>NFL</b><button onClick={onToggleFavorite} aria-label={saved ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}><Star size={20} fill={saved ? 'currentColor' : 'none'} /></button></header>
    <section className="team-hero-card"><div className="team-hero-content"><TeamCrest team={team} /><h1>{team.name}</h1><p>NFL · {team.city}</p></div></section>
    <NflQueryState query={season} />
    {season.data && <NflTabs label="Temporada da equipe NFL" labels={[`Temporada ${season.data.year}`, `Resumo ${season.data.year - 1}`]} selected={previous} onChange={setPrevious}>
      <TeamSeason key={`${team.id}-${season.data.year - previous}`} team={team} year={season.data.year - previous} current={!previous} onEvent={onEvent} />
    </NflTabs>}
  </section>;
}
