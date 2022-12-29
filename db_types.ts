export interface allTimeObject {
  name: string;
  total_games: number;
  total_wins: number;
  playoff_games: number;
  playoff_wins: number;
  total_points_for: number;
  total_points_against: number;
  high_point_weeks: number;
  low_point_weeks: number;
  transactions: number;
  trades: number;
  championships: number;
  playoff_births: number;
  total_seasons: number;
}

export interface seasonDetailsObject {
  manager_name: string;
  total_games: number;
  total_wins: number;
  playoff_games: number;
  playoff_wins: number;
  total_points_for: number;
  total_points_against: number;
  high_point_weeks: number;
  low_point_weeks: number;
  championships: number;
}
export interface gameDetailsObject {
  week: number;
  home_score: number;
  away_score: number;
  home_manager_name: string;
  home_team: string;
  home_logo: string;
  home_seed: number;
  away_manager_name: string;
  away_team: string;
  away_logo: string;
  away_seed: number;
  is_playoffs: boolean;
  is_winners_bracket: boolean;
  is_toilet_bowl: boolean;
  is_bye_week: boolean;
  high_point: string;
  low_point: string;
}

export interface headToHeadObject {
  name: string;
  total_games: number;
  total_wins: number;
  playoff_games: number;
  playoff_wins: number;
  total_points_for: number;
  total_points_against: number;
  high_point_weeks: number;
  low_point_weeks: number;
  transactions: number;
  trades: number;
  championships: number;
  playoff_births: number;
  total_seasons: number;
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export interface Database {
  public: {
    Tables: {
      game: {
        Row: {
          year: number
          created_at: string | null
          week: number
          home_team: number
          away_team: number | null
          home_score: number | null
          away_score: number | null
          is_playoffs: boolean
          home_seed: number | null
          away_seed: number | null
          is_winners_bracket: boolean
          is_toilet_bowl: boolean
          is_bye_week: boolean
          winning_team: number | null
        }
        Insert: {
          year?: number
          created_at?: string | null
          week: number
          home_team: number
          away_team?: number | null
          home_score?: number | null
          away_score?: number | null
          is_playoffs: boolean
          home_seed?: number | null
          away_seed?: number | null
          is_winners_bracket: boolean
          is_toilet_bowl: boolean
          is_bye_week: boolean
          winning_team?: number | null
        }
        Update: {
          year?: number
          created_at?: string | null
          week?: number
          home_team?: number
          away_team?: number | null
          home_score?: number | null
          away_score?: number | null
          is_playoffs?: boolean
          home_seed?: number | null
          away_seed?: number | null
          is_winners_bracket?: boolean
          is_toilet_bowl?: boolean
          is_bye_week?: boolean
          winning_team?: number | null
        }
      }
      high_point: {
        Row: {
          year: number
          created_at: string | null
          week: number
          high_point_manager: number | null
          low_point_manager: number | null
          high_point: number | null
          low_point: number | null
        }
        Insert: {
          year?: number
          created_at?: string | null
          week: number
          high_point_manager?: number | null
          low_point_manager?: number | null
          high_point?: number | null
          low_point?: number | null
        }
        Update: {
          year?: number
          created_at?: string | null
          week?: number
          high_point_manager?: number | null
          low_point_manager?: number | null
          high_point?: number | null
          low_point?: number | null
        }
      }
      manager: {
        Row: {
          id: number
          created_at: string
          name: string
        }
        Insert: {
          id?: number
          created_at?: string
          name: string
        }
        Update: {
          id?: number
          created_at?: string
          name?: string
        }
      }
      season: {
        Row: {
          year: number
          created_at: string | null
          teams: number[]
          champ: number | null
          divisions: number
          regular_season_weeks: number
          playoff_team_count: number
          toilet_bowl_champ: number | null
        }
        Insert: {
          year?: number
          created_at?: string | null
          teams: number[]
          champ?: number | null
          divisions: number
          regular_season_weeks: number
          playoff_team_count: number
          toilet_bowl_champ?: number | null
        }
        Update: {
          year?: number
          created_at?: string | null
          teams?: number[]
          champ?: number | null
          divisions?: number
          regular_season_weeks?: number
          playoff_team_count?: number
          toilet_bowl_champ?: number | null
        }
      }
      team: {
        Row: {
          created_at: string
          manager: number
          team_name: string
          division: number
          made_playoffs: boolean
          transactions: number | null
          trades: number | null
          logo: string | null
          playoff_seed: number | null
          year: number
        }
        Insert: {
          created_at?: string
          manager: number
          team_name: string
          division: number
          made_playoffs: boolean
          transactions?: number | null
          trades?: number | null
          logo?: string | null
          playoff_seed?: number | null
          year: number
        }
        Update: {
          created_at?: string
          manager?: number
          team_name?: string
          division?: number
          made_playoffs?: boolean
          transactions?: number | null
          trades?: number | null
          logo?: string | null
          playoff_seed?: number | null
          year?: number
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      all_time: {
        Args: Record<PropertyKey, never>
        Returns: allTimeObject
      }
      head_to_head: {
        Args: { team_one: number; team_two: number }
        Returns: headToHeadObject
      }
      head_to_head_matchups: {
        Args: { team_one: number; team_two: number }
        Returns: gameDetailsObject
      }
      season_details: {
        Args: { season_year: number }
        Returns: seasonDetailsObject
      }
      week_matchups: {
        Args: { season_year: number; selected_week: number }
        Returns: gameDetailsObject
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
