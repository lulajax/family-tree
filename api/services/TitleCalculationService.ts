import { query } from '../config/database';
import { Gender, Person, RelationshipExplanation, TitleResult } from '../types';
import { NotFoundError } from '../utils/errors';
import { sideCalculationService } from './SideCalculationService';
import { matchTitleWithFallback, getReverseTitle } from './titleRules';

export class TitleCalculationService {
  async calculateRelationshipExplanation(
    reference_person_id: string,
    target_person_id: string,
    as_of?: string
  ): Promise<RelationshipExplanation> {
    const titleResult = await this.calculateTitle(reference_person_id, target_person_id, as_of);
    const commonAncestor = await sideCalculationService.findCommonAncestor(reference_person_id, target_person_id);
    const humanReadablePath = titleResult.relationship_path.map(toHumanReadableRelation);
    const confidence = getTitleConfidence(titleResult.title);

    return {
      reference_person_id,
      target_person_id,
      title: titleResult.title,
      reverse_title: titleResult.reverse_title,
      side: titleResult.side,
      distance: titleResult.distance,
      relationship_path: titleResult.relationship_path,
      human_readable_path: humanReadablePath,
      summary: buildRelationshipSummary(titleResult.title, humanReadablePath),
      confidence,
      common_ancestor: commonAncestor
        ? {
            ancestor_id: commonAncestor.ancestor_id,
            ancestor_name: commonAncestor.ancestor_name,
            person1_generation: commonAncestor.person1_generation,
            person2_generation: commonAncestor.person2_generation,
          }
        : null,
    };
  }

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

    // 侄辈称谓取决于兄弟姐妹（中间人）的性别，而非参考人性别
    // 兄弟的子女 = 侄子/侄女，姐妹的子女 = 外甥/外甥女
    let refGender = fromPerson.gender;
    if (pathStr === 'sibling>child' && path.length >= 3) {
      const siblingPerson = await this.getPersonOrThrow(path[1].person_id);
      refGender = siblingPerson.gender;
    }

    const title = matchTitleWithFallback(pathStr, toPerson.gender, side, elder, refGender);

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

const RELATION_LABELS: Record<string, string> = {
  self: '本人',
  parent: '父母',
  child: '子女',
  spouse: '配偶',
  sibling: '兄弟姐妹',
};

function toHumanReadableRelation(relation: string): string {
  return RELATION_LABELS[relation] ?? relation;
}

function getTitleConfidence(title: string): RelationshipExplanation['confidence'] {
  if (title === '未知关系') {
    return 'unknown';
  }
  return title.includes('亲属') ? 'fallback' : 'exact';
}

function buildRelationshipSummary(title: string, humanReadablePath: string[]): string {
  if (humanReadablePath.length === 0) {
    return '这是你本人。';
  }
  return `你应该称呼 TA 为「${title}」。关系路径：你 → ${humanReadablePath.join(' → ')} → TA。`;
}

export const titleCalculationService = new TitleCalculationService();
