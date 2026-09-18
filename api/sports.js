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
