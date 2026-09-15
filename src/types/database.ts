export const roles = [
  "learner",
  "mentor",
  "employer",
  "administrator",
] as const;

export type UserRole = (typeof roles)[number];

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  biography: string | null;
  avatar_url: string | null;
  selected_skills: string[];
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<Profile, "id" | "role" | "email" | "created_at">
        >;
        Relationships: [];
      };

      skill_submissions: {
        Row: {
          id: string;
          learner_id: string;
          skill_name: string;
          title: string;
          description: string | null;
          evidence_url: string | null;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          learner_id: string;
          skill_name: string;
          title: string;
          description?: string | null;
          evidence_url?: string | null;
          submitted_at?: string;
        };
        Update: {
          id?: string;
          learner_id?: string;
          skill_name?: string;
          title?: string;
          description?: string | null;
          evidence_url?: string | null;
          submitted_at?: string;
        };
        Relationships: [];
      };

      skill_verifications: {
        Row: {
          id: string;
          submission_id: string;
          learner_id: string;
          mentor_id: string;
          decision: "approved" | "rejected" | "revision_requested";
          feedback: string | null;
          competency_rating: number | null;
          verified_at: string;
          public_verification_id: string | null;
        };
        Insert: {
          id?: string;
          submission_id: string;
          learner_id: string;
          mentor_id: string;
          decision: "approved" | "rejected" | "revision_requested";
          feedback?: string | null;
          competency_rating?: number | null;
          verified_at?: string;
          public_verification_id?: string | null;
        };
        Update: {
          id?: string;
          submission_id?: string;
          learner_id?: string;
          mentor_id?: string;
          decision?: "approved" | "rejected" | "revision_requested";
          feedback?: string | null;
          competency_rating?: number | null;
          verified_at?: string;
          public_verification_id?: string | null;
        };
        Relationships: [];
      };
    };

    Views: Record<string, never>;

    Functions: {
      get_public_skill_verification: {
        Args: {
          verification_public_id: string;
        };
        Returns: {
          public_verification_id: string;
          learner_name: string;
          skill_name: string;
          project_title: string;
          project_description: string | null;
          competency_rating: number | null;
          verified_at: string;
          decision: "approved";
        }[];
      };
    };

    Enums: {
      user_role: UserRole;
    };

    CompositeTypes: Record<string, never>;
  };
};
