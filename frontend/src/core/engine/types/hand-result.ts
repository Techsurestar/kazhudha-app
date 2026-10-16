export interface HandResult {
  handNumber: number;
  winnerId: string | null;
  scores: Record<string, number>;
  kazhudhaPlayerId: string | null;
}
