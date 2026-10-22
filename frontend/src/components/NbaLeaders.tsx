import { useState } from 'react';
import { NbaQueryState } from './NbaCommon';
import { useNba, seasonLabel } from '../hooks/useNba';
import type { NbaLeader } from '../types/nba';

const categories = [
  ['pointsPerGame', 'Pontos por jogo'],
  ['3PointsMadePerGame', 'Cestas de 3 por jogo'],
  ['fieldGoalPercentage', 'Aproveitamento de arremessos'],
  ['reboundsPerGame', 'Rebotes por jogo'],
  ['assistsPerGame', 'Assistências por jogo'],
  ['stealsPerGame', 'Roubos por jogo'],
  ['blocksPerGame', 'Tocos por jogo'],
] as const;

export function NbaLeaders({ year, previous }: { year: number; previous: boolean }) {
  const [category, setCategory] = useState<(typeof categories)[number][0]>('pointsPerGame');
  const label = categories.find(([key]) => key === category)?.[1] ?? categories[0][1];
  const leaders = useNba<NbaLeader[]>('leaders', { year, category }, true, !previous);

  return <section className="team-module nba-leaders" aria-labelledby={`nba-leaders-title-${year}`}>
    <header><h2 id={`nba-leaders-title-${year}`}>Líderes da temporada regular</h2></header>
    <p className="statistics-scope">Top 10 · {seasonLabel(year)} · Dados da ESPN. As estatísticas são por jogo quando indicado.</p>
    <label className="nba-leader-category">Categoria
      <select value={category} onChange={(event) => setCategory(event.target.value as (typeof categories)[number][0])}>
        {categories.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
      </select>
    </label>
    <NbaQueryState query={leaders} />
    {leaders.data?.length ? <div className="nba-table-scroll" role="region" aria-label={`Líderes NBA: ${label}`} tabIndex={0}>
      <table className="nba-table nba-leaders-table">
        <caption className="visually-hidden">Dez maiores líderes de {label.toLocaleLowerCase('pt-BR')} na temporada regular {seasonLabel(year)}</caption>
        <thead><tr><th scope="col">#</th><th scope="col">Jogador</th><th scope="col">Equipe</th><th scope="col">{label}</th></tr></thead>
        <tbody>{leaders.data.map((leader) => <tr key={leader.athleteId}>
          <td>{leader.rank}</td>
          <th scope="row">{leader.name}</th>
          <td><span className="nba-leader-team">{leader.teamAbbreviation && <strong>{leader.teamAbbreviation}</strong>}{leader.teamAbbreviation ? ' · ' : ''}{leader.teamName}</span></td>
          <td>{leader.value}</td>
        </tr>)}</tbody>
      </table>
    </div> : leaders.data && <p className="standing-empty">Líderes desta categoria ainda indisponíveis na temporada regular.</p>}
  </section>;
}
