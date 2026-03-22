import { query, withTransaction } from '../config/database';
import { Family, FamilyListItem, FamilyStats, Person, TreeNode, TreeSpouse } from '../types';
import { NotFoundError, ConflictError } from '../utils/errors';
import { formatDate } from '../utils/date';

type ListFamiliesOptions = {
  page?: number;
  limit?: number;
  name?: string;
};

export class FamilyService {
  async createFamily(
    name: string,
    description?: string,
    root_person_id?: string,
    created_by = 'system'
  ): Promise<Family> {
    const result = await query<Family>(
      `
        INSERT INTO families (
          name, description, root_person_id, created_at, updated_at, created_by
        )
        VALUES ($1, $2, $3, NOW(), NOW(), $4)
        RETURNING *
      `,
      [name, description ?? null, root_person_id ?? null, created_by]
    );

    return result.rows[0];
  }

  async listFamilies(
    options: ListFamiliesOptions = {}
  ): Promise<{ families: FamilyListItem[]; total: number }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const offset = (page - 1) * limit;
    const params: Array<string | number> = [];
    const clauses: string[] = [];

    if (options.name) {
      params.push(`%${options.name}%`);
      clauses.push(`f.name ILIKE $${params.length}`);
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const totalResult = await query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM families f ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await query<FamilyListItem>(
      `
        SELECT
          f.*,
          (
            SELECT COUNT(*)::int
            FROM persons p
            WHERE p.family_id = f.id
          ) AS member_count
        FROM families f
        ${whereClause}
        ORDER BY f.updated_at DESC
        LIMIT $${params.length - 1}
        OFFSET $${params.length}
      `,
      params
    );

    return {
      families: result.rows,
      total: parseInt(totalResult.rows[0].total, 10),
    };
  }

  async getFamily(family_id: string): Promise<Family | null> {
    const result = await query<Family>('SELECT * FROM families WHERE id = $1', [family_id]);
    return result.rows[0] ?? null;
  }

  async updateFamily(
    family_id: string,
    updates: {
      name?: string;
      description?: string;
      root_person_id?: string;
    }
  ): Promise<Family> {
    const result = await query<Family>(
      `
        UPDATE families
        SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          root_person_id = COALESCE($3, root_person_id),
          updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `,
      [
        updates.name ?? null,
        updates.description ?? null,
        updates.root_person_id ?? null,
        family_id,
      ]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('家族', family_id);
    }

    return result.rows[0];
  }

  async deleteFamily(family_id: string): Promise<void> {
    return withTransaction(async (client) => {
      const family = await client.query<Family>('SELECT * FROM families WHERE id = $1', [family_id]);
      if (family.rows.length === 0) {
        throw new NotFoundError('家族', family_id);
      }

      const persons = await client.query<{ total: string }>(
        'SELECT COUNT(*)::text AS total FROM persons WHERE family_id = $1',
        [family_id]
      );

      if (parseInt(persons.rows[0].total, 10) > 0) {
        throw new ConflictError('家族中仍有成员，无法删除');
      }

      await client.query('DELETE FROM families WHERE id = $1', [family_id]);
    });
  }

  async setRootPerson(family_id: string, person_id: string): Promise<Family> {
    const person = await query<Person>(
      'SELECT * FROM persons WHERE id = $1 AND family_id = $2',
      [person_id, family_id]
    );

    if (person.rows.length === 0) {
      throw new NotFoundError('家族成员', person_id);
    }

    return this.updateFamily(family_id, { root_person_id: person_id });
  }

  async getFamilyTree(
    family_id: string,
    options: {
      rootPersonId?: string;
      depth?: number;
      asOfDate?: Date;
    } = {}
  ): Promise<TreeNode | null> {
    const depth = options.depth ?? 6;
    const family = await this.getFamily(family_id);
    if (!family) {
      throw new NotFoundError('家族', family_id);
    }

    let root_id = options.rootPersonId ?? family.root_person_id;

    if (!root_id) {
      const fallback = await query<{ id: string }>(
        `
          SELECT id
          FROM persons
          WHERE family_id = $1
          ORDER BY birth_date NULLS LAST, created_at ASC
          LIMIT 1
        `,
        [family_id]
      );
      root_id = fallback.rows[0]?.id ?? null;
    }

    if (!root_id) {
      return null;
    }

    return this.buildTreeNode(root_id, depth, 0, new Set<string>());
  }

  async getFamilyStats(family_id: string): Promise<FamilyStats> {
    const family = await this.getFamily(family_id);
    if (!family) {
      throw new NotFoundError('家族', family_id);
    }

    const people = await query<{ total: string }>(
      'SELECT COUNT(*)::text AS total FROM persons WHERE family_id = $1',
      [family_id]
    );
    const relationships = await query<{ total: string }>(
      `
        SELECT COUNT(*)::text AS total
        FROM relationships r
        JOIN persons p ON p.id = r.from_person_id
        WHERE p.family_id = $1
      `,
      [family_id]
    );

    const depthResult = family.root_person_id
      ? await query<{ depth: number }>(
          `
            WITH RECURSIVE tree AS (
              SELECT $1::uuid AS person_id, 0 AS depth
              UNION ALL
              SELECT r.to_person_id, tree.depth + 1
              FROM tree
              JOIN relationships r ON r.from_person_id = tree.person_id
              WHERE r.type = 'parent_child'
                AND r.is_active = TRUE
                AND tree.depth < 20
            )
            SELECT COALESCE(MAX(depth), 0) AS depth
            FROM tree
          `,
          [family.root_person_id]
        )
      : { rows: [{ depth: 0 }] };

    return {
      family_id,
      total_people: parseInt(people.rows[0].total, 10),
      total_relationships: parseInt(relationships.rows[0].total, 10),
      max_generation_depth: depthResult.rows[0].depth ?? 0,
      root_person_id: family.root_person_id,
    };
  }

  private async buildTreeNode(
    person_id: string,
    max_depth: number,
    generation: number,
    visited: Set<string>
  ): Promise<TreeNode | null> {
    if (visited.has(person_id) || generation >= max_depth) {
      return null;
    }

    visited.add(person_id);

    const personResult = await query<Person>('SELECT * FROM persons WHERE id = $1', [person_id]);
    const person = personResult.rows[0];
    if (!person) {
      return null;
    }

    const spouseResult = await query<Person & { start_date: Date | null; end_date: Date | null }>(
      `
        SELECT
          p.*,
          r.start_date,
          r.end_date
        FROM persons p
        JOIN relationships r ON
          (
            r.from_person_id = $1
            AND r.to_person_id = p.id
          )
          OR (
            r.to_person_id = $1
            AND r.from_person_id = p.id
          )
        WHERE r.type = 'spouse'
          AND r.is_active = TRUE
      `,
      [person_id]
    );

    const spouses: TreeSpouse[] = spouseResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      start_date: formatDate(row.start_date) ?? null,
      end_date: formatDate(row.end_date) ?? null,
    }));

    const childrenResult = await query<Person>(
      `
        SELECT p.*
        FROM persons p
        JOIN relationships r ON r.to_person_id = p.id
        WHERE r.from_person_id = $1
          AND r.type = 'parent_child'
          AND r.is_active = TRUE
        ORDER BY p.birth_date NULLS LAST, p.name
      `,
      [person_id]
    );

    const childNodes: TreeNode[] = [];
    for (const child of childrenResult.rows) {
      const childNode = await this.buildTreeNode(
        child.id,
        max_depth,
        generation + 1,
        new Set(visited)
      );
      if (childNode) {
        childNodes.push(childNode);
      }
    }

    return {
      id: person.id,
      name: person.name,
      gender: person.gender,
      birth_date: formatDate(person.birth_date) ?? null,
      death_date: formatDate(person.death_date) ?? null,
      generation,
      spouses,
      children: childNodes,
    };
  }
}

export const familyService = new FamilyService();
