import { query } from '../config/database';
import {
  SearchAdvancedOptions,
  SearchOptions,
  SearchResult,
  SearchSuggestion,
} from '../types';

export class SearchService {
  async search(options: SearchOptions): Promise<{ results: SearchResult[]; total: number }> {
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;

    const personParams: Array<string | number> = [`%${options.q}%`];
    const personClauses = ['(p.name ILIKE $1 OR COALESCE(p.bio, \'\') ILIKE $1)'];
    if (options.family_id) {
      personParams.push(options.family_id);
      personClauses.push(`p.family_id = $${personParams.length}`);
    }

    const totalResult = await query<{ total: string }>(
      `
        SELECT COUNT(*)::text AS total
        FROM persons p
        WHERE ${personClauses.join(' AND ')}
      `,
      personParams
    );

    personParams.push(limit, offset);
    const personResults = await query<{
      id: string;
      name: string;
      bio: string | null;
    }>(
      `
        SELECT p.id, p.name, p.bio
        FROM persons p
        WHERE ${personClauses.join(' AND ')}
        ORDER BY p.name
        LIMIT $${personParams.length - 1}
        OFFSET $${personParams.length}
      `,
      personParams
    );

    return {
      results: personResults.rows.map((row) => ({
        id: row.id,
        type: 'person',
        name: row.name,
        highlight: {
          name: row.name,
          ...(row.bio ? { bio: row.bio.slice(0, 120) } : {}),
        },
        score: 1,
      })),
      total: parseInt(totalResult.rows[0].total, 10),
    };
  }

  async getSuggestions(
    q: string,
    family_id?: string,
    limit = 10
  ): Promise<SearchSuggestion[]> {
    const params: Array<string | number> = [`${q}%`];
    const clauses = ['name ILIKE $1'];

    if (family_id) {
      params.push(family_id);
      clauses.push(`family_id = $${params.length}`);
    }

    params.push(limit);
    const result = await query<{ name: string }>(
      `
        SELECT DISTINCT name
        FROM persons
        WHERE ${clauses.join(' AND ')}
        ORDER BY name
        LIMIT $${params.length}
      `,
      params
    );

    return result.rows.map((row) => ({
      value: row.name,
      type: 'person',
    }));
  }

  async advancedSearch(
    options: SearchAdvancedOptions
  ): Promise<{ results: SearchResult[]; total: number }> {
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;
    const clauses: string[] = [];
    const params: Array<string | number | boolean> = [];

    if (options.name) {
      params.push(`%${options.name}%`);
      clauses.push(`name ILIKE $${params.length}`);
    }

    if (options.gender) {
      params.push(options.gender);
      clauses.push(`gender = $${params.length}`);
    }

    if (options.familyId) {
      params.push(options.familyId);
      clauses.push(`family_id = $${params.length}`);
    }

    if (options.birthYearFrom) {
      params.push(options.birthYearFrom);
      clauses.push(`EXTRACT(YEAR FROM birth_date) >= $${params.length}`);
    }

    if (options.birthYearTo) {
      params.push(options.birthYearTo);
      clauses.push(`EXTRACT(YEAR FROM birth_date) <= $${params.length}`);
    }

    if (options.hasChildren !== undefined) {
      clauses.push(
        options.hasChildren
          ? `EXISTS (
              SELECT 1
              FROM relationships r
              WHERE r.from_person_id = persons.id
                AND r.type = 'parent_child'
                AND r.is_active = TRUE
            )`
          : `NOT EXISTS (
              SELECT 1
              FROM relationships r
              WHERE r.from_person_id = persons.id
                AND r.type = 'parent_child'
                AND r.is_active = TRUE
            )`
      );
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const totalResult = await query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM persons ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await query<{ id: string; name: string; birth_date: Date | null }>(
      `
        SELECT id, name, birth_date
        FROM persons
        ${whereClause}
        ORDER BY name
        LIMIT $${params.length - 1}
        OFFSET $${params.length}
      `,
      params
    );

    return {
      results: result.rows.map((row) => ({
        id: row.id,
        type: 'person',
        name: row.name,
        highlight: {
          name: row.name,
          birth_date: row.birth_date ? row.birth_date.toISOString().split('T')[0] : '',
        },
        score: 1,
      })),
      total: parseInt(totalResult.rows[0].total, 10),
    };
  }

  async rebuildIndex(): Promise<void> {
    return;
  }
}

export const searchService = new SearchService();
