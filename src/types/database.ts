export const roles = [
  "learner",
  "mentor",
  "employer",
  "administrator",
] as const;

export type UserRole = (typeof roles)[number];

export const submissionStatuses = [
  "draft",
  "submitted",
  "under_review",
  "revision_requested",
  "verified",
  "rejected",
] as const;

export type SubmissionStatus = (typeof submissionStatuses)[number];

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

type Category = {
  id: string;
  name: string;
  created_at: string;
};

type Skill = {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  created_at: string;
  updated_at: string;
};

type Assessment = {
  id: string;
  title: string;
  skill_id: string;
  instructions: string;
  difficulty: string;
  deadline: string | null;
  criteria: string;
  created_by_id: string;
  created_at: string;
  updated_at: string;
};

type Submission = {
  id: string;
  assessment_id: string;
  learner_id: string;
  written_response: string | null;
  project_link: string | null;
  video_link: string | null;
  status: SubmissionStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type SubmissionFile = {
  id: string;
  submission_id: string;
  learner_id: string;
  file_path: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  created_at: string;
};

type PortfolioItem = {
  id: string;
  learner_id: string;
  submission_id: string | null;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

type Table<T> = {
  Row: T;
  Insert: Partial<Omit<T, "id" | "created_at" | "updated_at">> & {
    id?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<Omit<T, "id" | "created_at" | "updated_at">>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;

      categories: Table<Category>;

      skills: Table<Skill>;

      assessments: Table<Assessment>;

      submissions: Table<Submission>;

      submission_files: Table<SubmissionFile>;

      portfolio_items: Table<PortfolioItem>;

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
          verification_status: "active" | "revoked" | "suspended";
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
          verification_status?: "active" | "revoked" | "suspended";
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
          verification_status?: "active" | "revoked" | "suspended";
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
          verification_status: "active" | "revoked" | "suspended";
        }[];
      };
    };

    Enums: {
      user_role: UserRole;
      submission_status: SubmissionStatus;
      verification_decision:
        | "approved"
        | "rejected"
        | "revision_requested";
      verification_status: "active" | "revoked" | "suspended";
    };

    CompositeTypes: Record<string, never>;
  };
};