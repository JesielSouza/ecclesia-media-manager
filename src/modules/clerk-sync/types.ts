export type PlanType = "basic" | "pro" | "premium";
export type ProfileRole = "admin" | "leader" | "volunteer";

export type ClerkWebhookEventType =
  | "organization.created"
  | "organization.updated"
  | "organization.deleted"
  | "organizationMembership.created"
  | "organizationMembership.updated"
  | "organizationMembership.deleted"
  | "user.created"
  | "user.updated"
  | "user.deleted";

export interface ClerkWebhookEvent<TData = unknown> {
  type: ClerkWebhookEventType | string;
  data: TData;
}

export interface ClerkOrganization {
  id: string;
  name: string;
  slug: string;
  created_by: string | null;
  public_metadata?: Record<string, unknown>;
  private_metadata?: Record<string, unknown>;
}

export interface ClerkDeletedOrganization {
  id: string;
}

export interface ClerkPublicUserData {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  identifier: string | null;
}

export interface ClerkOrganizationMembership {
  id: string;
  role: string;
  public_metadata?: Record<string, unknown>;
  private_metadata?: Record<string, unknown>;
  public_user_data?: ClerkPublicUserData | null;
  organization: {
    id: string;
  } | null;
}

export interface ClerkDeletedOrganizationMembership {
  id: string;
  organization: {
    id: string;
  } | null;
  public_user_data?: {
    user_id: string;
  } | null;
}

export interface ClerkPhoneNumber {
  phone_number: string;
}

export interface ClerkEmailAddress {
  email_address: string;
}

export interface ClerkUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username?: string | null;
  phone_numbers?: ClerkPhoneNumber[];
  email_addresses?: ClerkEmailAddress[];
}

export interface ClerkDeletedUser {
  id: string;
}
