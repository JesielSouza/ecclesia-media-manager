import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  ClerkDeletedOrganization,
  ClerkDeletedOrganizationMembership,
  ClerkDeletedUser,
  ClerkOrganization,
  ClerkOrganizationMembership,
  ClerkUser,
  ClerkWebhookEvent,
  PlanType,
  ProfileRole,
} from "@/modules/clerk-sync/types";

type OrganizationRecord = {
  id: string;
  clerk_org_id: string | null;
  owner_id: string;
};

type ProfileOrganizationRecord = {
  id: string;
  org_id: string;
};

export class ClerkSyncService {
  private readonly supabase = createSupabaseAdminClient();

  async handleEvent(event: ClerkWebhookEvent): Promise<void> {
    switch (event.type) {
      case "organization.created":
      case "organization.updated":
        await this.upsertOrganization(event.data as ClerkOrganization);
        return;
      case "organization.deleted":
        await this.deleteOrganization(event.data as ClerkDeletedOrganization);
        return;
      case "organizationMembership.created":
      case "organizationMembership.updated":
        await this.upsertMembershipProfile(event.data as ClerkOrganizationMembership);
        return;
      case "organizationMembership.deleted":
        await this.deleteMembershipProfile(
          event.data as ClerkDeletedOrganizationMembership,
        );
        return;
      case "user.created":
      case "user.updated":
        await this.syncUserProfile(event.data as ClerkUser);
        return;
      case "user.deleted":
        await this.deleteUserProfile(event.data as ClerkDeletedUser);
        return;
      default:
        return;
    }
  }

  private async upsertOrganization(organization: ClerkOrganization): Promise<void> {
    const existingOrganization = await this.findOrganizationByClerkOrgId(organization.id);
    const ownerId =
      organization.created_by ??
      existingOrganization?.owner_id ??
      this.readStringMetadata(organization.private_metadata, "owner_id") ??
      this.readStringMetadata(organization.public_metadata, "owner_id");

    if (!ownerId) {
      throw new Error(
        `Nao foi possivel sincronizar a organizacao ${organization.id} sem um identificador de owner no Clerk.`,
      );
    }

    const payload = {
      clerk_org_id: organization.id,
      name: organization.name,
      slug: organization.slug,
      owner_id: ownerId,
      plan_type: this.resolvePlanType(organization),
    };

    if (existingOrganization) {
      await this.runSupabaseMutation(
        this.supabase
          .from("organizations")
          .update(payload)
          .eq("id", existingOrganization.id),
        `Falha ao atualizar a organizacao ${organization.id}.`,
      );

      return;
    }

    await this.runSupabaseMutation(
      this.supabase.from("organizations").insert(payload),
      `Falha ao inserir a organizacao ${organization.id}.`,
    );
  }

  private async deleteOrganization(
    organization: ClerkDeletedOrganization,
  ): Promise<void> {
    await this.runSupabaseMutation(
      this.supabase
        .from("organizations")
        .delete()
        .eq("clerk_org_id", organization.id),
      `Falha ao excluir a organizacao ${organization.id}.`,
    );
  }

  private async upsertMembershipProfile(
    membership: ClerkOrganizationMembership,
  ): Promise<void> {
    const clerkOrgId = membership.organization?.id;
    const userId = membership.public_user_data?.user_id;

    if (!clerkOrgId || !userId) {
      throw new Error(
        "O evento de membership nao trouxe o identificador da organizacao ou do usuario.",
      );
    }

    const organization = await this.findOrganizationByClerkOrgId(clerkOrgId);

    if (!organization) {
      throw new Error(
        `A organizacao ${clerkOrgId} ainda nao foi sincronizada no Supabase.`,
      );
    }

    const existingProfile = await this.findProfileOrganizationByUserId(userId);

    if (existingProfile && existingProfile.org_id !== organization.id) {
      throw new Error(
        `O usuario ${userId} ja esta vinculado a outra organizacao no modelo atual de profiles. O sync multi-org nao e suportado sem refatorar para memberships.`,
      );
    }

    const fullName = this.buildFullName({
      firstName: membership.public_user_data?.first_name ?? null,
      lastName: membership.public_user_data?.last_name ?? null,
      username: null,
      fallbackIdentifier: membership.public_user_data?.identifier ?? null,
      userId,
    });

    const phoneNumber = this.extractPhoneNumber(
      membership.public_user_data?.identifier ?? null,
    );

    await this.runSupabaseMutation(
      this.supabase.from("profiles").upsert(
        {
          id: userId,
          org_id: organization.id,
          role: this.mapMembershipRole(membership.role, membership.public_metadata),
          full_name: fullName,
          phone_number: phoneNumber,
        },
        { onConflict: "id" },
      ),
      `Falha ao fazer upsert do profile ${userId} a partir da membership ${membership.id}.`,
    );
  }

  private async deleteMembershipProfile(
    membership: ClerkDeletedOrganizationMembership,
  ): Promise<void> {
    const clerkOrgId = membership.organization?.id;
    const userId = membership.public_user_data?.user_id;

    if (!userId) {
      return;
    }

    const organization = clerkOrgId
      ? await this.findOrganizationByClerkOrgId(clerkOrgId)
      : null;
    const deleteQuery = organization
      ? this.supabase
          .from("profiles")
          .delete()
          .eq("id", userId)
          .eq("org_id", organization.id)
      : this.supabase.from("profiles").delete().eq("id", userId);

    await this.runSupabaseMutation(
      deleteQuery,
      `Falha ao excluir o profile ${userId} para a membership ${membership.id}.`,
    );
  }

  private async syncUserProfile(user: ClerkUser): Promise<void> {
    const fullName = this.buildFullName({
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username ?? null,
      fallbackIdentifier: user.email_addresses?.[0]?.email_address ?? null,
      userId: user.id,
    });

    const phoneNumber = user.phone_numbers?.[0]?.phone_number ?? null;

    await this.runSupabaseMutation(
      this.supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone_number: phoneNumber,
        })
        .eq("id", user.id),
      `Falha ao atualizar o profile ${user.id} a partir do sync de usuario.`,
    );
  }

  private async deleteUserProfile(user: ClerkDeletedUser): Promise<void> {
    await this.runSupabaseMutation(
      this.supabase.from("profiles").delete().eq("id", user.id),
      `Falha ao excluir o profile ${user.id}.`,
    );
  }

  private async findOrganizationByClerkOrgId(
    clerkOrgId: string,
  ): Promise<OrganizationRecord | null> {
    const { data, error } = await this.supabase
      .from("organizations")
      .select("id, clerk_org_id, owner_id")
      .eq("clerk_org_id", clerkOrgId)
      .maybeSingle<OrganizationRecord>();

    if (error) {
      throw new Error(
        `Falha ao resolver a organizacao ${clerkOrgId}: ${error.message}`,
      );
    }

    return data;
  }

  private async findProfileOrganizationByUserId(
    userId: string,
  ): Promise<ProfileOrganizationRecord | null> {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("id, org_id")
      .eq("id", userId)
      .maybeSingle<ProfileOrganizationRecord>();

    if (error) {
      throw new Error(`Falha ao resolver o profile ${userId}: ${error.message}`);
    }

    return data;
  }

  private resolvePlanType(organization: ClerkOrganization): PlanType {
    const metadataPlan =
      this.readStringMetadata(organization.private_metadata, "plan_type") ??
      this.readStringMetadata(organization.public_metadata, "plan_type");

    if (metadataPlan === "pro" || metadataPlan === "premium") {
      return metadataPlan;
    }

    return "basic";
  }

  private mapMembershipRole(
    clerkRole: string,
    metadata?: Record<string, unknown>,
  ): ProfileRole {
    const explicitRole = this.readStringMetadata(metadata, "role");

    if (
      explicitRole === "admin" ||
      explicitRole === "leader" ||
      explicitRole === "volunteer"
    ) {
      return explicitRole;
    }

    if (clerkRole === "org:admin") {
      return "admin";
    }

    return "volunteer";
  }

  private buildFullName(input: {
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    fallbackIdentifier: string | null;
    userId: string;
  }): string {
    const name = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();

    if (name) {
      return name;
    }

    if (input.username) {
      return input.username;
    }

    if (input.fallbackIdentifier) {
      return input.fallbackIdentifier;
    }

    return input.userId;
  }

  private extractPhoneNumber(identifier: string | null): string | null {
    if (!identifier) {
      return null;
    }

    return identifier.startsWith("+") ? identifier : null;
  }

  private readStringMetadata(
    metadata: Record<string, unknown> | undefined,
    key: string,
  ): string | null {
    const value = metadata?.[key];
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
  }

  private async runSupabaseMutation<T>(
    operation: PromiseLike<{ error: { message: string } | null; data: T }>,
    message: string,
  ): Promise<void> {
    const { error } = await operation;

    if (error) {
      throw new Error(`${message} ${error.message}`);
    }
  }
}

export function createClerkSyncService() {
  return new ClerkSyncService();
}
