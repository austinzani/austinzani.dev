export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          },
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
          },
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
          },
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
          },
        ]
      }
      top_100_albums: {
        Row: {
          album: string
          apple_music_url: string | null
          artist: string
          artwork_url: string
          genre: string
          id: number
          release_date: string
          spotify_url: string | null
          tier: string
        }
        Insert: {
          album: string
          apple_music_url?: string | null
          artist: string
          artwork_url: string
          genre: string
          id: number
          release_date: string
          spotify_url?: string | null
          tier: string
        }
        Update: {
          album?: string
          apple_music_url?: string | null
          artist?: string
          artwork_url?: string
          genre?: string
          id?: number
          release_date?: string
          spotify_url?: string | null
          tier?: string
        }
        Relationships: []
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
        name: string | null
        is_active: boolean | null
        total_games: number | null
        total_wins: number | null
        playoff_games: number | null
        playoff_wins: number | null
        total_points_for: number | null
        total_points_against: number | null
        high_point_weeks: number | null
        low_point_weeks: number | null
        transactions: number | null
        trades: number | null
        championships: number | null
        playoff_births: number | null
        total_seasons: number | null
      }
      game_details: {
        week: number | null
        year: number | null
        home_score: number | null
        away_score: number | null
        home_manager_name: string | null
        home_team: string | null
        home_logo: string | null
        home_seed: number | null
        away_manager_name: string | null
        away_team: string | null
        away_logo: string | null
        away_seed: number | null
        is_playoffs: boolean | null
        is_winners_bracket: boolean | null
        is_toilet_bowl: boolean | null
        is_bye_week: boolean | null
        high_point: string | null
        low_point: string | null
      }
      head_to_head_object: {
        name: string | null
        total_games: number | null
        total_wins: number | null
        playoff_games: number | null
        playoff_wins: number | null
        total_points_for: number | null
        total_points_against: number | null
        high_point_weeks: number | null
        low_point_weeks: number | null
        transactions: number | null
        trades: number | null
        championships: number | null
        playoff_births: number | null
        total_seasons: number | null
      }
      manager_season_object: {
        year: number | null
        total_games: number | null
        total_wins: number | null
        playoff_games: number | null
        playoff_wins: number | null
        total_points_for: number | null
        total_points_against: number | null
        high_point_weeks: number | null
        low_point_weeks: number | null
        logo: string | null
        playoff_seed: number | null
      }
      opponents_object: {
        name: string | null
        id: number | null
        total_games: number | null
        total_wins: number | null
      }
      season_details_object: {
        manager_name: string | null
        total_games: number | null
        total_wins: number | null
        playoff_games: number | null
        playoff_wins: number | null
        total_points_for: number | null
        total_points_against: number | null
        high_point_weeks: number | null
        low_point_weeks: number | null
        championships: number | null
      }
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
