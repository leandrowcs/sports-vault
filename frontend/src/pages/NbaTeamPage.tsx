import { useState } from 'react';
import { ArrowLeft, Star } from 'lucide-react';
import { useNba, useNbaSeason, seasonLabel } from '../hooks/useNba';
import { NbaCampaign, NbaEvents, NbaPanel, NbaQueryState, NbaSeasons } from '../components/NbaCommon';
import { TeamCrest } from '../components/TeamCrest';
import type { NbaEvent, NbaTeamSeason } from '../types/nba';
import type { Team } from '../types/sports';
import './nba.css';

function TeamSeason({ team, year, previous, onEvent }: { team: Team; year: number; previous: boolean; onEvent: (event: NbaEvent) => void }) {
  const query = useNba<NbaTeamSeason>('team', { year, id: team.espnTeamId ?? team.id.replace('nba-', '') });
  const [filter, setFilter] = useState(previous ? 'finished' : 'upcoming');
  const [limit, setLimit] = useState(10);
  const data = query.data;
  const events = data?.events.filter((e) => filter === 'all' || (filter === 'finished' ? e.status === 'finished' : e.status !== 'finished')) ?? [];
  if (filter === 'finished') events.reverse();
  return <>
    <NbaQueryState query={query} />
    {data && <>
      {data.warnings.length > 0 && <div className="nba-error" role="alert"><p>{data.warnings.join(' ')}</p><button onClick={() => void query.refetch()}>Atualizar dados</button></div>}
      <section className="team-module"><header><h2>{previous ? 'Resumo da campanha anterior' : 'Campanha'} · {seasonLabel(year)}</h2></header>
        <p className="statistics-scope">Temporada regular</p><NbaCampaign row={data.campaign} />
      </section>
      <section className="team-module"><header><h2>Médias da temporada regular</h2></header>
        {data.averages.length ? <div className="nba-metrics">{data.averages.map((s) => <article key={s.key}><span>{s.label}</span><strong>{s.value}</strong></article>)}</div> : <p className="standing-empty">Médias ainda não disponíveis nesta temporada.</p>}
      </section>
      <section className="team-module"><header><h2>Agenda e resultados</h2></header>
        <div className="competition-filters">{[['upcoming', 'Próximos'], ['finished', 'Resultados'], ['all', 'Todos']].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => { setFilter(value); setLimit(10); }}>{label}</button>)}</div>
        <NbaEvents events={events.slice(0, limit)} year={year} onSelect={onEvent} />
        {events.length > limit && <button className="nba-more" onClick={() => setLimit((value) => value + 10)}>Mostrar mais jogos ({events.length - limit})</button>}
      </section>
      {!previous && <section className="team-module"><header><h2>Elenco · {seasonLabel(year)}</h2></header>
        {data.roster.length ? <div className="nba-roster">{data.roster.map((a) => <article key={a.id}>
          {a.photo && <img src={a.photo} alt="" loading="lazy" onError={(e) => { e.currentTarget.hidden = true; }} />}
          <div><strong>{a.name}</strong><p>#{a.jersey} · {a.position}{a.age ? ` · ${a.age} anos` : ''}</p></div>
        </article>)}</div> : <p className="standing-empty">Elenco ainda não disponível nesta temporada.</p>}
      </section>}
    </>}
  </>;
}

export function NbaTeamPage({ team, saved, onBack, onToggleFavorite, onEvent }: { team: Team; saved: boolean; onBack: () => void; onToggleFavorite: () => void; onEvent: (event: NbaEvent) => void }) {
  const season = useNbaSeason();
  const [previous, setPrevious] = useState(false);
  return <section className="nba-page team-vault-page" data-sport="nba" aria-label={team.name}>
    <header className="team-vault-topbar"><button onClick={onBack} aria-label="Voltar"><ArrowLeft size={20} /></button><b>NBA</b><button onClick={onToggleFavorite} aria-label={saved ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}><Star size={20} fill={saved ? 'currentColor' : 'none'} /></button></header>
    <section className="team-hero-card"><div className="team-hero-content"><TeamCrest team={team} /><h1>{team.name}</h1><p>NBA · {team.city}</p></div></section>
    <NbaQueryState query={season} />
    {season.data && <><NbaSeasons current={season.data.year} previous={previous} onChange={setPrevious} />
      <NbaPanel previous={previous}><TeamSeason key={`${team.id}-${previous}`} team={team} year={season.data.year - Number(previous)} previous={previous} onEvent={onEvent} /></NbaPanel>
    </>}
  </section>;
}
