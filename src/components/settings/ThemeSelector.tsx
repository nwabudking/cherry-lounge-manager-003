import { useTheme, themes, Theme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

export const ThemeSelector = () => {
  const { currentTheme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Choose Your Theme
        </CardTitle>
        <CardDescription>
          Transform the look and feel of your entire application
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {themes.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              isActive={currentTheme.id === theme.id}
              onClick={() => setTheme(theme.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

interface ThemeCardProps {
  theme: Theme;
  isActive: boolean;
  onClick: () => void;
}

const ThemeCard = ({ theme, isActive, onClick }: ThemeCardProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative group rounded-xl overflow-hidden transition-all duration-300",
        "border-2 hover:scale-[1.02] hover:shadow-lg",
        isActive
          ? "border-primary ring-2 ring-primary/30"
          : "border-border hover:border-primary/50"
      )}
    >
      {/* Theme Preview */}
      <div
        className="h-24 relative"
        style={{ background: theme.preview.background }}
      >
        {/* Decorative elements */}
        <div className="absolute inset-2 flex flex-col gap-2">
          {/* Header bar */}
          <div
            className="h-3 w-full rounded-sm opacity-30"
            style={{ background: theme.preview.primary }}
          />
          {/* Content blocks */}
          <div className="flex gap-2 flex-1">
            <div
              className="w-1/3 rounded-sm"
              style={{ background: theme.preview.primary }}
            />
            <div className="flex-1 flex flex-col gap-1">
              <div
                className="h-2 w-3/4 rounded-sm opacity-40"
                style={{ background: theme.preview.accent }}
              />
              <div
                className="h-2 w-1/2 rounded-sm opacity-30"
                style={{ background: theme.preview.accent }}
              />
              <div
                className="h-2 w-2/3 rounded-sm opacity-20"
                style={{ background: theme.preview.accent }}
              />
            </div>
          </div>
        </div>

        {/* Active indicator */}
        {isActive && (
          <div
            className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: theme.preview.primary }}
          >
            <Check className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Theme info */}
      <div className="p-3 bg-card text-left">
        <div className="flex items-center gap-2 mb-1">
          {/* Color dots */}
          <div className="flex -space-x-1">
            <div
              className="w-4 h-4 rounded-full border-2 border-card"
              style={{ background: theme.preview.primary }}
            />
            <div
              className="w-4 h-4 rounded-full border-2 border-card"
              style={{ background: theme.preview.accent }}
            />
            <div
              className="w-4 h-4 rounded-full border-2 border-card"
              style={{ background: theme.preview.background }}
            />
          </div>
        </div>
        <h3 className="font-semibold text-sm text-foreground">{theme.name}</h3>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {theme.description}
        </p>
      </div>
    </button>
  );
};
