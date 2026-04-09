import { randomUUID } from 'crypto';
import { query, withTransaction } from '../config/database';
import { CreatePersonInput, UpdatePersonInput } from '../types/schemas';
import { Person, PersonVersion, Relationship } from '../types';
import { ConflictError, NotFoundError } from '../utils/errors';

export type AddRelativeType = 'father' | 'mother' | 'child' | 'spouse' | 'sibling';

export interface AddRelativeInput {
  relation_type: AddRelativeType;
  person: {
    name: string;
    gender?: 'male' | 'female' | 'unknown';
    birth_date?: string;
    death_date?: string;
    bio?: string;
  };
}

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
            photo_url, birth_order, native_place,
            created_at, updated_at, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
          input.photo_url ?? null,
          input.birth_order ?? null,
          input.native_place ?? null,
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
            photo_url = COALESCE($6, photo_url),
            birth_order = COALESCE($7, birth_order),
            native_place = COALESCE($8, native_place),
            updated_at = $9
          WHERE id = $10
          RETURNING *
        `,
        [
          input.name ?? null,
          input.gender ?? null,
          input.birth_date ? new Date(input.birth_date) : null,
          input.death_date ? new Date(input.death_date) : null,
          input.bio ?? null,
          input.photo_url !== undefined ? input.photo_url : null,
          input.birth_order !== undefined ? input.birth_order : null,
          input.native_place !== undefined ? input.native_place : null,
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

      // 级联删除：先删除所有关联的关系及其版本记录
      const relationships = await client.query<{ id: string }>(
        `
          SELECT id
          FROM relationships
          WHERE from_person_id = $1 OR to_person_id = $1
        `,
        [person_id]
      );

      for (const rel of relationships.rows) {
        await client.query('DELETE FROM relationship_versions WHERE relationship_id = $1', [rel.id]);
      }

      await client.query(
        'DELETE FROM relationships WHERE from_person_id = $1 OR to_person_id = $1',
        [person_id]
      );

      // 删除人员的生命事件
      await client.query('DELETE FROM life_events WHERE person_id = $1', [person_id]);

      // 删除人员版本记录和人员本身
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

  /**
   * 原子操作：添加亲属。
   * 在一个事务中创建新人员并建立所有必要的关系。
   * 对于 sibling 类型，会自动为新人创建与所有共享父母的 parent_child 关系。
   */
  async addRelative(
    existingPersonId: string,
    input: AddRelativeInput,
    created_by: string
  ): Promise<{ person: Person; relationships: Relationship[] }> {
    return withTransaction(async (client) => {
      // 验证现有人员
      const existingResult = await client.query<Person>(
        'SELECT * FROM persons WHERE id = $1',
        [existingPersonId]
      );
      if (existingResult.rows.length === 0) {
        throw new NotFoundError('人员', existingPersonId);
      }
      const existingPerson = existingResult.rows[0];

      // 创建新人员
      const now = new Date();
      const newPersonId = randomUUID();
      const gender = input.person.gender ?? (
        input.relation_type === 'father' ? 'male' :
        input.relation_type === 'mother' ? 'female' :
        'unknown'
      );

      const newPersonResult = await client.query<Person>(
        `INSERT INTO persons (id, family_id, name, gender, birth_date, death_date, bio, created_at, updated_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          newPersonId,
          existingPerson.family_id,
          input.person.name,
          gender,
          input.person.birth_date ? new Date(input.person.birth_date) : null,
          input.person.death_date ? new Date(input.person.death_date) : null,
          input.person.bio ?? null,
          now, now, created_by,
        ]
      );
      const newPerson = newPersonResult.rows[0];

      // 插入人员版本
      await this.insertVersion(client, newPerson, 1, created_by, 'initial_create');

      // 创建关系
      const createdRelationships: Relationship[] = [];

      const createRel = async (
        fromId: string,
        toId: string,
        type: string,
        subtype: string | null
      ) => {
        const relId = randomUUID();
        const relResult = await client.query<Relationship>(
          `INSERT INTO relationships (id, from_person_id, to_person_id, type, subtype, is_active, created_at, updated_at, created_by)
           VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7, $8)
           RETURNING *`,
          [relId, fromId, toId, type, subtype, now, now, created_by]
        );
        createdRelationships.push(relResult.rows[0]);
        // 版本记录
        await client.query(
          `INSERT INTO relationship_versions (id, relationship_id, version, from_person_id, to_person_id, type, subtype, start_date, end_date, is_active, valid_from, valid_to, changed_by)
           VALUES ($1, $2, 1, $3, $4, $5, $6, NULL, NULL, TRUE, $7, NULL, $8)`,
          [randomUUID(), relId, fromId, toId, type, subtype, now, created_by]
        );
      };

      switch (input.relation_type) {
        case 'father': {
          // 新人是 existingPerson 的父亲
          // 验证：existingPerson 最多一个父亲
          await this.validateParentLimit(client, existingPersonId, 'male');
          await createRel(newPersonId, existingPersonId, 'parent_child', 'father');

          // 如果已有母亲，自动建立配偶关系
          const existingMother = await client.query<{ from_person_id: string }>(
            `SELECT r.from_person_id FROM relationships r
             JOIN persons p ON p.id = r.from_person_id
             WHERE r.to_person_id = $1 AND r.type = 'parent_child' AND r.is_active = TRUE
               AND p.gender = 'female'`,
            [existingPersonId]
          );
          if (existingMother.rows.length === 1) {
            await createRel(newPersonId, existingMother.rows[0].from_person_id, 'spouse', null);
          }
          break;
        }

        case 'mother': {
          await this.validateParentLimit(client, existingPersonId, 'female');
          await createRel(newPersonId, existingPersonId, 'parent_child', 'mother');

          // 如果已有父亲，自动建立配偶关系
          const existingFather = await client.query<{ from_person_id: string }>(
            `SELECT r.from_person_id FROM relationships r
             JOIN persons p ON p.id = r.from_person_id
             WHERE r.to_person_id = $1 AND r.type = 'parent_child' AND r.is_active = TRUE
               AND p.gender = 'male'`,
            [existingPersonId]
          );
          if (existingFather.rows.length === 1) {
            await createRel(existingFather.rows[0].from_person_id, newPersonId, 'spouse', null);
          }
          break;
        }

        case 'child': {
          // existingPerson 是新人的父/母
          const childSubtype = existingPerson.gender === 'male' ? 'father'
            : existingPerson.gender === 'female' ? 'mother' : null;
          await createRel(existingPersonId, newPersonId, 'parent_child', childSubtype);

          // 仅当有唯一配偶时，自动关联为另一位父/母（多配偶时跳过，避免歧义）
          const spouseRels = await client.query<{ from_person_id: string; to_person_id: string }>(
            `SELECT from_person_id, to_person_id FROM relationships
             WHERE type = 'spouse' AND is_active = TRUE
               AND (from_person_id = $1 OR to_person_id = $1)`,
            [existingPersonId]
          );
          if (spouseRels.rows.length === 1) {
            const sr = spouseRels.rows[0];
            const spouseId = sr.from_person_id === existingPersonId ? sr.to_person_id : sr.from_person_id;
            const spouseResult = await client.query<{ gender: string }>(
              'SELECT gender FROM persons WHERE id = $1', [spouseId]
            );
            const spouseGender = spouseResult.rows[0]?.gender;
            const spouseSubtype = spouseGender === 'male' ? 'father'
              : spouseGender === 'female' ? 'mother' : null;
            await createRel(spouseId, newPersonId, 'parent_child', spouseSubtype);
          }
          break;
        }

        case 'spouse': {
          await createRel(existingPersonId, newPersonId, 'spouse', null);

          // 自动将新配偶关联为已有子女的父/母（仅限尚无该性别父/母的子女）
          const spouseChildRels = await client.query<{ to_person_id: string }>(
            `SELECT to_person_id FROM relationships
             WHERE from_person_id = $1 AND type = 'parent_child' AND is_active = TRUE`,
            [existingPersonId]
          );
          if (spouseChildRels.rows.length > 0) {
            const newSpouseSubtype = gender === 'male' ? 'father'
              : gender === 'female' ? 'mother' : null;
            for (const childRel of spouseChildRels.rows) {
              // 检查该子女是否已有同性别的父/母
              if (gender === 'male' || gender === 'female') {
                const existingParent = await client.query<{ count: string }>(
                  `SELECT COUNT(*)::text AS count FROM relationships r
                   JOIN persons p ON p.id = r.from_person_id
                   WHERE r.to_person_id = $1 AND r.type = 'parent_child' AND r.is_active = TRUE
                     AND p.gender = $2`,
                  [childRel.to_person_id, gender]
                );
                if (parseInt(existingParent.rows[0].count, 10) > 0) {
                  continue; // 已有同性别父/母，跳过
                }
              }
              await createRel(newPersonId, childRel.to_person_id, 'parent_child', newSpouseSubtype);
            }
          }
          break;
        }

        case 'sibling': {
          // 核心：自动关联共享父母
          const parentRels = await client.query<{ from_person_id: string; subtype: string | null }>(
            `SELECT from_person_id, subtype FROM relationships
             WHERE to_person_id = $1 AND type = 'parent_child' AND is_active = TRUE`,
            [existingPersonId]
          );

          if (parentRels.rows.length === 0) {
            // 没有父母信息，无法通过共享父母推导兄弟关系
            throw new ConflictError(
              '无法添加兄弟姐妹：该人员没有父母信息。请先添加父母，再添加兄弟姐妹。'
            );
          }

          // 为新人创建与所有共享父母的 parent_child 关系
          for (const parentRel of parentRels.rows) {
            await createRel(parentRel.from_person_id, newPersonId, 'parent_child', parentRel.subtype);
          }
          break;
        }
      }

      return { person: newPerson, relationships: createdRelationships };
    });
  }

  async linkExistingRelative(
    existingPersonId: string,
    targetPersonId: string,
    relationType: string,
    created_by: string
  ): Promise<{ relationships: Relationship[] }> {
    return withTransaction(async (client) => {
      // 验证两个人都存在
      const existingResult = await client.query<Person>(
        'SELECT * FROM persons WHERE id = $1', [existingPersonId]
      );
      if (existingResult.rows.length === 0) throw new NotFoundError('人员', existingPersonId);
      const existingPerson = existingResult.rows[0];

      const targetResult = await client.query<Person>(
        'SELECT * FROM persons WHERE id = $1', [targetPersonId]
      );
      if (targetResult.rows.length === 0) throw new NotFoundError('人员', targetPersonId);
      const targetPerson = targetResult.rows[0];

      const now = new Date();
      const createdRelationships: Relationship[] = [];

      const createRel = async (fromId: string, toId: string, type: string, subtype: string | null) => {
        // 检查是否已存在
        const existing = await client.query(
          `SELECT id FROM relationships WHERE from_person_id = $1 AND to_person_id = $2 AND type = $3 AND is_active = TRUE`,
          [fromId, toId, type]
        );
        if (existing.rows.length > 0) return; // 已存在，跳过
        const relId = randomUUID();
        const relResult = await client.query<Relationship>(
          `INSERT INTO relationships (id, from_person_id, to_person_id, type, subtype, is_active, created_at, updated_at, created_by)
           VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7, $8) RETURNING *`,
          [relId, fromId, toId, type, subtype, now, now, created_by]
        );
        createdRelationships.push(relResult.rows[0]);
      };

      switch (relationType) {
        case 'father':
          await this.validateParentLimit(client, existingPersonId, 'male');
          await createRel(targetPersonId, existingPersonId, 'parent_child', 'father');
          break;
        case 'mother':
          await this.validateParentLimit(client, existingPersonId, 'female');
          await createRel(targetPersonId, existingPersonId, 'parent_child', 'mother');
          break;
        case 'child': {
          const childSubtype = existingPerson.gender === 'male' ? 'father'
            : existingPerson.gender === 'female' ? 'mother' : null;
          await createRel(existingPersonId, targetPersonId, 'parent_child', childSubtype);
          break;
        }
        case 'spouse':
          await createRel(existingPersonId, targetPersonId, 'spouse', null);
          break;
        case 'sibling': {
          const parentRels = await client.query<{ from_person_id: string; subtype: string | null }>(
            `SELECT from_person_id, subtype FROM relationships
             WHERE to_person_id = $1 AND type = 'parent_child' AND is_active = TRUE`,
            [existingPersonId]
          );
          for (const parentRel of parentRels.rows) {
            await createRel(parentRel.from_person_id, targetPersonId, 'parent_child', parentRel.subtype);
          }
          break;
        }
      }

      return { relationships: createdRelationships };
    });
  }

  private async validateParentLimit(
    client: { query: (sql: string, values?: unknown[]) => Promise<{ rows: { count: string }[] }> },
    childId: string,
    parentGender: 'male' | 'female'
  ): Promise<void> {
    const result = await client.query(
      `SELECT COUNT(*)::text AS count
       FROM relationships r
       JOIN persons p ON p.id = r.from_person_id
       WHERE r.to_person_id = $1
         AND r.type = 'parent_child'
         AND r.is_active = TRUE
         AND p.gender = $2`,
      [childId, parentGender]
    );
    if (parseInt(result.rows[0].count, 10) > 0) {
      throw new ConflictError(
        `该人员已有${parentGender === 'male' ? '父亲' : '母亲'}，不能重复添加`
      );
    }
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
          photo_url, birth_order, native_place,
          valid_from, valid_to, changed_by, change_reason
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NULL, $13, $14)
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
        person.photo_url ?? null,
        person.birth_order ?? null,
        person.native_place ?? null,
        person.updated_at,
        changed_by,
        change_reason,
      ]
    );
  }
}

export const personService = new PersonService();
