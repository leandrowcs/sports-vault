import { useState } from "react";
import type { SportEvent, Team } from "../types/sports";
export type H2HFilter = "last5" | "all";
export function HeadToHeadDialog({ teamA, teamB, events, onClose }: { teamA: Team; teamB: Team; events: SportEvent[]; onClose: () => void }) {
  const [filter, setFilter] = useState<H2HFilter>("last5");
  const meetings = events
    .filter(
      (event) =>
        event.status === "finished" &&
        ((event.homeTeamId === teamA.id && event.awayTeamId === teamB.id) ||
          (event.homeTeamId === teamB.id && event.awayTeamId === teamA.id)),
    )
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
  const tally = (list: SportEvent[]) =>
    list.reduce(
      (acc, event) => {
        const scoreA = event.homeTeamId === teamA.id ? event.homeScore ?? 0 : event.awayScore ?? 0;
        const scoreB = event.homeTeamId === teamB.id ? event.homeScore ?? 0 : event.awayScore ?? 0;
        if (scoreA > scoreB) acc.winsA += 1;
        else if (scoreB > scoreA) acc.winsB += 1;
        else acc.draws += 1;
        acc.pointsA += scoreA;
        acc.pointsB += scoreB;
        return acc;
      },
      { winsA: 0, winsB: 0, draws: 0, pointsA: 0, pointsB: 0 },
    );
  const overall = tally(meetings);
  const filtered = filter === "last5" ? meetings.slice(0, 5) : meetings;
  const total = overall.winsA + overall.winsB + overall.draws;
  const probabilityA = total > 0 ? Math.round((overall.winsA / total) * 100) : 50;
  const avgA = meetings.length ? (overall.pointsA / meetings.length).toFixed(1) : "0.0";
  const avgB = meetings.length ? (overall.pointsB / meetings.length).toFixed(1) : "0.0";
  const maxAvg = Math.max(Number(avgA), Number(avgB), 1);
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="detail-dialog h2h-dialog" role="dialog" aria-modal="true" aria-labelledby="h2h-title" onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}>
        <button className="dialog-close" onClick={onClose} aria-label="Fechar comparação">×</button>
        <p className="eyebrow">Head-to-Head Vault</p>
        <h2 id="h2h-title" className="h2h-title">
          <span className="crest" style={{ backgroundColor: teamA.color }}>{teamA.shortName.slice(0, 2)}</span>
          {teamA.name} <span>vs</span> {teamB.name}
          <span className="crest" style={{ backgroundColor: teamB.color }}>{teamB.shortName.slice(0, 2)}</span>
        </h2>
        <p className="detail-copy">
          {meetings.length} confrontos · {overall.winsA} vitórias {teamA.shortName} · {overall.draws} empates · {overall.winsB} vitórias {teamB.shortName}
        </p>
        <div className="h2h-filters" role="tablist" aria-label="Filtro temporal">
          {(["last5", "all"] as const).map((option) => (
            <button
              key={option}
              className={filter === option ? "h2h-filter active" : "h2h-filter"}
              onClick={() => setFilter(option)}
              role="tab"
              aria-selected={filter === option}
            >
              {option === "last5" ? "Últimos 5 Jogos" : "Todos os Tempos"}
            </button>
          ))}
        </div>
        <h3 className="player-section-title">Telemetria comparativa (média por jogo)</h3>
        <div className="h2h-telemetry">
          <div className="h2h-telemetry-row">
            <span>{teamA.shortName}</span>
            <div className="percentile-track"><div className="percentile-fill" style={{ width: `${(Number(avgA) / maxAvg) * 100}%`, backgroundColor: teamA.color }} /></div>
            <b>{avgA}</b>
          </div>
          <div className="h2h-telemetry-row">
            <span>{teamB.shortName}</span>
            <div className="percentile-track"><div className="percentile-fill" style={{ width: `${(Number(avgB) / maxAvg) * 100}%`, backgroundColor: teamB.color }} /></div>
            <b>{avgB}</b>
          </div>
        </div>
        <h3 className="player-section-title">Histórico de confrontos</h3>
        {filtered.length ? (
          <ul className="h2h-history">
            {filtered.map((event) => {
              const scoreA = event.homeTeamId === teamA.id ? event.homeScore ?? 0 : event.awayScore ?? 0;
              const scoreB = event.homeTeamId === teamB.id ? event.homeScore ?? 0 : event.awayScore ?? 0;
              return (
                <li key={event.id}>
                  <span>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(event.startsAt))}</span>
                  <b>{scoreA} - {scoreB}</b>
                  <span>{event.venue}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="detail-copy">Nenhum confronto registrado neste recorte.</p>
        )}
        <h3 className="player-section-title">Módulo preditivo do Vault</h3>
        <div className="h2h-prediction">
          <div className="percentile-track"><div className="percentile-fill" style={{ width: `${probabilityA}%` }} /></div>
          <p className="detail-copy">{teamA.shortName} {probabilityA}% · {teamB.shortName} {100 - probabilityA}% de probabilidade de vitória, com base no retrospecto histórico.</p>
        </div>
      </section>
    </div>
  );
}
