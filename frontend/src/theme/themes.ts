export const APP_THEMES = [
  {
    id: "citizen",
    label: "Người dân",
    description: "Giao diện công dân",
  },
  {
    id: "admin",
    label: "Admin",
    description: "Giao diện quản trị",
  },
  {
    id: "contrast",
    label: "Tương phản",
    description: "Tương phản cao",
  },
] as const;

export type AppTheme = (typeof APP_THEMES)[number]["id"];

export const isAppTheme = (value: string): value is AppTheme =>
  APP_THEMES.some((theme) => theme.id === value);
