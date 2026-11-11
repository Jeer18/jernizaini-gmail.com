export type BookingStatus = 'MENUNGGU' | 'LULUS' | 'DITOLAK';

export type FacilityCategory = 'MAKMAL' | 'DEWAN' | 'BILIK' | 'ASET' | string;

export interface Facility {
  id: string;
  name: string;
  type: FacilityCategory;
  capacity: number; // for rooms: max occupants; for assets: total stock
  desc: string;
  inventory: string;
  status: 'available' | 'in-use' | 'maintenance';
  img: string;
}

export interface Booking {
  id: string;
  applicantName: string;
  phoneNumber: string;
  roomId: string;
  roomName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  endTime: string; // HH:mm
  purpose: string;
  status: BookingStatus;
  quantity: number; // > 0 for ASET, 0 for rooms
  timestamp: string; // ISO date string
  adminNotes?: string;
}

export interface AppSettings {
  announcement: string;
  logoUrl: string;
  adminWhatsapp: string;
  adminPassword: string;
  gasWebAppUrl: string;
  schoolName: string;
}
