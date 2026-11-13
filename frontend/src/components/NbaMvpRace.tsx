import { NbaQueryState } from './NbaCommon';
import { useNba } from '../hooks/useNba';
import type { NbaMvpRace as MvpRace } from '../types/nba';

export function NbaMvpRace() {
  const race = useNba<MvpRace>('mvp');
  const data = race.data;

  return <section className="team-module nba-mvp" aria-labelledby="nba-mvp-title">
    <header><h2 id="nba-mvp-title">Corrida ao MVP</h2></header>
    <p className="statistics-scope">
      Favoritos segundo as odds da ESPN (top 25). Veja também a <a href="https://www.nba.com/news/kia-mvp-ladder" target="_blank" rel="noreferrer">Kia MVP Ladder</a> da NBA.
    </p>
    <NbaQueryState query={race} />
    {data && (data.rows.length ? <div className="nba-table-scroll nba-leaders-scroll" role="region" aria-label="Corrida ao MVP" tabIndex={0}>
      <table className="nba-table nba-leaders-table">
        <caption className="visually-hidden">Candidatos ao prêmio de MVP da NBA</caption>
        <thead><tr>{data.columns.map((name, index) => <th scope="col" key={index}>{name}</th>)}</tr></thead>
        <tbody>{data.rows.map((row, rowIndex) => <tr key={rowIndex}>
          {data.columns.map((_, index) => index === data.playerIndex
            ? <th scope="row" key={index}>{row[index]}</th>
            : <td key={index}>{row[index] || '—'}</td>)}
        </tr>)}</tbody>
      </table>
    </div> : <p className="standing-empty">Corrida ao MVP ainda indisponível.</p>)}
  </section>;
}
