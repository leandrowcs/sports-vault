import type { SportMetric } from '../helpers/sportStatistics';
export function StatisticsGrid({ metrics }: { metrics: SportMetric[] }) {
  return <div className="player-metric-grid">
    {metrics.map((metric) => <article className="player-metric-card" key={metric.key}>
      <header>
        <span>
          {metric.label}
        </span>
      </header>
      <strong>
        {metric.value === null ? '—' : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(metric.value)}
      </strong>
      {metric.value === null && <small>Não disponível</small>}
    </article>)}
  </div>;
}
