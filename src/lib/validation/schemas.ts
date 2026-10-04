import { z } from "zod";

export const registerSchema = z
  .object({
    first_name: z.string().min(1, "First name is required").max(80),
    last_name: z.string().min(1, "Last name is required").max(80),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(24)
      .regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers and underscores only"),
    email: z.string().email("Enter a valid email address"),
    country_code: z.string().length(2, "Select your country"),
    phone: z.string().min(7, "Enter a valid phone number").max(20),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[a-z]/, "Include a lowercase letter")
      .regex(/[0-9]/, "Include a number"),
    confirm_password: z.string(),
    accept_terms: z.literal(true, {
      errorMap: () => ({ message: "You must accept the terms" }),
    }),
    marketing_opt_in: z.boolean().optional().default(false),
  })
  .refine((v) => v.password === v.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  remember_me: z.boolean().optional().default(false),
});

export const listingSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(140),
  description: z.string().min(20, "Description must be at least 20 characters"),
  price_amount: z.number().int().positive("Price must be greater than zero"),
  currency: z.string().length(3).default("KES"),
  platform_id: z.string().uuid("Select a platform"),
  game_version: z.string().optional(),
  region: z.string().optional(),
  account_level: z.number().int().nonnegative().optional(),
  overall_strength: z.number().int().min(0).max(100).optional(),
  gp_balance: z.number().int().nonnegative().optional(),
  coin_balance: z.number().int().nonnegative().optional(),
  ef_points: z.number().int().nonnegative().optional(),
  contract_renewal_tickets: z.number().int().nonnegative().optional(),
  chance_deals: z.number().int().nonnegative().optional(),
  booster_tokens: z.number().int().nonnegative().optional(),
  training_programs: z.number().int().nonnegative().optional(),
  player_slots: z.number().int().nonnegative().optional(),
  legend_players: z.number().int().nonnegative().optional(),
  epic_players: z.number().int().nonnegative().optional(),
  big_time_players: z.number().int().nonnegative().optional(),
  highlight_players: z.number().int().nonnegative().optional(),
  featured_players: z.number().int().nonnegative().optional(),
  national_team_packs: z.number().int().nonnegative().optional(),
  club_packs: z.number().int().nonnegative().optional(),
  manager: z.string().optional(),
  formation: z.string().optional(),
  playstyle: z.string().optional(),
  possession_rating: z.number().int().min(0).max(99).optional(),
  quick_counter_rating: z.number().int().min(0).max(99).optional(),
  long_ball_counter_rating: z.number().int().min(0).max(99).optional(),
  out_wide_rating: z.number().int().min(0).max(99).optional(),
  long_ball_rating: z.number().int().min(0).max(99).optional(),
  current_division: z.string().optional(),
  highest_division: z.string().optional(),
  dream_team_name: z.string().optional(),
  matches_played: z.number().int().nonnegative().optional(),
  wins: z.number().int().nonnegative().optional(),
  draws: z.number().int().nonnegative().optional(),
  losses: z.number().int().nonnegative().optional(),
  goals_scored: z.number().int().nonnegative().optional(),
  goals_conceded: z.number().int().nonnegative().optional(),
  account_age_days: z.number().int().nonnegative().optional(),
  linked_email_status: z.enum(["linked", "unlinked", "unknown"]).optional(),
  konami_id_status: z.enum(["linked", "unlinked", "unknown"]).optional(),
  transferable: z.boolean().default(true),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ListingInput = z.infer<typeof listingSchema>;
