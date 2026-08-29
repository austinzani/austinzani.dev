export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
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
      league_memberships: {
        Row: {
          created_at: string
          id: number
          league_id: number
          manager_id: number
          role: Database["public"]["Enums"]["league_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          league_id: number
          manager_id: number
          role?: Database["public"]["Enums"]["league_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          league_id?: number
          manager_id?: number
          role?: Database["public"]["Enums"]["league_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_memberships_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_memberships_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          created_at: string
          id: number
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: never
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: never
          name?: string
          slug?: string
        }
        Relationships: []
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
          blurb: string | null
          created_at: string
          id: number
          spotify_url: string | null
          title: string
          type: string
          vinyl_url: string | null
        }
        Insert: {
          album_art_url: string
          apple_music_url: string
          artist: string
          blurb?: string | null
          created_at?: string
          id?: number
          spotify_url?: string | null
          title: string
          type: string
          vinyl_url?: string | null
        }
        Update: {
          album_art_url?: string
          apple_music_url?: string
          artist?: string
          blurb?: string | null
          created_at?: string
          id?: number
          spotify_url?: string | null
          title?: string
          type?: string
          vinyl_url?: string | null
        }
        Relationships: []
      }
      rule_submissions: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          id: number
          league_id: number
          manager_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: never
          league_id: number
          manager_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: never
          league_id?: number
          manager_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rule_submissions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_submissions_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager"
            referencedColumns: ["id"]
          },
        ]
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
      tds_assignments: {
        Row: {
          created_at: string
          entity_id: number
          id: number
          participant_id: number
          reassigned_at: string | null
          reassignment_reason: string | null
          sport_id: number
          tier_index: number | null
          tier_slot: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_id: number
          id?: never
          participant_id: number
          reassigned_at?: string | null
          reassignment_reason?: string | null
          sport_id: number
          tier_index?: number | null
          tier_slot?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_id?: number
          id?: never
          participant_id?: number
          reassigned_at?: string | null
          reassignment_reason?: string | null
          sport_id?: number
          tier_index?: number | null
          tier_slot?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tds_assignments_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "tds_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tds_assignments_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "tds_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tds_assignments_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "tds_sports"
            referencedColumns: ["id"]
          },
        ]
      }
      tds_entities: {
        Row: {
          created_at: string
          id: number
          image_url: string | null
          name: string
          source_ids: Json
          sport_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: never
          image_url?: string | null
          name: string
          source_ids?: Json
          sport_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: never
          image_url?: string | null
          name?: string
          source_ids?: Json
          sport_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tds_entities_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "tds_sports"
            referencedColumns: ["id"]
          },
        ]
      }
      tds_manual_scores: {
        Row: {
          created_at: string
          created_by: string | null
          id: number
          participant_id: number
          points: number
          reason: string
          sport_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: never
          participant_id: number
          points: number
          reason: string
          sport_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: never
          participant_id?: number
          points?: number
          reason?: string
          sport_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tds_manual_scores_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "tds_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tds_manual_scores_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "tds_sports"
            referencedColumns: ["id"]
          },
        ]
      }
      tds_participants: {
        Row: {
          created_at: string
          display_name: string
          id: number
          manager_id: number | null
          season_id: number
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: never
          manager_id?: number | null
          season_id: number
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: never
          manager_id?: number | null
          season_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tds_participants_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tds_participants_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "tds_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      tds_seasons: {
        Row: {
          created_at: string
          cutoff_date: string
          id: number
          locked_at: string | null
          locked_inputs: Json | null
          name: string
          rng_seed: string | null
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          cutoff_date: string
          id?: never
          locked_at?: string | null
          locked_inputs?: Json | null
          name: string
          rng_seed?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          cutoff_date?: string
          id?: never
          locked_at?: string | null
          locked_inputs?: Json | null
          name?: string
          rng_seed?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      tds_snapshots: {
        Row: {
          error: string | null
          fetched_at: string
          id: number
          payload: Json | null
          snapshot_date: string
          sport_id: number
          status: Database["public"]["Enums"]["tds_snapshot_status"]
        }
        Insert: {
          error?: string | null
          fetched_at?: string
          id?: never
          payload?: Json | null
          snapshot_date: string
          sport_id: number
          status?: Database["public"]["Enums"]["tds_snapshot_status"]
        }
        Update: {
          error?: string | null
          fetched_at?: string
          id?: never
          payload?: Json | null
          snapshot_date?: string
          sport_id?: number
          status?: Database["public"]["Enums"]["tds_snapshot_status"]
        }
        Relationships: [
          {
            foreignKeyName: "tds_snapshots_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "tds_sports"
            referencedColumns: ["id"]
          },
        ]
      }
      tds_sports: {
        Row: {
          created_at: string
          id: number
          metric_mode: Database["public"]["Enums"]["tds_metric_mode"]
          name: string
          odds_board: Json | null
          revealed_at: string | null
          season_id: number
          sport_index: number
          sport_key: string
          status: Database["public"]["Enums"]["tds_sport_status"]
          tier_basis: string | null
          tiers: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: never
          metric_mode: Database["public"]["Enums"]["tds_metric_mode"]
          name: string
          odds_board?: Json | null
          revealed_at?: string | null
          season_id: number
          sport_index: number
          sport_key: string
          status?: Database["public"]["Enums"]["tds_sport_status"]
          tier_basis?: string | null
          tiers?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: never
          metric_mode?: Database["public"]["Enums"]["tds_metric_mode"]
          name?: string
          odds_board?: Json | null
          revealed_at?: string | null
          season_id?: number
          sport_index?: number
          sport_key?: string
          status?: Database["public"]["Enums"]["tds_sport_status"]
          tier_basis?: string | null
          tiers?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tds_sports_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "tds_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      tds_standings: {
        Row: {
          created_at: string
          entity_id: number
          id: number
          metric_value: number | null
          rank: number
          snapshot_id: number
        }
        Insert: {
          created_at?: string
          entity_id: number
          id?: never
          metric_value?: number | null
          rank: number
          snapshot_id: number
        }
        Update: {
          created_at?: string
          entity_id?: number
          id?: never
          metric_value?: number | null
          rank?: number
          snapshot_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tds_standings_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "tds_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tds_standings_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "tds_snapshots"
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
      town_hall_answer_options: {
        Row: {
          created_at: string
          display_order: number
          id: number
          is_status_quo: boolean
          label: string
          question_id: number
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: never
          is_status_quo?: boolean
          label: string
          question_id: number
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: never
          is_status_quo?: boolean
          label?: string
          question_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "town_hall_answer_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "town_hall_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      town_hall_ballots: {
        Row: {
          closes_at: string | null
          created_at: string
          created_by: string | null
          id: number
          league_id: number
          opens_at: string | null
          published_at: string | null
          results_visible: boolean
          status: Database["public"]["Enums"]["town_hall_ballot_status"]
          title: string
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: never
          league_id: number
          opens_at?: string | null
          published_at?: string | null
          results_visible?: boolean
          status?: Database["public"]["Enums"]["town_hall_ballot_status"]
          title?: string
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: never
          league_id?: number
          opens_at?: string | null
          published_at?: string | null
          results_visible?: boolean
          status?: Database["public"]["Enums"]["town_hall_ballot_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "town_hall_ballots_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      town_hall_questions: {
        Row: {
          ballot_id: number
          created_at: string
          display_order: number
          id: number
          is_required: boolean
          prompt: string
          section: string
        }
        Insert: {
          ballot_id: number
          created_at?: string
          display_order?: number
          id?: never
          is_required?: boolean
          prompt: string
          section?: string
        }
        Update: {
          ballot_id?: number
          created_at?: string
          display_order?: number
          id?: never
          is_required?: boolean
          prompt?: string
          section?: string
        }
        Relationships: [
          {
            foreignKeyName: "town_hall_questions_ballot_id_fkey"
            columns: ["ballot_id"]
            isOneToOne: false
            referencedRelation: "town_hall_ballots"
            referencedColumns: ["id"]
          },
        ]
      }
      town_hall_responses: {
        Row: {
          ballot_id: number
          created_at: string
          id: number
          league_id: number
          manager_id: number
          option_id: number
          question_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ballot_id: number
          created_at?: string
          id?: never
          league_id: number
          manager_id: number
          option_id: number
          question_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ballot_id?: number
          created_at?: string
          id?: never
          league_id?: number
          manager_id?: number
          option_id?: number
          question_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "town_hall_responses_ballot_id_fkey"
            columns: ["ballot_id"]
            isOneToOne: false
            referencedRelation: "town_hall_ballots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "town_hall_responses_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "town_hall_responses_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "town_hall_responses_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "town_hall_answer_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "town_hall_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "town_hall_questions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      all_time: {
        Args: never
        Returns: Database["public"]["CompositeTypes"]["all_time_object"][]
        SetofOptions: {
          from: "*"
          to: "all_time_object"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      head_to_head: {
        Args: { team_one: number; team_two: number }
        Returns: Database["public"]["CompositeTypes"]["head_to_head_object"][]
        SetofOptions: {
          from: "*"
          to: "head_to_head_object"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      head_to_head_matchups: {
        Args: { team_one: number; team_two: number }
        Returns: Database["public"]["CompositeTypes"]["game_details"][]
        SetofOptions: {
          from: "*"
          to: "game_details"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      manager_seasons: {
        Args: { manager_id: number }
        Returns: Database["public"]["CompositeTypes"]["manager_season_object"][]
        SetofOptions: {
          from: "*"
          to: "manager_season_object"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      opponents: {
        Args: { manager_id: number }
        Returns: Database["public"]["CompositeTypes"]["opponents_object"][]
        SetofOptions: {
          from: "*"
          to: "opponents_object"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      season_details: {
        Args: { season_year: number }
        Returns: Database["public"]["CompositeTypes"]["season_details_object"][]
        SetofOptions: {
          from: "*"
          to: "season_details_object"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      tds_scoreboard: {
        Args: { p_season_year: number }
        Returns: {
          display_name: string
          manager_id: number
          participant_id: number
          sports: Json
          total_points: number
        }[]
      }
      tds_sport_scores: {
        Args: { p_season_year: number; p_sport_key: string }
        Returns: {
          base_points: number
          display_name: string
          entity_id: number
          entity_image_url: string
          entity_name: string
          fetched_at: string
          metric_value: number
          ordinal: number
          overridden: boolean
          override_reason: string
          participant_id: number
          points: number
          real_rank: number
          reassigned: boolean
          reassignment_reason: string
          snapshot_date: string
        }[]
      }
      week_matchups: {
        Args: { season_year: number; selected_week: number }
        Returns: Database["public"]["CompositeTypes"]["game_details"][]
        SetofOptions: {
          from: "*"
          to: "game_details"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      league_role: "commissioner" | "manager"
      tds_metric_mode: "live" | "final_prior"
      tds_snapshot_status: "good" | "failed"
      tds_sport_status: "pending" | "counting" | "final"
      town_hall_ballot_status:
        | "draft"
        | "open"
        | "closed"
        | "upcoming"
        | "finished"
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      league_role: ["commissioner", "manager"],
      tds_metric_mode: ["live", "final_prior"],
      tds_snapshot_status: ["good", "failed"],
      tds_sport_status: ["pending", "counting", "final"],
      town_hall_ballot_status: [
        "draft",
        "open",
        "closed",
        "upcoming",
        "finished",
      ],
    },
  },
} as const

