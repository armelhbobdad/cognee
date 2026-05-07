import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

interface ThemeProviderProps {
	children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
	return (
		<NextThemesProvider
			attribute="data-theme"
			defaultTheme="light"
			enableSystem={false}
			storageKey="cognee-theme"
		>
			{children}
		</NextThemesProvider>
	);
}
