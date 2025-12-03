export const Roles = {
  ADMIN: "Admin",
  PLAYER: "Player",
  SUPPORT: "Support",
  DEVELOPER: "Developer",
  ACCOUNTANT: "Accountant",
  MANAGER: "Manager",
  MODERATOR: "Moderator",
  AFFILIATE: "Affiliate",
  AFFILIATES_MANAGER: "Affiliates Manager",
  INFLUENCER: "Influencer",
} as const;

export type Role = typeof Roles[keyof typeof Roles];