export interface Masjid {
  id: number;
  name: string;
  address: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  status: number;
  id_customer: number;
  id_halqa: number | null;
  created_at: string;
  updated_at: string;
}