export type RelationshipStatus =
  | "single"
  | "dating"
  | "engaged"
  | "married"
  | "unknown";

export type EmploymentStatus = "employed" | "postgrad";

export type Profile = {
  id: string;
  user_id: string | null;
  pledge_class: string;
  full_name: string;
  employment_status: EmploymentStatus | null;
  company: string | null;
  position: string | null;
  university: string | null;
  grad_year: number | null;
  city: string | null;
  state: string | null;
  home_address: string | null;
  phone: string | null;
  personal_email: string | null;
  relationship_status: RelationshipStatus | null;
  partner_name: string | null;
  is_admin: boolean;
  hidden: boolean;
  avatar_path: string | null;
  birthday: string | null;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileInsert = {
  id?: string;
  user_id?: string | null;
  pledge_class: string;
  full_name: string;
  employment_status?: EmploymentStatus | null;
  company?: string | null;
  position?: string | null;
  university?: string | null;
  grad_year?: number | null;
  city?: string | null;
  state?: string | null;
  home_address?: string | null;
  phone?: string | null;
  personal_email?: string | null;
  relationship_status?: RelationshipStatus | null;
  partner_name?: string | null;
  is_admin?: boolean;
  hidden?: boolean;
  avatar_path?: string | null;
  birthday?: string | null;
  claimed_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ProfileUpdate = Partial<ProfileInsert>;

export type PledgeClass = {
  name: string;
  display_order: number;
  hidden: boolean;
  created_at: string;
};

export type PledgeClassInsert = {
  name: string;
  display_order?: number;
  hidden?: boolean;
  created_at?: string;
};

export type PledgeClassUpdate = Partial<PledgeClassInsert>;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      pledge_classes: {
        Row: PledgeClass;
        Insert: PledgeClassInsert;
        Update: PledgeClassUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: { uid: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
