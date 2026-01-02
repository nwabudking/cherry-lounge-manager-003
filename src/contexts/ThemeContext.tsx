import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Theme {
  id: string;
  name: string;
  description: string;
  preview: {
    primary: string;
    background: string;
    accent: string;
  };
  variables: Record<string, string>;
}

export const themes: Theme[] = [
  {
    id: "default",
    name: "Clean White",
    description: "Classic light theme with clean aesthetics",
    preview: {
      primary: "hsl(348, 83%, 47%)",
      background: "hsl(0, 0%, 100%)",
      accent: "hsl(348, 75%, 40%)",
    },
    variables: {
      "--background": "0 0% 100%",
      "--foreground": "222 47% 11%",
      "--card": "0 0% 100%",
      "--card-foreground": "222 47% 11%",
      "--popover": "0 0% 100%",
      "--popover-foreground": "222 47% 11%",
      "--primary": "348 83% 47%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "210 40% 96%",
      "--secondary-foreground": "222 47% 11%",
      "--muted": "210 40% 96%",
      "--muted-foreground": "215 16% 47%",
      "--accent": "210 40% 96%",
      "--accent-foreground": "222 47% 11%",
      "--destructive": "0 84% 60%",
      "--destructive-foreground": "0 0% 100%",
      "--border": "214 32% 91%",
      "--input": "214 32% 91%",
      "--ring": "348 83% 47%",
      "--sidebar-background": "0 0% 98%",
      "--sidebar-foreground": "222 47% 11%",
      "--sidebar-primary": "348 83% 47%",
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "210 40% 96%",
      "--sidebar-accent-foreground": "222 47% 11%",
      "--sidebar-border": "214 32% 91%",
      "--sidebar-ring": "348 83% 47%",
    },
  },
  {
    id: "cherry",
    name: "Cherry Noir",
    description: "Dark premium theme with cherry red accents",
    preview: {
      primary: "hsl(348, 83%, 47%)",
      background: "hsl(220, 20%, 7%)",
      accent: "hsl(348, 75%, 40%)",
    },
    variables: {
      "--background": "220 20% 7%",
      "--foreground": "0 0% 95%",
      "--card": "220 18% 10%",
      "--card-foreground": "0 0% 95%",
      "--popover": "220 18% 10%",
      "--popover-foreground": "0 0% 95%",
      "--primary": "348 83% 47%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "220 15% 15%",
      "--secondary-foreground": "0 0% 90%",
      "--muted": "220 15% 18%",
      "--muted-foreground": "220 10% 55%",
      "--accent": "348 75% 40%",
      "--accent-foreground": "0 0% 100%",
      "--destructive": "0 62.8% 45%",
      "--destructive-foreground": "0 0% 100%",
      "--border": "220 15% 18%",
      "--input": "220 15% 20%",
      "--ring": "348 83% 47%",
      "--sidebar-background": "220 20% 5%",
      "--sidebar-foreground": "0 0% 85%",
      "--sidebar-primary": "348 83% 47%",
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "220 15% 12%",
      "--sidebar-accent-foreground": "0 0% 95%",
      "--sidebar-border": "220 15% 15%",
      "--sidebar-ring": "348 83% 47%",
    },
  },
  {
    id: "ocean",
    name: "Ocean Breeze",
    description: "Cool ocean blues with teal accents",
    preview: {
      primary: "hsl(199, 89%, 48%)",
      background: "hsl(210, 25%, 8%)",
      accent: "hsl(174, 72%, 40%)",
    },
    variables: {
      "--background": "210 25% 8%",
      "--foreground": "210 20% 95%",
      "--card": "210 22% 11%",
      "--card-foreground": "210 20% 95%",
      "--popover": "210 22% 11%",
      "--popover-foreground": "210 20% 95%",
      "--primary": "199 89% 48%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "210 18% 16%",
      "--secondary-foreground": "210 15% 90%",
      "--muted": "210 18% 20%",
      "--muted-foreground": "210 12% 55%",
      "--accent": "174 72% 40%",
      "--accent-foreground": "0 0% 100%",
      "--destructive": "0 62.8% 45%",
      "--destructive-foreground": "0 0% 100%",
      "--border": "210 18% 18%",
      "--input": "210 18% 22%",
      "--ring": "199 89% 48%",
      "--sidebar-background": "210 25% 6%",
      "--sidebar-foreground": "210 15% 85%",
      "--sidebar-primary": "199 89% 48%",
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "210 18% 14%",
      "--sidebar-accent-foreground": "210 20% 95%",
      "--sidebar-border": "210 18% 15%",
      "--sidebar-ring": "199 89% 48%",
    },
  },
  {
    id: "emerald",
    name: "Emerald Forest",
    description: "Rich greens inspired by lush forests",
    preview: {
      primary: "hsl(152, 69%, 40%)",
      background: "hsl(160, 20%, 7%)",
      accent: "hsl(142, 60%, 45%)",
    },
    variables: {
      "--background": "160 20% 7%",
      "--foreground": "150 15% 95%",
      "--card": "158 18% 10%",
      "--card-foreground": "150 15% 95%",
      "--popover": "158 18% 10%",
      "--popover-foreground": "150 15% 95%",
      "--primary": "152 69% 40%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "158 15% 15%",
      "--secondary-foreground": "150 10% 90%",
      "--muted": "158 15% 18%",
      "--muted-foreground": "155 10% 55%",
      "--accent": "142 60% 45%",
      "--accent-foreground": "0 0% 100%",
      "--destructive": "0 62.8% 45%",
      "--destructive-foreground": "0 0% 100%",
      "--border": "158 15% 18%",
      "--input": "158 15% 20%",
      "--ring": "152 69% 40%",
      "--sidebar-background": "160 20% 5%",
      "--sidebar-foreground": "150 10% 85%",
      "--sidebar-primary": "152 69% 40%",
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "158 15% 12%",
      "--sidebar-accent-foreground": "150 15% 95%",
      "--sidebar-border": "158 15% 15%",
      "--sidebar-ring": "152 69% 40%",
    },
  },
  {
    id: "sunset",
    name: "Golden Sunset",
    description: "Warm amber and orange tones",
    preview: {
      primary: "hsl(32, 95%, 50%)",
      background: "hsl(25, 20%, 8%)",
      accent: "hsl(45, 90%, 48%)",
    },
    variables: {
      "--background": "25 20% 8%",
      "--foreground": "35 20% 95%",
      "--card": "28 18% 11%",
      "--card-foreground": "35 20% 95%",
      "--popover": "28 18% 11%",
      "--popover-foreground": "35 20% 95%",
      "--primary": "32 95% 50%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "28 15% 16%",
      "--secondary-foreground": "35 15% 90%",
      "--muted": "28 15% 20%",
      "--muted-foreground": "30 12% 55%",
      "--accent": "45 90% 48%",
      "--accent-foreground": "25 30% 10%",
      "--destructive": "0 62.8% 45%",
      "--destructive-foreground": "0 0% 100%",
      "--border": "28 15% 18%",
      "--input": "28 15% 22%",
      "--ring": "32 95% 50%",
      "--sidebar-background": "25 20% 6%",
      "--sidebar-foreground": "35 15% 85%",
      "--sidebar-primary": "32 95% 50%",
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "28 15% 14%",
      "--sidebar-accent-foreground": "35 20% 95%",
      "--sidebar-border": "28 15% 15%",
      "--sidebar-ring": "32 95% 50%",
    },
  },
  {
    id: "lavender",
    name: "Lavender Dreams",
    description: "Soft purple and violet hues",
    preview: {
      primary: "hsl(262, 83%, 58%)",
      background: "hsl(260, 20%, 8%)",
      accent: "hsl(280, 65%, 50%)",
    },
    variables: {
      "--background": "260 20% 8%",
      "--foreground": "260 15% 95%",
      "--card": "258 18% 11%",
      "--card-foreground": "260 15% 95%",
      "--popover": "258 18% 11%",
      "--popover-foreground": "260 15% 95%",
      "--primary": "262 83% 58%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "258 15% 16%",
      "--secondary-foreground": "260 10% 90%",
      "--muted": "258 15% 20%",
      "--muted-foreground": "260 10% 55%",
      "--accent": "280 65% 50%",
      "--accent-foreground": "0 0% 100%",
      "--destructive": "0 62.8% 45%",
      "--destructive-foreground": "0 0% 100%",
      "--border": "258 15% 18%",
      "--input": "258 15% 22%",
      "--ring": "262 83% 58%",
      "--sidebar-background": "260 20% 6%",
      "--sidebar-foreground": "260 10% 85%",
      "--sidebar-primary": "262 83% 58%",
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "258 15% 14%",
      "--sidebar-accent-foreground": "260 15% 95%",
      "--sidebar-border": "258 15% 15%",
      "--sidebar-ring": "262 83% 58%",
    },
  },
  {
    id: "rose",
    name: "Rose Garden",
    description: "Elegant pink and rose tones",
    preview: {
      primary: "hsl(330, 81%, 60%)",
      background: "hsl(320, 18%, 8%)",
      accent: "hsl(350, 70%, 55%)",
    },
    variables: {
      "--background": "320 18% 8%",
      "--foreground": "330 15% 95%",
      "--card": "325 16% 11%",
      "--card-foreground": "330 15% 95%",
      "--popover": "325 16% 11%",
      "--popover-foreground": "330 15% 95%",
      "--primary": "330 81% 60%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "325 14% 16%",
      "--secondary-foreground": "330 10% 90%",
      "--muted": "325 14% 20%",
      "--muted-foreground": "325 10% 55%",
      "--accent": "350 70% 55%",
      "--accent-foreground": "0 0% 100%",
      "--destructive": "0 62.8% 45%",
      "--destructive-foreground": "0 0% 100%",
      "--border": "325 14% 18%",
      "--input": "325 14% 22%",
      "--ring": "330 81% 60%",
      "--sidebar-background": "320 18% 6%",
      "--sidebar-foreground": "330 10% 85%",
      "--sidebar-primary": "330 81% 60%",
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "325 14% 14%",
      "--sidebar-accent-foreground": "330 15% 95%",
      "--sidebar-border": "325 14% 15%",
      "--sidebar-ring": "330 81% 60%",
    },
  },
  {
    id: "midnight",
    name: "Midnight Blue",
    description: "Deep navy with electric blue accents",
    preview: {
      primary: "hsl(217, 91%, 60%)",
      background: "hsl(222, 47%, 6%)",
      accent: "hsl(230, 80%, 55%)",
    },
    variables: {
      "--background": "222 47% 6%",
      "--foreground": "210 20% 95%",
      "--card": "222 40% 9%",
      "--card-foreground": "210 20% 95%",
      "--popover": "222 40% 9%",
      "--popover-foreground": "210 20% 95%",
      "--primary": "217 91% 60%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "222 30% 14%",
      "--secondary-foreground": "210 15% 90%",
      "--muted": "222 30% 18%",
      "--muted-foreground": "217 15% 55%",
      "--accent": "230 80% 55%",
      "--accent-foreground": "0 0% 100%",
      "--destructive": "0 62.8% 45%",
      "--destructive-foreground": "0 0% 100%",
      "--border": "222 30% 16%",
      "--input": "222 30% 20%",
      "--ring": "217 91% 60%",
      "--sidebar-background": "222 47% 4%",
      "--sidebar-foreground": "210 15% 85%",
      "--sidebar-primary": "217 91% 60%",
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "222 30% 12%",
      "--sidebar-accent-foreground": "210 20% 95%",
      "--sidebar-border": "222 30% 13%",
      "--sidebar-ring": "217 91% 60%",
    },
  },
  {
    id: "slate",
    name: "Slate Modern",
    description: "Clean, professional slate gray tones",
    preview: {
      primary: "hsl(215, 20%, 50%)",
      background: "hsl(220, 15%, 8%)",
      accent: "hsl(200, 25%, 45%)",
    },
    variables: {
      "--background": "220 15% 8%",
      "--foreground": "210 15% 95%",
      "--card": "220 13% 11%",
      "--card-foreground": "210 15% 95%",
      "--popover": "220 13% 11%",
      "--popover-foreground": "210 15% 95%",
      "--primary": "215 20% 50%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "220 12% 16%",
      "--secondary-foreground": "210 10% 90%",
      "--muted": "220 12% 20%",
      "--muted-foreground": "215 10% 55%",
      "--accent": "200 25% 45%",
      "--accent-foreground": "0 0% 100%",
      "--destructive": "0 62.8% 45%",
      "--destructive-foreground": "0 0% 100%",
      "--border": "220 12% 18%",
      "--input": "220 12% 22%",
      "--ring": "215 20% 50%",
      "--sidebar-background": "220 15% 6%",
      "--sidebar-foreground": "210 10% 85%",
      "--sidebar-primary": "215 20% 50%",
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "220 12% 14%",
      "--sidebar-accent-foreground": "210 15% 95%",
      "--sidebar-border": "220 12% 15%",
      "--sidebar-ring": "215 20% 50%",
    },
  },
];

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (themeId: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    const savedThemeId = localStorage.getItem("app-theme");
    return themes.find((t) => t.id === savedThemeId) || themes[0];
  });

  useEffect(() => {
    // Apply theme variables to document root
    const root = document.documentElement;
    Object.entries(currentTheme.variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    localStorage.setItem("app-theme", currentTheme.id);
  }, [currentTheme]);

  const setTheme = (themeId: string) => {
    const theme = themes.find((t) => t.id === themeId);
    if (theme) {
      setCurrentTheme(theme);
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
