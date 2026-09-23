import { useEffect, useState } from "react";
import { sportsService } from "../services/sportsService";
import { EventSummaryLeaders, EventSummaryStats } from "./DetailDialog";
import type { SportEvent, SportEventSummary, Team } from "../types/sports";

export function HomeEventStats({ event, home, away, basketball }: { event: SportEvent; home: Team; away: Team; basketball: boolean }) {
  const [result, setResult] = useState<{ summary: SportEventSummary | null; error: boolean } | null>(null);
  useEffect(() => {
    let active = true;
    void sportsService.getEventSummary(event).then(
      (summary) => { if (active) setResult({ summary, error: false }); },
      () => { if (active) setResult({ summary: null, error: true }); },
    );
    return () => { active = false; };
  }, [event]);
  if (!result) return <p className="statistics-scope" role="status">Carregando estatísticas...</p>;
  if (result.error) return <p className="statistics-scope" role="alert">Não foi possível carregar as estatísticas deste jogo.</p>;
  const summary = result.summary;
  const leaders = summary?.leaders.slice(0, 3) ?? [];
  const statistics = summary?.statistics.slice(0, 4) ?? [];
  return (
    <section className="home-event-stats" aria-label={`Estatísticas: ${home.name} e ${away.name}`}>
      <h4>{basketball ? "Destaques dos jogadores" : "Estatísticas do jogo"}</h4>
      {basketball ? leaders.length > 0 ? <EventSummaryLeaders leaders={leaders} /> : <p className="statistics-scope">Estatísticas dos jogadores ainda indisponíveis.</p>
        : statistics.length > 0 ? <EventSummaryStats home={home} away={away} statistics={statistics} /> : <p className="statistics-scope">Estatísticas ainda indisponíveis.</p>}
    </section>
  );
}
