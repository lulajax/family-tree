import { randomBytes } from 'crypto';
import { query } from '../config/database';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';

export type CollaborationRole = 'owner' | 'editor' | 'member' | 'viewer';
export type InviteRole = Exclude<CollaborationRole, 'owner'>;

export interface FamilyMembership {
  id: string;
  family_id: string;
  user_id: string;
  role: CollaborationRole;
  joined_at?: Date;
  invited_by?: string | null;
}

export interface FamilyInvite {
  id: string;
  family_id: string;
  invite_code: string;
  role: InviteRole;
  expires_at: Date | null;
  created_by: string | null;
  created_at: Date;
  accepted_by: string | null;
  accepted_at: Date | null;
}

export interface AuditLog {
  id: string;
  family_id: string | null;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: Date;
}

export class FamilyCollaborationService {
  constructor(private readonly generateCode = () => randomBytes(18).toString('base64url')) {}

  async listMembers(family_id: string): Promise<FamilyMembership[]> {
    const result = await query<FamilyMembership>(
      `
        SELECT *
        FROM family_memberships
        WHERE family_id = $1
        ORDER BY joined_at ASC
      `,
      [family_id]
    );
    return result.rows;
  }

  async createInvite(
    family_id: string,
    created_by: string | null,
    input: { role?: InviteRole; expires_at?: string | null }
  ): Promise<FamilyInvite> {
    const role = input.role ?? 'member';
    const expiresAt = input.expires_at ?? null;
    const inviteCode = this.generateCode();
    const result = await query<FamilyInvite>(
      `
        INSERT INTO family_invites (family_id, invite_code, role, expires_at, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [family_id, inviteCode, role, expiresAt, created_by]
    );
    const invite = result.rows[0];
    await this.logAudit(family_id, created_by, 'create_invite', 'family_invite', invite.id, null, {
      role: invite.role,
      expires_at: invite.expires_at,
    });
    return invite;
  }

  async acceptInvite(invite_code: string, user_id: string): Promise<FamilyMembership> {
    const inviteResult = await query<Pick<FamilyInvite, 'id' | 'family_id' | 'role' | 'accepted_at' | 'expires_at'>>(
      `
        SELECT id, family_id, role, accepted_at, expires_at
        FROM family_invites
        WHERE invite_code = $1
      `,
      [invite_code]
    );
    const invite = inviteResult.rows[0];
    if (!invite) {
      throw new NotFoundError('邀请', invite_code);
    }
    if (invite.accepted_at) {
      throw new ConflictError('邀请已被使用');
    }
    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      throw new ValidationError('邀请已过期');
    }

    const membershipResult = await query<FamilyMembership>(
      `
        INSERT INTO family_memberships (family_id, user_id, role, invited_by)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (family_id, user_id)
        DO UPDATE SET role = EXCLUDED.role
        RETURNING *
      `,
      [invite.family_id, user_id, invite.role, null]
    );

    await query(
      `
        UPDATE family_invites
        SET accepted_by = $1, accepted_at = NOW()
        WHERE id = $2
      `,
      [user_id, invite.id]
    );

    const membership = membershipResult.rows[0];
    await this.logAudit(invite.family_id, user_id, 'accept_invite', 'family_membership', membership.id, null, {
      role: membership.role,
      invite_id: invite.id,
    });

    return membership;
  }

  async listActivity(family_id: string, limit = 50): Promise<AuditLog[]> {
    const result = await query<AuditLog>(
      `
        SELECT *
        FROM audit_logs
        WHERE family_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
      [family_id, limit]
    );
    return result.rows;
  }

  private async logAudit(
    family_id: string,
    actor_user_id: string | null,
    action: string,
    entity_type: string,
    entity_id: string | null,
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null
  ): Promise<void> {
    await query(
      `
        INSERT INTO audit_logs (family_id, actor_user_id, action, entity_type, entity_id, before, after)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [family_id, actor_user_id, action, entity_type, entity_id, before, after]
    );
  }
}

export const familyCollaborationService = new FamilyCollaborationService();
