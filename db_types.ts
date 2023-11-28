export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      albums_of_the_year: {
        Row: {
          album: string
          album_art_url: string
          apple_link: string
          artist: string
          blurb: string | null
          created_at: string
          id: number
          rank: number
          spotify_link: string
          vinyl_link: string | null
          year: number
        }
        Insert: {
          album: string
          album_art_url: string
          apple_link: string
          artist: string
          blurb?: string | null
          created_at?: string
          id?: number
          rank: number
          spotify_link: string
          vinyl_link?: string | null
          year: number
        }
        Update: {
          album?: string
          album_art_url?: string
          apple_link?: string
          artist?: string
          blurb?: string | null
          created_at?: string
          id?: number
          rank?: number
          spotify_link?: string
          vinyl_link?: string | null
          year?: number
        }
        Relationships: []
      }
      game: {
        Row: {
          away_score: number | null
          away_seed: number | null
          away_team: number | null
          created_at: string | null
          home_score: number | null
          home_seed: number | null
          home_team: number
          is_bye_week: boolean
          is_playoffs: boolean
          is_toilet_bowl: boolean
          is_winners_bracket: boolean
          week: number
          winning_team: number | null
          year: number
        }
        Insert: {
          away_score?: number | null
          away_seed?: number | null
          away_team?: number | null
          created_at?: string | null
          home_score?: number | null
          home_seed?: number | null
          home_team: number
          is_bye_week: boolean
          is_playoffs: boolean
          is_toilet_bowl: boolean
          is_winners_bracket: boolean
          week: number
          winning_team?: number | null
          year?: number
        }
        Update: {
          away_score?: number | null
          away_seed?: number | null
          away_team?: number | null
          created_at?: string | null
          home_score?: number | null
          home_seed?: number | null
          home_team?: number
          is_bye_week?: boolean
          is_playoffs?: boolean
          is_toilet_bowl?: boolean
          is_winners_bracket?: boolean
          week?: number
          winning_team?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_away_team_fkey"
            columns: ["away_team"]
            isOneToOne: false
            referencedRelation: "manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_home_team_fkey"
            columns: ["home_team"]
            isOneToOne: false
            referencedRelation: "manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_winning_team_fkey"
            columns: ["winning_team"]
            isOneToOne: false
            referencedRelation: "manager"
            referencedColumns: ["id"]
          }
        ]
      }
      high_point: {
        Row: {
          created_at: string | null
          high_point: number | null
          high_point_manager: number | null
          low_point: number | null
          low_point_manager: number | null
          week: number
          year: number
        }
        Insert: {
          created_at?: string | null
          high_point?: number | null
          high_point_manager?: number | null
          low_point?: number | null
          low_point_manager?: number | null
          week: number
          year?: number
        }
        Update: {
          created_at?: string | null
          high_point?: number | null
          high_point_manager?: number | null
          low_point?: number | null
          low_point_manager?: number | null
          week?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "high_point_high_point_manager_fkey"
            columns: ["high_point_manager"]
            isOneToOne: false
            referencedRelation: "manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "high_point_low_point_manager_fkey"
            columns: ["low_point_manager"]
            isOneToOne: false
            referencedRelation: "manager"
            referencedColumns: ["id"]
          }
        ]
      }
      manager: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: number
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: number
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      music_history: {
        Row: {
          album_art_url: string
          apple_music_url: string
          artist: string
          created_at: string
          id: number
          title: string
          type: string
        }
        Insert: {
          album_art_url: string
          apple_music_url: string
          artist: string
          created_at?: string
          id?: number
          title: string
          type: string
        }
        Update: {
          album_art_url?: string
          apple_music_url?: string
          artist?: string
          created_at?: string
          id?: number
          title?: string
          type?: string
        }
        Relationships: []
      }
      season: {
        Row: {
          champ: number | null
          created_at: string | null
          divisions: number
          playoff_team_count: number
          regular_season_weeks: number
          teams: number[]
          toilet_bowl_champ: number | null
          total_weeks: number | null
          year: number
        }
        Insert: {
          champ?: number | null
          created_at?: string | null
          divisions: number
          playoff_team_count: number
          regular_season_weeks: number
          teams: number[]
          toilet_bowl_champ?: number | null
          total_weeks?: number | null
          year?: number
        }
        Update: {
          champ?: number | null
          created_at?: string | null
          divisions?: number
          playoff_team_count?: number
          regular_season_weeks?: number
          teams?: number[]
          toilet_bowl_champ?: number | null
          total_weeks?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "season_champ_fkey"
            columns: ["champ"]
            isOneToOne: false
            referencedRelation: "manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_toilet_bowl_champ_fkey"
            columns: ["toilet_bowl_champ"]
            isOneToOne: false
            referencedRelation: "manager"
            referencedColumns: ["id"]
          }
        ]
      }
      team: {
        Row: {
          created_at: string
          division: number
          draft_position: number | null
          logo: string | null
          made_playoffs: boolean
          manager: number
          playoff_seed: number | null
          team_name: string
          trades: number | null
          transactions: number | null
          year: number
        }
        Insert: {
          created_at?: string
          division: number
          draft_position?: number | null
          logo?: string | null
          made_playoffs: boolean
          manager: number
          playoff_seed?: number | null
          team_name: string
          trades?: number | null
          transactions?: number | null
          year: number
        }
        Update: {
          created_at?: string
          division?: number
          draft_position?: number | null
          logo?: string | null
          made_playoffs?: boolean
          manager?: number
          playoff_seed?: number | null
          team_name?: string
          trades?: number | null
          transactions?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_manager_fkey"
            columns: ["manager"]
            isOneToOne: false
            referencedRelation: "manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_year_fkey"
            columns: ["year"]
            isOneToOne: false
            referencedRelation: "season"
            referencedColumns: ["year"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      all_time: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["CompositeTypes"]["all_time_object"][]
      }
      head_to_head: {
        Args: {
          team_one: number
          team_two: number
        }
        Returns: Database["public"]["CompositeTypes"]["head_to_head_object"][]
      }
      head_to_head_matchups: {
        Args: {
          team_one: number
          team_two: number
        }
        Returns: Database["public"]["CompositeTypes"]["game_details"][]
      }
      manager_seasons: {
        Args: {
          manager_id: number
        }
        Returns: Database["public"]["CompositeTypes"]["manager_season_object"][]
      }
      opponents: {
        Args: {
          manager_id: number
        }
        Returns: Database["public"]["CompositeTypes"]["opponents_object"][]
      }
      season_details: {
        Args: {
          season_year: number
        }
        Returns: Database["public"]["CompositeTypes"]["season_details_object"][]
      }
      week_matchups: {
        Args: {
          season_year: number
          selected_week: number
        }
        Returns: Database["public"]["CompositeTypes"]["game_details"][]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      all_time_object: {
        name: string
        is_active: boolean
        total_games: number
        total_wins: number
        playoff_games: number
        playoff_wins: number
        total_points_for: number
        total_points_against: number
        high_point_weeks: number
        low_point_weeks: number
        transactions: number
        trades: number
        championships: number
        playoff_births: number
        total_seasons: number
      }
      game_details: {
        week: number
        year: number
        home_score: number
        away_score: number
        home_manager_name: string
        home_team: string
        home_logo: string
        home_seed: number
        away_manager_name: string
        away_team: string
        away_logo: string
        away_seed: number
        is_playoffs: boolean
        is_winners_bracket: boolean
        is_toilet_bowl: boolean
        is_bye_week: boolean
        high_point: string
        low_point: string
      }
      head_to_head_object: {
        name: string
        total_games: number
        total_wins: number
        playoff_games: number
        playoff_wins: number
        total_points_for: number
        total_points_against: number
        high_point_weeks: number
        low_point_weeks: number
        transactions: number
        trades: number
        championships: number
        playoff_births: number
        total_seasons: number
      }
      manager_season_object: {
        year: number
        total_games: number
        total_wins: number
        playoff_games: number
        playoff_wins: number
        total_points_for: number
        total_points_against: number
        high_point_weeks: number
        low_point_weeks: number
        logo: string
        playoff_seed: number
      }
      opponents_object: {
        name: string
        id: number
        total_games: number
        total_wins: number
      }
      season_details_object: {
        manager_name: string
        total_games: number
        total_wins: number
        playoff_games: number
        playoff_wins: number
        total_points_for: number
        total_points_against: number
        high_point_weeks: number
        low_point_weeks: number
        championships: number
      }
    }
  }
}
