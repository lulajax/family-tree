import { query } from '../config/database';
import { RelationshipType } from '../types';

export class CycleDetectionService {
  async wouldCreateCycle(
    from_person_id: string,
    to_person_id: string,
    type: RelationshipType
  ): Promise<boolean> {
    if (type !== 'parent_child') {
      return false;
    }

    if (from_person_id === to_person_id) {
      return true;
    }

    const result = await query<{ has_cycle: boolean }>(
      `
        WITH RECURSIVE descendants AS (
          SELECT to_person_id AS person_id
          FROM relationships
          WHERE from_person_id = $1
            AND type = 'parent_child'
            AND is_active = TRUE

          UNION

          SELECT r.to_person_id
          FROM relationships r
          JOIN descendants d ON d.person_id = r.from_person_id
          WHERE r.type = 'parent_child'
            AND r.is_active = TRUE
        )
        SELECT EXISTS(
          SELECT 1
          FROM descendants
          WHERE person_id = $2
        ) AS has_cycle
      `,
      [to_person_id, from_person_id]
    );

    return result.rows[0]?.has_cycle ?? false;
  }
}

export const cycleDetectionService = new CycleDetectionService();
