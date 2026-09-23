import { useEffect, useRef, useState } from 'react';
import { useNfl } from '../hooks/useNfl';
import { NflQueryState, NflSection, NflTabs, NflTeamButton } from './NflCommon';
import { EventSummaryStats } from './DetailDialog';
import { formatEventDetailDate, eventTimeZoneLabel } from '../helpers/eventDates';
import type { NflGame } from '../types/nfl';
import type { SportEvent, Team } from '../types/sports';
import '../pages/nba.css';
import '../pages/nfl.css';

export function NflGameDialog({ event, onClose, onTeam }: { event: SportEvent; onClose: () => void; onTeam: (team: Team) => void }) {
  const query = useNfl<NflGame>('game', { id: event.id.replace('nfl-', '') }, true, event.status !== 'finished');
  const dialog = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState(0);
  useEffect(() => {
    const element = dialog.current;
    const focus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    return () => { element?.close(); focus?.focus(); };
  }, []);
  const data = query.data;
  const periods = Math.max(4, ...(data?.teams.map((t) => t.periods.length) ?? []));
  return <dialog ref={dialog} className="nba-game-dialog nfl-page" data-sport="nfl" aria-labelledby="nfl-game-title" onCancel={onClose} onClick={(e) => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) onClose();
  }}>
    <button className="dialog-close" onClick={onClose} aria-label="Fechar partida">×</button>
    <p className="eyebrow">NFL {data?.year ? `· ${data.year}` : ''}</p><h2 id="nfl-game-title">Detalhes da partida</h2>
    <p className="detail-copy">{formatEventDetailDate(event.startsAt)} · {eventTimeZoneLabel(new Date(event.startsAt))} · {event.venue}</p>
    <NflQueryState query={query} />
    {data && <>
      <p className={data.live ? 'status live' : 'detail-copy'} aria-live="polite">{data.status}</p>
      <div className="nba-scoreboard">{data.teams.map((side) => <div key={side.team.id}><NflTeamButton team={side.team} onSelect={onTeam} /><strong>{side.score}</strong></div>)}</div>
      <NflTabs label="Detalhes da partida NFL" labels={['Placar', 'Estatísticas', 'Jogadores']} selected={tab} onChange={setTab}>
        {tab === 0 && <NflSection title="Placar por quarto" open><div className="nba-table-scroll" role="region" aria-label="Placar por quarto" tabIndex={0}><table className="nba-table"><thead><tr><th scope="col">Equipe</th>{Array.from({ length: periods }, (_, i) => <th key={i} scope="col">{i < 4 ? `${i + 1}º Q` : `PR ${i - 3}`}</th>)}<th scope="col">Total</th></tr></thead><tbody>
          {data.teams.map((side) => <tr key={side.team.id}><th scope="row"><NflTeamButton team={side.team} onSelect={onTeam} /></th>{Array.from({ length: periods }, (_, i) => <td key={i}>{side.periods[i] ?? '—'}</td>)}<td><strong>{side.score}</strong></td></tr>)}
        </tbody></table></div></NflSection>}
        {tab === 1 && <NflSection title="Comparação coletiva" open>{data.statistics.length ? <EventSummaryStats home={data.teams[0].team} away={data.teams[1].team} statistics={data.statistics} /> : <p className="standing-empty">Estatísticas ainda indisponíveis para esta partida.</p>}</NflSection>}
        {tab === 2 && <>
          <p className="statistics-scope">YDS: jardas · TD: touchdowns · INT: interceptações · CAR: corridas · REC: recepções · C/ATT: passes completos/tentados.</p>
          {!data.players.length && <p className="standing-empty">Estatísticas individuais ainda indisponíveis.</p>}
          {data.players.map((group) => <NflSection key={group.team.id} title={group.team.name} open>
            <NflTeamButton team={group.team} onSelect={onTeam} />
            {group.tables.map((table) => <NflSection key={table.key} title={table.label} open={table.key === 'passing'}>
              {table.players.length ? <div className="nba-table-scroll" role="region" aria-label={`${group.team.name} · ${table.label}`} tabIndex={0}><table className="nba-table nba-player-table"><thead><tr><th scope="col">Jogador</th>{table.labels.map((label, i) => <th key={`${label}-${i}`} scope="col">{label}</th>)}</tr></thead><tbody>
                {table.players.map((player) => <tr key={player.id}><th scope="row">{player.name}</th>{player.didNotPlay ? <td colSpan={Math.max(1, table.labels.length)}>Não atuou</td> : table.labels.map((_, i) => <td key={i}>{player.stats[i] ?? '—'}</td>)}</tr>)}
              </tbody></table></div> : <p className="standing-empty">Nenhum jogador nesta categoria.</p>}
            </NflSection>)}
          </NflSection>)}
        </>}
      </NflTabs>
    </>}
  </dialog>;
}
