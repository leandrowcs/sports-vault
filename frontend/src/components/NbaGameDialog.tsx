import { useEffect, useRef, useState } from 'react';
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
  const [playerTeamId, setPlayerTeamId] = useState<string | null>(null);
  useEffect(() => {
    const element = dialog.current;
    const focus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    return () => { element?.close(); focus?.focus(); };
  }, []);
  const data = query.data;
  const periods = Math.max(0, ...(data?.teams.map((t) => t.periods.length) ?? []));
  const selectedPlayerTeamId = data?.players.some((group) => group.team.id === playerTeamId)
    ? playerTeamId
    : data?.players[0]?.team.id;
  const selectedPlayerTeam = data?.players.find((group) => group.team.id === selectedPlayerTeamId);
  const playerTabButtons = useRef<(HTMLButtonElement | null)[]>([]);
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
      {data.players.length > 0 && <>
      <div className="nba-tabs nba-player-tabs" role="tablist" aria-label="Times nas estatísticas dos jogadores">
        {data.players.map((group, index) => <button key={group.team.id} ref={(element) => { playerTabButtons.current[index] = element; }} id={`nba-player-team-tab-${group.team.id}`} aria-controls="nba-player-team-panel" aria-selected={selectedPlayerTeamId === group.team.id} role="tab" tabIndex={selectedPlayerTeamId === group.team.id ? 0 : -1}
          onClick={() => setPlayerTeamId(group.team.id)} onKeyDown={(keyEvent) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(keyEvent.key)) return;
            keyEvent.preventDefault();
            const next = keyEvent.key === 'Home' ? 0 : keyEvent.key === 'End' ? data.players.length - 1 : (index + (keyEvent.key === 'ArrowRight' ? 1 : data.players.length - 1)) % data.players.length;
            const nextGroup = data.players[next];
            if (nextGroup) setPlayerTeamId(nextGroup.team.id);
            playerTabButtons.current[next]?.focus();
          }} aria-label={group.team.name}>{group.team.shortName}</button>)}
      </div>
      {selectedPlayerTeam && <section id="nba-player-team-panel" role="tabpanel" aria-labelledby={`nba-player-team-tab-${selectedPlayerTeam.team.id}`}><h4>{selectedPlayerTeam.team.name}</h4>{selectedPlayerTeam.tables.map((table, index) => <div key={index} className="nba-table-scroll" role="region" aria-label={`Jogadores ${selectedPlayerTeam.team.name}`} tabIndex={0}><table className="nba-table nba-player-table">
        <thead><tr><th scope="col">Jogador</th>{table.labels.map((label, i) => <th key={`${label}-${i}`} scope="col">{label}</th>)}</tr></thead>
        <tbody>{table.players.map((player) => <tr key={player.id}><th scope="row">{player.starter ? '★ ' : ''}{player.name}</th>{player.didNotPlay ? <td colSpan={Math.max(1, table.labels.length)}>Não atuou</td> : table.labels.map((_, i) => <td key={i}>{player.stats[i] ?? '—'}</td>)}</tr>)}</tbody>
      </table></div>)}</section>}
      </>}
    </>}
  </dialog>;
}
