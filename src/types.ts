export interface AppUser {
  id?: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'Admin' | 'Operator' | 'Pegawai';
  bidang: 'Semua Bidang' | 'Sekretariat' | 'Bidang Sosial' | 'Bidang PPPA' | 'UPTD PPA';
  lastLoginAt?: string;
  createdAt?: string;
}

export interface TravelCost {
  tingkat: string;
  type: 'Dalam Daerah' | 'Luar Daerah';
  destination?: string;
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
  jabatanSppdList?: string[];
}

export const getEmployeeRoles = (emp?: Partial<Employee> | null): string[] => {
  if (!emp) return [];
  if (Array.isArray(emp.jabatanSppdList) && emp.jabatanSppdList.length > 0) {
    return emp.jabatanSppdList.filter(Boolean);
  }
  if (emp.jabatanSppd) {
    return emp.jabatanSppd
      .split(/[,;]/)
      .map(s => s.trim())
      .filter(Boolean);
  }
  return [];
};

export const employeeHasRole = (emp?: Partial<Employee> | null, roleKeyword?: string, bidangKeyword?: string): boolean => {
  const roles = getEmployeeRoles(emp);
  if (roles.length === 0) return false;
  if (!roleKeyword) return true;

  const roleUpper = roleKeyword.toUpperCase();
  return roles.some(r => {
    const rUpper = r.toUpperCase();
    let matches = false;

    if (roleUpper === 'PPK') {
      // Must match PPK but not PPTK or PPKOM unless requested
      matches = (rUpper.includes('PPK') && !rUpper.includes('PPTK') && !rUpper.includes('PPKOM')) || rUpper === 'PPK';
    } else if (roleUpper === 'PPKOM') {
      matches = rUpper.includes('PPKOM') || rUpper.includes('PPK-KOM');
    } else {
      matches = rUpper.includes(roleUpper);
    }

    if (!matches) return false;
    if (bidangKeyword) {
      return r.toLowerCase().includes(bidangKeyword.toLowerCase());
    }
    return true;
  });
};

export interface SubActivity {
  id?: string;
  code: string;
  name: string;
}

export interface SPPD {
  id?: string;
  number?: string;
  ppkId: string;
  pptkId?: string;
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
  bidang: 'Sekretariat' | 'Bidang Sosial' | 'Bidang PPPA' | 'UPTD PPA';
  otherNotes: string;
  createdAt: string;
  status: 'draft' | 'active' | 'completed';
  reportResults?: string[];
  documentation?: string[];
  fuelType?: string;
  fuelAmount?: number;
  recipientName?: string;
  recipientNip?: string;
  completedAt?: string;
  disbursementStatus?: 'Belum Dicairkan' | 'Sudah Dicairkan';
  invitationFrom?: string;
  invitationNumber?: string;
  invitationSubject?: string;
  invitationDate?: string;
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
