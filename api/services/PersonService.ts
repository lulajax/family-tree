import { randomUUID } from 'crypto';
import { query, withTransaction } from '../config/database';
import { CreatePersonInput, UpdatePersonInput } from '../types/schemas';
import { Person, PersonVersion } from '../types';
import { ConflictError, NotFoundError } from '../utils/errors';

type ListFamilyMembersOptions = {
  page?: number;
  limit?: number;
  gender?: string;
  name?: string;
};

export class PersonService {
  async createPerson(
    input: CreatePersonInput,
    created_by: string
  ): Promise<Person> {
    return withTransaction(async (client) => {
      const now = new Date();
      const id = randomUUID();
      const result = await client.query<Person>(
        `
          INSERT INTO persons (
            id, family_id, name, gender, birth_date, death_date, bio,
            created_at, updated_at, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `,
        [
          id,
          input.family_id,
          input.name,
          input.gender,
          input.birth_date ? new Date(input.birth_date) : null,
          input.death_date ? new Date(input.death_date) : null,
          input.bio ?? null,
          now,
          now,
          created_by,
        ]
      );

      await this.insertVersion(client, result.rows[0], 1, created_by, 'initial_create');
      return result.rows[0];
    });
  }

  async getPerson(person_id: string, as_of?: Date): Promise<Person | null> {
    if (!as_of) {
      const result = await query<Person>('SELECT * FROM persons WHERE id = $1', [person_id]);
      return result.rows[0] ?? null;
    }

    const result = await query<Person>(
      `
        SELECT
          p.id,
          p.family_id,
          pv.name,
          pv.gender,
          pv.birth_date,
          pv.death_date,
          pv.bio,
          p.created_at,
          pv.valid_from AS updated_at,
          p.created_by
        FROM persons p
        JOIN person_versions pv ON pv.person_id = p.id
        WHERE p.id = $1
          AND pv.valid_from <= $2
          AND (pv.valid_to IS NULL OR pv.valid_to > $2)
        ORDER BY pv.version DESC
        LIMIT 1
      `,
      [person_id, as_of]
    );

    return result.rows[0] ?? null;
  }

  async updatePerson(
    person_id: string,
    input: UpdatePersonInput,
    updated_by: string
  ): Promise<Person> {
    return withTransaction(async (client) => {
      const current = await client.query<Person>('SELECT * FROM persons WHERE id = $1 FOR UPDATE', [person_id]);
      if (current.rows.length === 0) {
        throw new NotFoundError('人员', person_id);
      }

      const now = new Date();
      const updated = await client.query<Person>(
        `
          UPDATE persons
          SET
            name = COALESCE($1, name),
            gender = COALESCE($2, gender),
            birth_date = COALESCE($3, birth_date),
            death_date = COALESCE($4, death_date),
            bio = COALESCE($5, bio),
            updated_at = $6
          WHERE id = $7
          RETURNING *
        `,
        [
          input.name ?? null,
          input.gender ?? null,
          input.birth_date ? new Date(input.birth_date) : null,
          input.death_date ? new Date(input.death_date) : null,
          input.bio ?? null,
          now,
          person_id,
        ]
      );

      await client.query(
        `
          UPDATE person_versions
          SET valid_to = $1
          WHERE person_id = $2
            AND valid_to IS NULL
        `,
        [now, person_id]
      );

      const versionResult = await client.query<{ next_version: number }>(
        `
          SELECT COALESCE(MAX(version), 0) + 1 AS next_version
          FROM person_versions
          WHERE person_id = $1
        `,
        [person_id]
      );

      await this.insertVersion(
        client,
        updated.rows[0],
        versionResult.rows[0].next_version,
        updated_by,
        input.change_reason ?? 'updated'
      );

      return updated.rows[0];
    });
  }

  async deletePerson(person_id: string, _deleted_by: string): Promise<void> {
    return withTransaction(async (client) => {
      const person = await client.query<Person>('SELECT * FROM persons WHERE id = $1', [person_id]);
      if (person.rows.length === 0) {
        throw new NotFoundError('人员', person_id);
      }

      const relationships = await client.query<{ total: string }>(
        `
          SELECT COUNT(*)::text AS total
          FROM relationships
          WHERE is_active = TRUE
            AND (from_person_id = $1 OR to_person_id = $1)
        `,
        [person_id]
      );

      if (parseInt(relationships.rows[0].total, 10) > 0) {
        throw new ConflictError('该人员存在关联关系，无法删除');
      }

      await client.query('DELETE FROM person_versions WHERE person_id = $1', [person_id]);
      await client.query('DELETE FROM persons WHERE id = $1', [person_id]);
    });
  }

  async getPersonHistory(
    person_id: string,
    from?: Date,
    to?: Date
  ): Promise<PersonVersion[]> {
    const clauses = ['person_id = $1'];
    const params: Array<string | Date> = [person_id];

    if (from) {
      params.push(from);
      clauses.push(`valid_from >= $${params.length}`);
    }

    if (to) {
      params.push(to);
      clauses.push(`valid_from <= $${params.length}`);
    }

    const result = await query<PersonVersion>(
      `
        SELECT *
        FROM person_versions
        WHERE ${clauses.join(' AND ')}
        ORDER BY version ASC
      `,
      params
    );

    return result.rows;
  }

  async listFamilyMembers(
    family_id: string,
    options: ListFamilyMembersOptions = {}
  ): Promise<{ persons: Person[]; total: number }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const offset = (page - 1) * limit;
    const clauses = ['family_id = $1'];
    const params: Array<string | number> = [family_id];

    if (options.gender) {
      params.push(options.gender);
      clauses.push(`gender = $${params.length}`);
    }

    if (options.name) {
      params.push(`%${options.name}%`);
      clauses.push(`name ILIKE $${params.length}`);
    }

    const whereClause = clauses.join(' AND ');
    const totalResult = await query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM persons WHERE ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const listResult = await query<Person>(
      `
        SELECT *
        FROM persons
        WHERE ${whereClause}
        ORDER BY name
        LIMIT $${params.length - 1}
        OFFSET $${params.length}
      `,
      params
    );

    return {
      persons: listResult.rows,
      total: parseInt(totalResult.rows[0].total, 10),
    };
  }

  async getParents(person_id: string): Promise<{ father?: Person; mother?: Person }> {
    const result = await query<Person & { subtype: string | null }>(
      `
        SELECT p.*, r.subtype
        FROM persons p
        JOIN relationships r ON r.from_person_id = p.id
        WHERE r.to_person_id = $1
          AND r.type = 'parent_child'
          AND r.is_active = TRUE
      `,
      [person_id]
    );

    const parents: { father?: Person; mother?: Person } = {};
    for (const row of result.rows) {
      if (row.subtype === 'father' || row.gender === 'male') {
        parents.father = row;
      } else if (row.subtype === 'mother' || row.gender === 'female') {
        parents.mother = row;
      }
    }

    return parents;
  }

  async getChildren(person_id: string): Promise<Person[]> {
    const result = await query<Person>(
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

    return result.rows;
  }

  async getSpouses(person_id: string): Promise<Person[]> {
    const result = await query<Person>(
      `
        SELECT DISTINCT p.*
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
        ORDER BY p.name
      `,
      [person_id]
    );

    return result.rows;
  }

  async personExists(person_id: string): Promise<boolean> {
    const result = await query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM persons WHERE id = $1) AS exists',
      [person_id]
    );

    return result.rows[0]?.exists ?? false;
  }

  private async insertVersion(
    client: { query: (sql: string, values?: unknown[]) => Promise<unknown> },
    person: Person,
    version: number,
    changed_by: string,
    change_reason: string
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO person_versions (
          id, person_id, version, name, gender, birth_date, death_date, bio,
          valid_from, valid_to, changed_by, change_reason
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, $10, $11)
      `,
      [
        randomUUID(),
        person.id,
        version,
        person.name,
        person.gender,
        person.birth_date,
        person.death_date,
        person.bio,
        person.updated_at,
        changed_by,
        change_reason,
      ]
    );
  }
}

export const personService = new PersonService();
