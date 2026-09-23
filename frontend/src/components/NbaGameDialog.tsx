import { useEffect, useRef } from 'react';
import { useNba, seasonLabel } from '../hooks/useNba';
import { NbaQueryState, NbaTeamButton } from './NbaCommon';
import { EventSummaryStats } from './DetailDialog';
import { formatEventDetailDate, eventTimeZoneLabel } from '../helpers/eventDates';
import type { NbaGame } from '../types/nba';
import type { SportEvent, Team } from '../types/sports';
import '../pages/nba.css';

export function NbaGameDialog({ event, onClose, onTeam }: { event: SportEvent; onClose: () => void; onTeam: (team: Team) => void }) {
  const query = useNba<NbaGame>('game', { id: event.id.replace('nba-', '') }, true, event.status !== 'finished');
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const focus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    return () => { element?.close(); focus?.focus(); };
  }, []);
  const data = query.data;
  const periods = Math.max(0, ...(data?.teams.map((t) => t.periods.length) ?? []));
  return <dialog ref={dialog} className="nba-game-dialog" data-sport="nba" aria-labelledby="nba-game-title" onCancel={onClose} onClick={(e) => { if (e.target === e.currentTarget) { const rect = e.currentTarget.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) onClose(); } }}>
    <button className="dialog-close" onClick={onClose} aria-label="Fechar partida">×</button>
    <p className="eyebrow">NBA {data?.year ? `· ${seasonLabel(data.year)}` : ''}</p>
    <h2 id="nba-game-title">Detalhes da partida</h2>
    <p className="detail-copy">{formatEventDetailDate(event.startsAt)} · {eventTimeZoneLabel(new Date(event.startsAt))} · {event.venue}</p>
    <NbaQueryState query={query} />
    {data && <>
      <p className={data.live ? 'status live' : 'detail-copy'} aria-live="polite">{data.status}</p>
      <div className="nba-scoreboard">{data.teams.map((side) => <div key={side.team.id}><NbaTeamButton team={side.team} onSelect={onTeam} /><strong>{side.score}</strong></div>)}</div>
      <h3>Placar por quarto</h3>
      {periods ? <div className="nba-table-scroll" role="region" aria-label="Placar por quarto" tabIndex={0}><table className="nba-table"><thead><tr><th scope="col">Equipe</th>{Array.from({ length: periods }, (_, i) => <th key={i} scope="col">{i < 4 ? `${i + 1}º Q` : `PR ${i - 3}`}</th>)}<th scope="col">Total</th></tr></thead>
        <tbody>{data.teams.map((side) => <tr key={side.team.id}><th scope="row">{side.team.shortName}</th>{Array.from({ length: periods }, (_, i) => <td key={i}>{side.periods[i] ?? '—'}</td>)}<td><strong>{side.score}</strong></td></tr>)}</tbody>
      </table></div> : <p className="standing-empty">Pontuação por período ainda indisponível.</p>}
      <h3>Comparação coletiva</h3>
      {data.statistics.length ? <EventSummaryStats home={data.teams[0].team} away={data.teams[1].team} statistics={data.statistics} /> : <p className="standing-empty">Estatísticas disponíveis após o início da partida.</p>}
      <h3>Estatísticas dos jogadores</h3>
      <p className="statistics-scope">★ Titular · FG: quadra · 3PT: três pontos · FT: lances livres · +/-: saldo em quadra.</p>
      {!data.players.length && <p className="standing-empty">Estatísticas individuais ainda indisponíveis.</p>}
      {data.players.map((group) => <section key={group.team.id}><h4>{group.team.name}</h4>{group.tables.map((table, index) => <div key={index} className="nba-table-scroll" role="region" aria-label={`Jogadores ${group.team.name}`} tabIndex={0}><table className="nba-table nba-player-table">
        <thead><tr><th scope="col">Jogador</th>{table.labels.map((label, i) => <th key={`${label}-${i}`} scope="col">{label}</th>)}</tr></thead>
        <tbody>{table.players.map((player) => <tr key={player.id}><th scope="row">{player.starter ? '★ ' : ''}{player.name}</th>{player.didNotPlay ? <td colSpan={Math.max(1, table.labels.length)}>Não atuou</td> : table.labels.map((_, i) => <td key={i}>{player.stats[i] ?? '—'}</td>)}</tr>)}</tbody>
      </table></div>)}</section>)}
    </>}
  </dialog>;
}
