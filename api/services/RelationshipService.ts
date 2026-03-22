import { randomUUID } from 'crypto';
import { query, withTransaction } from '../config/database';
import {
  CreateRelationshipInput,
  UpdateRelationshipInput,
} from '../types/schemas';
import { Relationship, RelationshipType, RelationshipVersion } from '../types';
import { ConflictError, CycleDetectedError, NotFoundError } from '../utils/errors';
import { cycleDetectionService } from './CycleDetectionService';

type ListRelationshipOptions = {
  type?: RelationshipType;
  page?: number;
  limit?: number;
};

export class RelationshipService {
  async createRelationship(
    input: CreateRelationshipInput,
    created_by: string
  ): Promise<Relationship> {
    const wouldCreateCycle = await cycleDetectionService.wouldCreateCycle(
      input.from_person_id,
      input.to_person_id,
      input.type
    );

    if (wouldCreateCycle) {
      throw new CycleDetectedError();
    }

    return withTransaction(async (client) => {
      const now = new Date();
      const result = await client.query<Relationship>(
        `
          INSERT INTO relationships (
            id, from_person_id, to_person_id, type, subtype, start_date, end_date,
            is_active, metadata, created_at, updated_at, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, $9, $10, $11)
          RETURNING *
        `,
        [
          randomUUID(),
          input.from_person_id,
          input.to_person_id,
          input.type,
          input.subtype ?? null,
          input.start_date ? new Date(input.start_date) : null,
          input.end_date ? new Date(input.end_date) : null,
          input.metadata ? JSON.stringify(input.metadata) : null,
          now,
          now,
          created_by,
        ]
      );

      await this.insertVersion(client, result.rows[0], 1, created_by);
      return result.rows[0];
    });
  }

  async getRelationship(relationship_id: string): Promise<Relationship | null> {
    const result = await query<Relationship>(
      'SELECT * FROM relationships WHERE id = $1',
      [relationship_id]
    );
    return result.rows[0] ?? null;
  }

  async getRelationshipBetween(
    person1_id: string,
    person2_id: string,
    type?: RelationshipType
  ): Promise<Relationship | null> {
    const params: Array<string> = [person1_id, person2_id];
    const clauses = [
      `(
        (from_person_id = $1 AND to_person_id = $2)
        OR
        (from_person_id = $2 AND to_person_id = $1)
      )`,
      'is_active = TRUE',
    ];

    if (type) {
      params.push(type);
      clauses.push(`type = $${params.length}`);
    }

    const result = await query<Relationship>(
      `
        SELECT *
        FROM relationships
        WHERE ${clauses.join(' AND ')}
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      params
    );

    return result.rows[0] ?? null;
  }

  async updateRelationship(
    relationship_id: string,
    input: UpdateRelationshipInput,
    updated_by: string
  ): Promise<Relationship> {
    return withTransaction(async (client) => {
      const current = await client.query<Relationship>(
        'SELECT * FROM relationships WHERE id = $1 FOR UPDATE',
        [relationship_id]
      );

      if (current.rows.length === 0) {
        throw new NotFoundError('关系', relationship_id);
      }

      if (
        (input.type ?? current.rows[0].type) === 'parent_child' &&
        input.type === 'parent_child'
      ) {
        const wouldCreateCycle = await cycleDetectionService.wouldCreateCycle(
          current.rows[0].from_person_id,
          current.rows[0].to_person_id,
          'parent_child'
        );
        if (wouldCreateCycle) {
          throw new CycleDetectedError();
        }
      }

      const now = new Date();
      const result = await client.query<Relationship>(
        `
          UPDATE relationships
          SET
            type = COALESCE($1, type),
            subtype = COALESCE($2, subtype),
            start_date = COALESCE($3, start_date),
            end_date = COALESCE($4, end_date),
            is_active = COALESCE($5, is_active),
            metadata = COALESCE($6, metadata),
            updated_at = $7
          WHERE id = $8
          RETURNING *
        `,
        [
          input.type ?? null,
          input.subtype ?? null,
          input.start_date ? new Date(input.start_date) : null,
          input.end_date ? new Date(input.end_date) : null,
          input.is_active ?? null,
          input.metadata ? JSON.stringify(input.metadata) : null,
          now,
          relationship_id,
        ]
      );

      await client.query(
        `
          UPDATE relationship_versions
          SET valid_to = $1
          WHERE relationship_id = $2
            AND valid_to IS NULL
        `,
        [now, relationship_id]
      );

      const versionResult = await client.query<{ next_version: number }>(
        `
          SELECT COALESCE(MAX(version), 0) + 1 AS next_version
          FROM relationship_versions
          WHERE relationship_id = $1
        `,
        [relationship_id]
      );

      await this.insertVersion(
        client,
        result.rows[0],
        versionResult.rows[0].next_version,
        updated_by
      );

      return result.rows[0];
    });
  }

  async deleteRelationship(relationship_id: string, deleted_by: string): Promise<void> {
    return withTransaction(async (client) => {
      const current = await client.query<Relationship>(
        'SELECT * FROM relationships WHERE id = $1 FOR UPDATE',
        [relationship_id]
      );

      if (current.rows.length === 0) {
        throw new NotFoundError('关系', relationship_id);
      }

      if (!current.rows[0].is_active) {
        throw new ConflictError('关系已失效，无法重复删除');
      }

      const now = new Date();
      const result = await client.query<Relationship>(
        `
          UPDATE relationships
          SET is_active = FALSE, updated_at = $1
          WHERE id = $2
          RETURNING *
        `,
        [now, relationship_id]
      );

      await client.query(
        `
          UPDATE relationship_versions
          SET valid_to = $1
          WHERE relationship_id = $2
            AND valid_to IS NULL
        `,
        [now, relationship_id]
      );

      const versionResult = await client.query<{ next_version: number }>(
        `
          SELECT COALESCE(MAX(version), 0) + 1 AS next_version
          FROM relationship_versions
          WHERE relationship_id = $1
        `,
        [relationship_id]
      );

      await this.insertVersion(
        client,
        result.rows[0],
        versionResult.rows[0].next_version,
        deleted_by
      );
    });
  }

  async getRelationshipHistory(
    relationship_id: string,
    from?: Date,
    to?: Date
  ): Promise<RelationshipVersion[]> {
    const clauses = ['relationship_id = $1'];
    const params: Array<string | Date> = [relationship_id];

    if (from) {
      params.push(from);
      clauses.push(`valid_from >= $${params.length}`);
    }

    if (to) {
      params.push(to);
      clauses.push(`valid_from <= $${params.length}`);
    }

    const result = await query<RelationshipVersion>(
      `
        SELECT *
        FROM relationship_versions
        WHERE ${clauses.join(' AND ')}
        ORDER BY version ASC
      `,
      params
    );

    return result.rows;
  }

  async listPersonRelationships(
    person_id: string,
    options: ListRelationshipOptions = {}
  ): Promise<{ relationships: Relationship[]; total: number }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const offset = (page - 1) * limit;
    const params: Array<string | number> = [person_id];
    const clauses = ['(from_person_id = $1 OR to_person_id = $1)', 'is_active = TRUE'];

    if (options.type) {
      params.push(options.type);
      clauses.push(`type = $${params.length}`);
    }

    const totalResult = await query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM relationships WHERE ${clauses.join(' AND ')}`,
      params
    );

    params.push(limit, offset);
    const result = await query<Relationship>(
      `
        SELECT *
        FROM relationships
        WHERE ${clauses.join(' AND ')}
        ORDER BY updated_at DESC
        LIMIT $${params.length - 1}
        OFFSET $${params.length}
      `,
      params
    );

    return {
      relationships: result.rows,
      total: parseInt(totalResult.rows[0].total, 10),
    };
  }

  async getParentIds(person_id: string): Promise<string[]> {
    const result = await query<{ from_person_id: string }>(
      `
        SELECT from_person_id
        FROM relationships
        WHERE to_person_id = $1
          AND type = 'parent_child'
          AND is_active = TRUE
      `,
      [person_id]
    );

    return result.rows.map((row) => row.from_person_id);
  }

  async getChildIds(person_id: string): Promise<string[]> {
    const result = await query<{ to_person_id: string }>(
      `
        SELECT to_person_id
        FROM relationships
        WHERE from_person_id = $1
          AND type = 'parent_child'
          AND is_active = TRUE
      `,
      [person_id]
    );

    return result.rows.map((row) => row.to_person_id);
  }

  async getSpouseIds(person_id: string): Promise<string[]> {
    const result = await query<{ spouse_id: string }>(
      `
        SELECT
          CASE
            WHEN from_person_id = $1 THEN to_person_id
            ELSE from_person_id
          END AS spouse_id
        FROM relationships
        WHERE (from_person_id = $1 OR to_person_id = $1)
          AND type = 'spouse'
          AND is_active = TRUE
      `,
      [person_id]
    );

    return result.rows.map((row) => row.spouse_id);
  }

  async getSiblingIds(person_id: string): Promise<string[]> {
    const parent_ids = await this.getParentIds(person_id);
    if (parent_ids.length === 0) {
      return [];
    }

    const result = await query<{ to_person_id: string }>(
      `
        SELECT DISTINCT to_person_id
        FROM relationships
        WHERE from_person_id = ANY($1)
          AND type = 'parent_child'
          AND is_active = TRUE
          AND to_person_id <> $2
      `,
      [parent_ids, person_id]
    );

    return result.rows.map((row) => row.to_person_id);
  }

  private async insertVersion(
    client: { query: (sql: string, values?: unknown[]) => Promise<unknown> },
    relationship: Relationship,
    version: number,
    changed_by: string
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO relationship_versions (
          id, relationship_id, version, from_person_id, to_person_id, type, subtype,
          start_date, end_date, is_active, valid_from, valid_to, changed_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULL, $12)
      `,
      [
        randomUUID(),
        relationship.id,
        version,
        relationship.from_person_id,
        relationship.to_person_id,
        relationship.type,
        relationship.subtype,
        relationship.start_date,
        relationship.end_date,
        relationship.is_active,
        relationship.updated_at,
        changed_by,
      ]
    );
  }
}

export const relationshipService = new RelationshipService();
