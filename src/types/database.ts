
export const roles = ["learner", "mentor", "employer", "administrator"] as const;
export type UserRole = (typeof roles)[number];

export const opportunityTypes = ["job", "internship", "apprenticeship", "volunteer"] as const;
export type OpportunityType = (typeof opportunityTypes)[number];

export const workArrangements = ["remote", "onsite", "hybrid"] as const;
export type WorkArrangement = (typeof workArrangements)[number];

export const applicationStatuses = ["submitted", "reviewed", "shortlisted", "rejected", "accepted"] as const;
export type ApplicationStatus = (typeof applicationStatuses)[number];

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

export type Opportunity = {
  id: string;
  employer_id: string;
  title: string;
  organization: string;
  description: string;
  opportunity_type: OpportunityType;
  required_skills: string[];
  location: string | null;
  work_arrangement: WorkArrangement;
  application_deadline: string | null;
  application_instructions: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type Application = {
  id: string;
  opportunity_id: string;
  learner_id: string;
  cover_note: string | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at"> & { created_at?: string; updated_at?: string };
        Update: Partial<Omit<Profile, "id" | "role" | "email" | "created_at">>;
        Relationships: [];
      };
      opportunities: {
        Row: Opportunity;
        Insert: Omit<Opportunity, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Opportunity, "id" | "employer_id" | "created_at">>;
        Relationships: [];
      };
      applications: {
        Row: Application;
        Insert: Omit<Application, "id" | "status" | "created_at" | "updated_at"> & { id?: string; status?: ApplicationStatus; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Application, "id" | "opportunity_id" | "learner_id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: { user_role: UserRole; opportunity_type: OpportunityType; work_arrangement: WorkArrangement; application_status: ApplicationStatus };
    CompositeTypes: Record<string, never>;
  };
};