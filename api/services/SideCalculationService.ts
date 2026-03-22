import { query } from '../config/database';
import { CommonAncestorResult, Relationship, RelationshipPathNode, Side } from '../types';

type AncestorRow = {
  ancestor_id: string;
  ancestor_name: string;
  generation: number;
  first_parent_gender: string | null;
  path: string[];
};

export class SideCalculationService {
  async determineSide(reference_person_id: string, target_person_id: string): Promise<Side> {
    if (reference_person_id === target_person_id) {
      return 'self';
    }

    const directSpouse = await query<{ is_spouse: boolean }>(
      `
        SELECT EXISTS(
          SELECT 1
          FROM relationships
          WHERE type = 'spouse'
            AND is_active = TRUE
            AND (
              (from_person_id = $1 AND to_person_id = $2)
              OR (from_person_id = $2 AND to_person_id = $1)
            )
        ) AS is_spouse
      `,
      [reference_person_id, target_person_id]
    );

    if (directSpouse.rows[0]?.is_spouse) {
      return 'affinity';
    }

    const ancestor = await this.findCommonAncestor(reference_person_id, target_person_id);
    if (!ancestor) {
      return 'unknown';
    }

    const referenceAncestors = await this.getAncestorRows(reference_person_id);
    const matched = referenceAncestors.find((row) => row.ancestor_id === ancestor.ancestor_id);
    if (matched?.first_parent_gender === 'male') {
      return 'paternal';
    }

    if (matched?.first_parent_gender === 'female') {
      return 'maternal';
    }

    return 'unknown';
  }

  async findCommonAncestor(
    person1_id: string,
    person2_id: string
  ): Promise<CommonAncestorResult | null> {
    const ancestors1 = await this.getAncestorRows(person1_id);
    const ancestors2 = await this.getAncestorRows(person2_id);
    const map2 = new Map(ancestors2.map((row) => [row.ancestor_id, row]));

    let best: CommonAncestorResult | null = null;
    for (const row1 of ancestors1) {
      const row2 = map2.get(row1.ancestor_id);
      if (!row2) {
        continue;
      }

      const candidate: CommonAncestorResult = {
        ancestor_id: row1.ancestor_id,
        ancestor_name: row1.ancestor_name,
        person1_generation: row1.generation,
        person2_generation: row2.generation,
        person1_path: row1.path,
        person2_path: row2.path,
      };

      if (
        !best ||
        candidate.person1_generation + candidate.person2_generation <
          best.person1_generation + best.person2_generation
      ) {
        best = candidate;
      }
    }

    return best;
  }

  async getRelationshipPath(
    from_person_id: string,
    to_person_id: string
  ): Promise<RelationshipPathNode[]> {
    if (from_person_id === to_person_id) {
      return [{ person_id: from_person_id, relation: 'self' }];
    }

    const relationships = await query<Relationship>(
      `
        SELECT *
        FROM relationships
        WHERE is_active = TRUE
      `
    );

    const adjacency = new Map<string, RelationshipPathNode[]>();
    for (const relationship of relationships.rows) {
      const entries: Array<[string, RelationshipPathNode]> = [
        [
          relationship.from_person_id,
          {
            person_id: relationship.to_person_id,
            relation:
              relationship.type === 'parent_child'
                ? 'child'
                : relationship.type === 'spouse'
                  ? 'spouse'
                  : 'sibling',
          },
        ],
        [
          relationship.to_person_id,
          {
            person_id: relationship.from_person_id,
            relation:
              relationship.type === 'parent_child'
                ? 'parent'
                : relationship.type === 'spouse'
                  ? 'spouse'
                  : 'sibling',
          },
        ],
      ];

      for (const [source, edge] of entries) {
        const current = adjacency.get(source) ?? [];
        current.push(edge);
        adjacency.set(source, current);
      }
    }

    const queue: Array<{ person_id: string; path: RelationshipPathNode[] }> = [
      { person_id: from_person_id, path: [{ person_id: from_person_id, relation: 'self' }] },
    ];
    const visited = new Set<string>([from_person_id]);

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        break;
      }

      const edges = adjacency.get(current.person_id) ?? [];
      for (const edge of edges) {
        if (visited.has(edge.person_id)) {
          continue;
        }

        const nextPath = [...current.path, edge];
        if (edge.person_id === to_person_id) {
          return nextPath;
        }

        visited.add(edge.person_id);
        queue.push({ person_id: edge.person_id, path: nextPath });
      }
    }

    return [];
  }

  async batchDetermineSide(
    reference_person_id: string,
    target_person_ids: string[]
  ): Promise<Map<string, Side>> {
    const results = new Map<string, Side>();
    for (const target_person_id of target_person_ids) {
      const side = await this.determineSide(reference_person_id, target_person_id);
      results.set(target_person_id, side);
    }
    return results;
  }

  private async getAncestorRows(person_id: string): Promise<AncestorRow[]> {
    const result = await query<AncestorRow>(
      `
        WITH RECURSIVE ancestors AS (
          SELECT
            p.id AS ancestor_id,
            p.name AS ancestor_name,
            0 AS generation,
            ARRAY[p.id::text] AS path,
            NULL::text AS first_parent_gender
          FROM persons p
          WHERE p.id = $1

          UNION ALL

          SELECT
            parent.id AS ancestor_id,
            parent.name AS ancestor_name,
            a.generation + 1 AS generation,
            a.path || parent.id::text AS path,
            COALESCE(a.first_parent_gender, parent.gender::text) AS first_parent_gender
          FROM ancestors a
          JOIN relationships r ON r.to_person_id = a.ancestor_id
          JOIN persons parent ON parent.id = r.from_person_id
          WHERE r.type = 'parent_child'
            AND r.is_active = TRUE
            AND a.generation < 10
        )
        SELECT *
        FROM ancestors
      `,
      [person_id]
    );

    return result.rows;
  }
}

export const sideCalculationService = new SideCalculationService();
