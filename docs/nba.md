# NBA

As páginas NBA usam endpoints específicos em `/api/sports`, com normalização em `shared/nba.mjs` e cache de consultas no TanStack Query.

## Telas

- NBA: classificação por conferência, calendário por data e acesso às 30 equipes.
- Equipe: campanha e médias da temporada regular, agenda de pré-temporada/temporada regular/playoffs e elenco vigente.
- Partida: placar total e por período (incluindo prorrogações), comparação coletiva e estatísticas individuais, com identificação de titulares e jogadores que não atuaram.
- NBA e equipe: aba da temporada vigente e resumo da temporada anterior.

## Temporadas e disponibilidade

A temporada vigente vem de `scoreboard.leagues[0].season.year`; não é deduzida do mês local. O ano ESPN corresponde ao ano de encerramento da temporada. A anterior é `year - 1`.

Classificações e médias usam `seasontype=2`. As posições usam `playoffSeed`, pois a ordem bruta das equipes pode refletir divisões. Classificações de outro ano/fase são rejeitadas. Nas estatísticas de equipe, `requestedSeason` tem precedência sobre metadados atuais. Na agenda, o ano é validado por evento, com deduplicação por ID entre as três fases.

O resumo anterior não consulta elenco atual, lesões ou notícias. A partida conserva a temporada própria, incluindo jogos históricos. Dados ausentes são apresentados como indisponíveis, sem substituir a temporada nem inventar números.

Antes de começar a temporada regular, classificação e médias podem estar vazias. A agenda e o elenco continuam acessíveis. Falhas parciais na equipe preservam os demais módulos e permitem tentar novamente.

## Consultas

| `type` | Parâmetros |
| --- | --- |
| `nba-season` | — |
| `nba-teams` | — |
| `nba-team-conferences` | — (equipes agrupadas por conferência, a partir das divisões) |
| `nba-last-game` | `year` (data local do último jogo concluído com placar válido) |
| `nba-standings` | `year` |
| `nba-calendar` | `year`, `date=YYYY-MM-DD` |
| `nba-week` | `year`, `date=YYYY-MM-DD` (primeiro dia da semana) |
| `nba-team` | `year`, `id` ESPN numérico |
| `nba-game` | `id` ESPN numérico |

O servidor aceita a temporada vigente e a anterior para consultas de temporada. IDs e datas são validados. Consultas ESPN são compartilhadas por até 60 segundos. Calendário vigente e partidas não encerradas são atualizados a cada minuto enquanto a tela está ativa.

## Validação

```powershell
node --test shared/tests/*.test.mjs
npm --prefix frontend run lint
npm --prefix frontend run build
```

Os testes de dados cobrem isolamento de temporada, ordenação de conferências, scores em formatos distintos, dados ausentes, prorrogação, jogadores sem participação e totais coletivos associados à equipe correta.

A NBA no início mostra os quatro primeiros de cada conferência e duas semanas de segunda a domingo: a atual aberta e a seguinte recolhida. As semanas são calculadas no fuso `America/Toronto`; o rótulo EST/EDT acompanha a data do evento. A agenda semanal agrega sete consultas diárias em paralelo, pois o scoreboard NBA rejeita intervalos de datas.
