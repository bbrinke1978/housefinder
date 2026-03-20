export interface SignalConfig {
  signal_type: string;
  weight: number;
  freshness_days: number; // signals older than this are excluded from score
}

export interface ScoringConfig {
  signals: SignalConfig[];
  hot_lead_threshold: number;
}

export interface ScoreResult {
  score: number;
  is_hot: boolean;
  active_signal_count: number;
  scored_signal_count: number; // signals that passed freshness check
}

export interface SignalInput {
  signal_type: string;
  recorded_date: Date | null;
  status: string;
  raw_data?: string | null;
}
