export interface Event {
  id: string;
  title: string;
  trip_label: string | null;
  date: string;
  time: string | null;
  location: string | null;
  buy_in_amount: number;
  max_players: number | null;
  notes: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Participant {
  id: string;
  event_id: string;
  display_name: string;
  alias_or_real_name: string | null;
  buy_in_amount: number;
  amount_paid: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
  payment_method: string | null;
  checked_in: boolean;
  waitlist: boolean;
  notes: string | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SyncQueueItem {
  id: string;
  entity_type: 'event' | 'participant';
  entity_id: string;
  action: 'create' | 'update' | 'delete';
  payload: object;
  created_at: string;
  synced_at: string | null;
  failed_at: string | null;
}

export interface EventTotals {
  totalSignedUp: number;
  checkedInCount: number;
  waitlistCount: number;
  expectedTotal: number;
  collectedTotal: number;
  remainingUnpaid: number;
}
