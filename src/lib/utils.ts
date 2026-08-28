import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getProvinceFromDestination(destination: string): string | null {
  if (!destination) return null;
  const destLower = destination.toLowerCase();
  
  // Custom keyword mappings for major Indonesian provinces and their cities/regencies
  const provinceMappings: Record<string, string[]> = {
    'Jawa Tengah': [
      'jawa tengah', 'jateng', 'semarang', 'pati', 'kudus', 'jepara', 'rembang', 'grobogan', 'purwodadi', 'demak', 'kendal',
      'temanggung', 'wonosobo', 'banjarnegara', 'purbalingga', 'banyumas', 'purwokerto', 'cilacap',
      'kebumen', 'purworejo', 'magelang', 'boyolali', 'klaten', 'sukoharjo', 'wonogiri', 'karanganyar',
      'sragen', 'surakarta', 'solo', 'salatiga', 'pekalongan', 'batang', 'pemalang', 'tegal', 'brebes',
      'blora'
    ],
    'Jawa Timur': [
      'jawa timur', 'jatim', 'surabaya', 'sidoarjo', 'gresik', 'mojokerto', 'jombang', 'lamongan', 'tuban', 'bojonegoro',
      'madiun', 'ngawi', 'magetan', 'ponorogo', 'pacitan', 'trenggalek', 'tulungagung', 'kediri',
      'nganjuk', 'blitar', 'malang', 'pasuruan', 'probolinggo', 'lumajang', 'jember', 'bondowoso',
      'situbondo', 'banyuwangi', 'bangkalan', 'sampang', 'pamekasan', 'sumenep', 'batu'
    ],
    'DI Yogyakarta': [
      'yogyakarta', 'jogja', 'diy', 'sleman', 'bantul', 'kulon progo', 'wates', 'gunungkidul', 'wonosari'
    ],
    'Jawa Barat': [
      'jawa barat', 'jabar', 'bandung', 'bogor', 'depok', 'bekasi', 'cirebon', 'tasikmalaya', 'cimahi', 'sukabumi', 'banjar',
      'sumedang', 'subang', 'purwakarta', 'karawang', 'indramayu', 'majalengka', 'kuningan', 'garut',
      'ciamis', 'cianjur', 'pangandaran'
    ],
    'DKI Jakarta': [
      'jakarta', 'dki'
    ],
    'Banten': [
      'banten', 'serang', 'tangerang', 'cilegon', 'pandeglang', 'lebak'
    ]
  };

  for (const [province, keywords] of Object.entries(provinceMappings)) {
    for (const keyword of keywords) {
      if (keyword.length <= 4) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(destLower)) {
          return province;
        }
      } else {
        if (destLower.includes(keyword)) {
          return province;
        }
      }
    }
  }

  return null;
}

export function isDestinationOutsideJava(destination: string): boolean {
  if (!destination) return false;
  const destLower = destination.toLowerCase();
  if (destLower.includes('luar jawa') || destLower.includes('luar pulau')) return true;
  
  const province = getProvinceFromDestination(destination);
  if (province) return false; // Is in Java list (Jateng, Jatim, Jabar, DKI, DIY, Banten)
  
  return true;
}

