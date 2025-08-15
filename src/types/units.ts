import { Database } from '@/integrations/supabase/types';

export type Unit = Database['public']['Tables']['units']['Row'];
export type UnitInsert = Database['public']['Tables']['units']['Insert'];
export type UnitUpdate = Database['public']['Tables']['units']['Update'];

export type StockStatus = Database['public']['Enums']['stock_status'];
export type LocationType = Database['public']['Enums']['location_type'];