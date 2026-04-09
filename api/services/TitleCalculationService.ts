import { query } from '../config/database';
import { Gender, Person, Side, TitleResult } from '../types';
import { NotFoundError } from '../utils/errors';
import { sideCalculationService } from './SideCalculationService';
import { matchTitleWithFallback, getReverseTitle } from './titleRules';

export class TitleCalculationService {
  async calculateTitle(
    from_person_id: string,
    to_person_id: string,
    as_of?: string
  ): Promise<TitleResult> {
    if (from_person_id === to_person_id) {
      return {
        title: '本人',
        reverse_title: '本人',
        relationship_path: [],
        side: 'self',
        distance: 0,
        temporal_context: { as_of, relationship_status: as_of ? 'historical' : 'current' },
      };
    }

    const [fromPerson, toPerson] = await Promise.all([
      this.getPersonOrThrow(from_person_id),
      this.getPersonOrThrow(to_person_id),
    ]);

    const path = await sideCalculationService.getRelationshipPath(from_person_id, to_person_id);
    const relationSteps = path.slice(1).map((item) => item.relation);
    const pathStr = relationSteps.join('>');
    const side = await sideCalculationService.determineSide(from_person_id, to_person_id);

    const elder = this.isElder(toPerson, fromPerson);
    const title = matchTitleWithFallback(pathStr, toPerson.gender, side, elder, fromPerson.gender);

    return {
      title,
      reverse_title: getReverseTitle(title, fromPerson.gender),
      relationship_path: relationSteps,
      side,
      distance: relationSteps.length,
      temporal_context: { as_of, relationship_status: as_of ? 'historical' : 'current' },
    };
  }

  async batchCalculateTitles(
    from_person_id: string,
    to_person_ids: string[],
    as_of?: string
  ): Promise<Map<string, TitleResult>> {
    const results = new Map<string, TitleResult>();
    for (const to_person_id of to_person_ids) {
      const title = await this.calculateTitle(from_person_id, to_person_id, as_of);
      results.set(to_person_id, title);
    }
    return results;
  }

  getReverseTitle(originalTitle: string, from_gender: Gender): string {
    return getReverseTitle(originalTitle, from_gender);
  }

  private isElder(target: Person, reference: Person): boolean | null {
    if (!target.birth_date || !reference.birth_date) return null;
    return target.birth_date.getTime() < reference.birth_date.getTime();
  }

  private async getPersonOrThrow(person_id: string): Promise<Person> {
    const result = await query<Person>('SELECT * FROM persons WHERE id = $1', [person_id]);
    if (result.rows.length === 0) {
      throw new NotFoundError('人员', person_id);
    }
    return result.rows[0];
  }
}

export const titleCalculationService = new TitleCalculationService();
