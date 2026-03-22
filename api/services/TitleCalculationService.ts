import { query } from '../config/database';
import { Person, TitleResult } from '../types';
import { NotFoundError } from '../utils/errors';
import { sideCalculationService } from './SideCalculationService';
import { relationshipService } from './RelationshipService';

export class TitleCalculationService {
  async calculateTitle(
    from_person_id: string,
    to_person_id: string,
    as_of?: string
  ): Promise<TitleResult> {
    const [fromPerson, toPerson] = await Promise.all([
      this.getPersonOrThrow(from_person_id),
      this.getPersonOrThrow(to_person_id),
    ]);

    const directRelationship = await relationshipService.getRelationshipBetween(
      from_person_id,
      to_person_id
    );
    const path = await sideCalculationService.getRelationshipPath(from_person_id, to_person_id);
    const relationSteps = path.slice(1).map((item) => item.relation);
    const side = await sideCalculationService.determineSide(from_person_id, to_person_id);

    let title = '亲属';
    if (from_person_id === to_person_id) {
      title = '本人';
    } else if (directRelationship?.type === 'spouse') {
      title = toPerson.gender === 'female' ? '妻子' : '丈夫';
    } else if (directRelationship?.type === 'sibling') {
      title = toPerson.gender === 'female' ? '姐妹' : '兄弟';
    } else if (directRelationship?.type === 'parent_child') {
      title = this.getDirectParentChildTitle(
        directRelationship.from_person_id,
        directRelationship.to_person_id,
        from_person_id,
        toPerson.gender
      );
    } else if (relationSteps.join('>') === 'parent>parent') {
      title = toPerson.gender === 'female' ? '祖母' : '祖父';
    } else if (relationSteps.join('>') === 'child>child') {
      title = toPerson.gender === 'female' ? '孙女' : '孙子';
    } else if (relationSteps.includes('spouse')) {
      title = '姻亲';
    }

    return {
      title,
      reverse_title: this.getReverseTitle(title, fromPerson.gender),
      relationship_path: relationSteps,
      side,
      distance: relationSteps.length,
      temporal_context: {
        as_of,
        relationship_status: as_of ? 'historical' : 'current',
      },
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

  getReverseTitle(originalTitle: string, from_gender: 'male' | 'female' | 'unknown'): string {
    const reverseMap: Record<string, { male: string; female: string }> = {
      本人: { male: '本人', female: '本人' },
      父亲: { male: '儿子', female: '女儿' },
      母亲: { male: '儿子', female: '女儿' },
      儿子: { male: '父亲', female: '母亲' },
      女儿: { male: '父亲', female: '母亲' },
      祖父: { male: '孙子', female: '孙女' },
      祖母: { male: '孙子', female: '孙女' },
      孙子: { male: '祖父', female: '祖母' },
      孙女: { male: '祖父', female: '祖母' },
      兄弟: { male: '兄弟', female: '姐妹' },
      姐妹: { male: '兄弟', female: '姐妹' },
      丈夫: { male: '妻子', female: '丈夫' },
      妻子: { male: '妻子', female: '丈夫' },
      姻亲: { male: '姻亲', female: '姻亲' },
      亲属: { male: '亲属', female: '亲属' },
    };

    const reverse = reverseMap[originalTitle];
    const normalizedGender = from_gender === 'female' ? 'female' : 'male';
    return reverse ? reverse[normalizedGender] : '亲属';
  }

  private getDirectParentChildTitle(
    relationship_from_person_id: string,
    relationship_to_person_id: string,
    from_person_id: string,
    target_gender: Person['gender']
  ): string {
    if (relationship_from_person_id === from_person_id) {
      return target_gender === 'female' ? '女儿' : '儿子';
    }

    if (relationship_to_person_id === from_person_id) {
      return target_gender === 'female' ? '母亲' : '父亲';
    }

    return '亲属';
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
