import { FirestoreError, type DocumentSnapshot, type QuerySnapshot } from 'firebase/firestore';

export function rowFromDoc<T>(snap: DocumentSnapshot): T {
  return { id: snap.id, ...(snap.data() ?? {}) } as T;
}

export function rowsFromQuery<T>(snap: QuerySnapshot): T[] {
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

export function isPermissionDenied(error: unknown): boolean {
  return error instanceof FirestoreError && error.code === 'permission-denied';
}
