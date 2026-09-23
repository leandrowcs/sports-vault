const CACHE_TTL_MS = 10 * 60 * 1000;
let cachedPayload;
let cachedAt = 0;

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    if (typeof request.query?.type === 'string' && request.query.type.startsWith('nfl-')) {
      const { nflRequest } = await import('../shared/nfl.mjs');
      try {
        const payload = await nflRequest(request.query);
        response.setHeader('Cache-Control', 'no-store');
        response.status(200).json(payload);
      } catch (error) {
        response.setHeader('Cache-Control', 'no-store');
        response.status(error.status === 400 ? 400 : 502).json({ error: error.message });
      }
      return;
    }
    if (typeof request.query?.type === 'string' && request.query.type.startsWith('nba-')) {
      const nba = await import('../shared/nba.mjs');
      const type = request.query.type;
      const season = await nba.nbaSeason();
      const year = request.query.year === undefined ? season.year : Number(request.query.year);
      if (![season.year, season.year - 1].includes(year)) {
        response.status(400).json({ error: 'Temporada inválida.' });
        return;
      }
      let payload;
      if (type === 'nba-season') payload = season;
      else if (type === 'nba-teams') payload = await nba.nbaTeams();
      else if (type === 'nba-team-conferences') payload = await nba.nbaTeamConferences();
      else if (type === 'nba-last-game') payload = await nba.nbaLastGameDate(year);
      else if (type === 'nba-standings') payload = await nba.nbaStandings(year);
      else if (type === 'nba-finals') payload = await nba.nbaFinals(year);
      else if (type === 'nba-calendar' || type === 'nba-week') {
        const date = request.query.date;
        if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
          response.status(400).json({ error: 'Data inválida.' });
          return;
        }
        const end = new Date(`${date}T12:00:00Z`);
        end.setUTCDate(end.getUTCDate() + 6);
        payload = await nba.nbaCalendar(year, date, type === 'nba-week' ? end.toISOString().slice(0, 10) : undefined);
      } else if (type === 'nba-team' || type === 'nba-game') {
        const id = request.query.id;
        if (typeof id !== 'string' || !/^\d{1,12}$/.test(id)) {
          response.status(400).json({ error: 'Identificador inválido.' });
          return;
        }
        payload = type === 'nba-team' ? await nba.nbaTeamSeason(id, year, season.year) : await nba.nbaGame(id);
      } else {
        response.status(400).json({ error: 'Consulta NBA inválida.' });
        return;
      }
      response.setHeader('Cache-Control', 'no-store');
      response.status(200).json(payload);
      return;
    }
    const { loadSportsData, loadEventSummary } = await import('../shared/espn.mjs');
    if (request.query?.type === "summary") {
      const eventId = typeof request.query.eventId === "string" ? request.query.eventId : "";
      const leagueId = typeof request.query.leagueId === "string" ? request.query.leagueId : "";

      if (!eventId || !leagueId) {
        response.status(400).json({ error: "Missing eventId or leagueId" });
        return;
      }

      const summary = await loadEventSummary(leagueId, eventId);

      if (!summary) {
        response.status(404).json({ error: "Event summary not found" });
        return;
      }

      response.status(200).json(summary);
      return;
    }

    if (cachedPayload && Date.now() - cachedAt < CACHE_TTL_MS) {
      response.status(200).json(cachedPayload);
      return;
    }

    cachedPayload = await loadSportsData();
    cachedAt = Date.now();
    response.status(200).json(cachedPayload);
  } catch (error) {
    response.setHeader("Cache-Control", "no-store");
    response.status(502).json({
      error: error instanceof Error ? error.message : "Could not load sports data",
    });
  }
};
