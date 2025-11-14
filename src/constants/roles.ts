export const Roles = {
  ADMIN: "Admin",
  PLAYER: "Player",
  SUPPORT: "Support",
  DEVELOPER: "Developer",
  ACCOUNTANT: "Accountant",
  MANAGER: "Manager",
  MODERATOR: "Moderator",
} as const;

export type Role = typeof Roles[keyof typeof Roles];