export interface TravelCost {
  tingkat: string;
  type: 'Dalam Daerah' | 'Luar Daerah';
  amount: number;
}

export interface FuelPrice {
  type: string;
  price: number;
}

export interface AppSettings {
  id?: string;
  logo?: string;
  legalBasis: string[];
  travelCosts: TravelCost[];
  fuelPrices: FuelPrice[];
  bendaharaPembantu?: {
    [key: string]: {
      name: string;
      nip: string;
      title: string;
    };
  };
}

export interface Employee {
  id?: string;
  name: string;
  nip: string;
  jabatan: string;
  pangkat?: string;
  golongan?: string;
  tingkatSppd?: string;
  jabatanSppd?: string;
}

export interface SubActivity {
  id?: string;
  code: string;
  name: string;
}

export interface SPPD {
  id?: string;
  number?: string;
  ppkId: string;
  employeeId: string;
  tingkatBiaya: string;
  purpose: string;
  transport: string;
  departureLocation: string;
  destination: string;
  duration: number;
  travelType: 'Dalam Daerah' | 'Luar Daerah';
  departureDate: string;
  returnDate: string;
  followers: {
    name: string;
    nip: string;
    gol: string;
    tingkat: string;
    ket: string;
  }[];
  subActivityId: string;
  bidang: 'Sekretariat' | 'Bidang Sosial' | 'Bidang PPPA';
  otherNotes: string;
  createdAt: string;
  status: 'draft' | 'active' | 'completed';
  reportResults?: string[];
  documentation?: string[];
  fuelType?: string;
  fuelAmount?: number;
  completedAt?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}
