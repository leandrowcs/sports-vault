import { apiSportsProvider } from "../providers/ApiSportsProvider";
import { mockSportsProvider } from "../providers/MockSportsProvider";

export const sportsService =
  import.meta.env.VITE_USE_MOCK_SPORTS === "true" ? mockSportsProvider : apiSportsProvider;
