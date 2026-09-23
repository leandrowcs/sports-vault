# NFL

Integração específica em `shared/nfl.mjs`, exposta por `/api/sports?type=nfl-*`. As consultas React usam TanStack Query; a página, equipe e partida são carregadas sob demanda.

## Telas

- NFL: abas da temporada atual/anterior, AFC/NFC e divisões dentro de cada conferência, exibindo uma divisão por vez e lembrando a seleção ao alternar conferências. As oito divisões vêm do catálogo ESPN, com classificação da temporada regular. As linhas seguem `playoffSeed`; a coluna Seed indica a posição na conferência, não uma posição calculada na divisão.
- Agenda semanal: seleção de fase e semana a partir do calendário ESPN. Também usada na home. Horários em Toronto (EST/EDT).
- Equipe: campanha, folga e abas Agenda/Estatísticas/Elenco. Agenda inclui as três fases. Estatísticas mantêm as categorias ESPN para distinguir sacks sofridos de sacks defensivos. O elenco vigente é separado por ataque, defesa, special teams e situações de reserva.
- Partida: abas Placar/Estatísticas/Jogadores, quartos e prorrogações, comparação coletiva e tabelas individuais por categoria.
- Touchdowns: comparação de totais, aéreos, terrestres e defesa/special teams. Passe e corrida usam os totais das respectivas categorias do boxscore; recepções não são somadas novamente. O total prioriza o campo coletivo, depois as jogadas de touchdown e, na ausência delas, a soma das categorias quando todas estão disponíveis. Dados ausentes permanecem “—”.
- Agendas, categorias estatísticas e grupos do elenco podem ser expandidos/recolhidos. Abas suportam setas, Home e End. O diálogo usa foco e Escape nativos.

## Temporadas e dados ausentes

O ano vem de `scoreboard.leagues[0].season.year` (NFL 2026, não 2026/27). As consultas de temporada aceitam a vigente e a anterior; partidas preservam sua própria temporada.

Classificação valida ano/fase. Estatísticas priorizam `requestedSeason`; eventos da agenda validam seu ano e fase. O resumo anterior não consulta elenco vigente. Placar ausente aparece como “—”, sem fabricar zero. Falhas parciais da equipe preservam os demais módulos e oferecem nova tentativa.

Cache ESPN: 60 segundos, compartilhando requisições em andamento. Consultas atuais de agenda, classificação e equipe atualizam a cada minuto enquanto ativas; partidas não encerradas também. As rotas respondem com `Cache-Control: no-store`.

## Rotas

| type | Parâmetros |
| --- | --- |
| nfl-season | — |
| nfl-calendar | year |
| nfl-standings | year |
| nfl-week | year, phase (1/2/3), week válido no calendário |
| nfl-team | year, id ESPN numérico |
| nfl-game | id ESPN numérico |

## Logos

Equipes usam os logos dos payloads ESPN. AFC/NFC usam cópias locais dos assets ESPN (`https://a.espncdn.com/i/teamlogos/nfl/500/afc.png` e `nfc.png`) em `frontend/public/conferences/`.

O catálogo de divisões consultado não fornece logos próprios. Cada divisão mostra seu nome e o logo da conferência; se a ESPN fornecer um logo da divisão, ele tem preferência. Nenhuma marca de divisão foi inventada.

Drives e jogadas ficam fora desta etapa.

## Validação

`node --test shared/tests/*.test.mjs`

`npm --prefix frontend run lint`

`npm --prefix frontend run build`

Testes NFL cobrem isolamento de ano/fase/semana, classificação por divisão e seed, scores ausentes, prorrogações, associação das estatísticas por ID, categorias individuais, falhas parciais, histórico sem elenco atual e validação dos parâmetros.
