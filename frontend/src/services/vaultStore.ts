import type { VaultState } from "../types/sports";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { firestore } from "./firebase";

const storageKey = "sports-vault:favorites";
export function readLocalVault(): VaultState {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? (JSON.parse(saved) as VaultState) : { teamIds: [] };
  } catch {
    return { teamIds: [] };
  }
}
export function writeLocalVault(vault: VaultState): void {
  localStorage.setItem(storageKey, JSON.stringify(vault));
}

export function subscribeToCloudVault(
  userId: string,
  onChange: (vault: VaultState, exists: boolean) => void,
  onError: () => void,
): (() => void) | null {
  if (!firestore) return null;

  return onSnapshot(
    doc(firestore, "users", userId, "vault", "favorites"),
    (snapshot) => {
      const data = snapshot.data();
      const vault = {
        teamIds: Array.isArray(data?.teamIds)
          ? data.teamIds.filter((id): id is string => typeof id === "string")
          : [],
      };
      writeLocalVault(vault);
      onChange(vault, snapshot.exists());
    },
    onError,
  );
}

export async function writeVault(
  userId: string | undefined,
  vault: VaultState,
): Promise<void> {
  writeLocalVault(vault);
  if (!userId || !firestore) return;
  await setDoc(doc(firestore, "users", userId, "vault", "favorites"), vault, {
    merge: true,
  });
}
