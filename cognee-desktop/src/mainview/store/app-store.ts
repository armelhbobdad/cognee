import type { SetupState } from "shared/rpc";
import { create } from "zustand";

export type AppMode = "local" | "cloud";

interface AppStore {
	account: string | null;
	mode: AppMode;
	setAccount: (account: string | null) => void;
	setMode: (mode: AppMode) => void;
	setSetupState: (state: SetupState) => void;
	setupState: SetupState | null;
}

export const useAppStore = create<AppStore>((set) => ({
	setupState: null,
	mode: "local",
	account: null,
	setSetupState: (setupState) => set({ setupState }),
	setMode: (mode) => set({ mode }),
	setAccount: (account) => set({ account }),
}));
