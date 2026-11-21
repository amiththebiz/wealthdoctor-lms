import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface SiteSettings {
  site_title: string;
  logo_url: string;
}

const DEFAULT_SITE_SETTINGS: SiteSettings = { site_title: 'Wealth Doctor', logo_url: '' };
const settingsRef = doc(db, 'site', 'settings');

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const snap = await getDoc(settingsRef);
  return { ...DEFAULT_SITE_SETTINGS, ...(snap.data() as Partial<SiteSettings> | undefined) };
}

export async function saveSiteSettings(patch: SiteSettings): Promise<void> {
  await setDoc(settingsRef, { ...patch, updated_at: new Date().toISOString() }, { merge: true });
}
