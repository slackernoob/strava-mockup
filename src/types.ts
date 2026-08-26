export type User = { id: number; name: string };

export type Club = {
  id: number;
  name: string;
  created_by: number;
  creator_name: string;
  member_count: number;
  is_member: boolean;
};

export type RunSummary = {
  id: number;
  title: string;
  starts_at: number;
  location: string | null;
  distance_km: number | null;
  pace: string | null;
  description: string | null;
  host_id: number;
  host_name: string;
  attendees: User[];
};

export type ClubDetail = {
  id: number;
  name: string;
  created_by: number;
  creator_name: string;
  is_member: boolean;
  members: User[];
  upcoming_runs: RunSummary[] | null;
};

export type FeedRun = {
  id: number;
  title: string;
  starts_at: number;
  location: string | null;
  distance_km: number | null;
  pace: string | null;
  description: string | null;
  club_id: number;
  club_name: string;
  host_id: number;
  host_name: string;
  kudos_count: number;
  has_kudoed: boolean;
  attendees: string[];
};
