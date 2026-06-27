export type Guest = {
  id: string;
  name: string;
  table_name: string | null;
  seat_number: string | null;
  timeline_url: string | null;
  quiz_url: string | null;
  mission_url: string | null;
};

export type GuestSearchResponse = {
  guests: Guest[];
  tableMembersByTable: Record<string, Guest[]>;
};
