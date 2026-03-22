import { query } from '../config/database';
import { Gender, Person, Side, TitleResult } from '../types';
import { NotFoundError } from '../utils/errors';
import { sideCalculationService } from './SideCalculationService';

// ── 称谓规则表 ──

interface TitleRule {
  /** 关系路径模式，如 'parent>parent'。'*' 匹配任意一步。 */
  path: string;
  /** 目标人性别（null = 不限） */
  targetGender: Gender | null;
  /** 系别（null = 不限） */
  side: 'paternal' | 'maternal' | null;
  /** 是否年长（null = 不限，true = 年长，false = 年幼） */
  elder: boolean | null;
  /** 参考人性别（null = 不限） */
  refGender: Gender | null;
  /** 称谓 */
  title: string;
}

/**
 * 规则按从具体到模糊的顺序排列。
 * 匹配时取第一个命中的规则。
 */
const TITLE_RULES: TitleRule[] = [
  // ==================== 直系长辈 ====================
  { path: 'parent', targetGender: 'male', side: null, elder: null, refGender: null, title: '父亲' },
  { path: 'parent', targetGender: 'female', side: null, elder: null, refGender: null, title: '母亲' },

  // 祖父母（父系）
  { path: 'parent>parent', targetGender: 'male', side: 'paternal', elder: null, refGender: null, title: '爷爷' },
  { path: 'parent>parent', targetGender: 'female', side: 'paternal', elder: null, refGender: null, title: '奶奶' },
  // 外祖父母（母系）
  { path: 'parent>parent', targetGender: 'male', side: 'maternal', elder: null, refGender: null, title: '外公' },
  { path: 'parent>parent', targetGender: 'female', side: 'maternal', elder: null, refGender: null, title: '外婆' },

  // 曾祖
  { path: 'parent>parent>parent', targetGender: 'male', side: 'paternal', elder: null, refGender: null, title: '曾祖父' },
  { path: 'parent>parent>parent', targetGender: 'female', side: 'paternal', elder: null, refGender: null, title: '曾祖母' },
  { path: 'parent>parent>parent', targetGender: 'male', side: 'maternal', elder: null, refGender: null, title: '外曾祖父' },
  { path: 'parent>parent>parent', targetGender: 'female', side: 'maternal', elder: null, refGender: null, title: '外曾祖母' },

  // 高祖
  { path: 'parent>parent>parent>parent', targetGender: 'male', side: 'paternal', elder: null, refGender: null, title: '高祖父' },
  { path: 'parent>parent>parent>parent', targetGender: 'female', side: 'paternal', elder: null, refGender: null, title: '高祖母' },
  { path: 'parent>parent>parent>parent', targetGender: 'male', side: 'maternal', elder: null, refGender: null, title: '外高祖父' },
  { path: 'parent>parent>parent>parent', targetGender: 'female', side: 'maternal', elder: null, refGender: null, title: '外高祖母' },

  // ==================== 直系晚辈 ====================
  { path: 'child', targetGender: 'male', side: null, elder: null, refGender: null, title: '儿子' },
  { path: 'child', targetGender: 'female', side: null, elder: null, refGender: null, title: '女儿' },
  { path: 'child>child', targetGender: 'male', side: null, elder: null, refGender: null, title: '孙子' },
  { path: 'child>child', targetGender: 'female', side: null, elder: null, refGender: null, title: '孙女' },
  { path: 'child>child>child', targetGender: 'male', side: null, elder: null, refGender: null, title: '曾孙' },
  { path: 'child>child>child', targetGender: 'female', side: null, elder: null, refGender: null, title: '曾孙女' },
  { path: 'child>child>child>child', targetGender: 'male', side: null, elder: null, refGender: null, title: '玄孙' },
  { path: 'child>child>child>child', targetGender: 'female', side: null, elder: null, refGender: null, title: '玄孙女' },

  // ==================== 同辈（兄弟姐妹） ====================
  { path: 'sibling', targetGender: 'male', side: null, elder: true, refGender: null, title: '哥哥' },
  { path: 'sibling', targetGender: 'male', side: null, elder: false, refGender: null, title: '弟弟' },
  { path: 'sibling', targetGender: 'female', side: null, elder: true, refGender: null, title: '姐姐' },
  { path: 'sibling', targetGender: 'female', side: null, elder: false, refGender: null, title: '妹妹' },
  // 不区分长幼的兜底
  { path: 'sibling', targetGender: 'male', side: null, elder: null, refGender: null, title: '兄弟' },
  { path: 'sibling', targetGender: 'female', side: null, elder: null, refGender: null, title: '姐妹' },

  // ==================== 父系旁系长辈 ====================
  { path: 'parent>sibling', targetGender: 'male', side: 'paternal', elder: true, refGender: null, title: '伯父' },
  { path: 'parent>sibling', targetGender: 'male', side: 'paternal', elder: false, refGender: null, title: '叔叔' },
  { path: 'parent>sibling', targetGender: 'male', side: 'paternal', elder: null, refGender: null, title: '叔伯' },
  { path: 'parent>sibling', targetGender: 'female', side: 'paternal', elder: null, refGender: null, title: '姑姑' },

  // 父系旁系长辈的配偶
  { path: 'parent>sibling>spouse', targetGender: 'female', side: 'paternal', elder: null, refGender: null, title: '伯母/婶婶' },
  { path: 'parent>sibling>spouse', targetGender: 'male', side: 'paternal', elder: null, refGender: null, title: '姑父' },

  // ==================== 母系旁系长辈 ====================
  { path: 'parent>sibling', targetGender: 'male', side: 'maternal', elder: null, refGender: null, title: '舅舅' },
  { path: 'parent>sibling', targetGender: 'female', side: 'maternal', elder: null, refGender: null, title: '姨妈' },

  // 母系旁系长辈的配偶
  { path: 'parent>sibling>spouse', targetGender: 'female', side: 'maternal', elder: null, refGender: null, title: '舅母' },
  { path: 'parent>sibling>spouse', targetGender: 'male', side: 'maternal', elder: null, refGender: null, title: '姨父' },

  // 不区分系别的兜底
  { path: 'parent>sibling', targetGender: 'male', side: null, elder: null, refGender: null, title: '叔伯/舅舅' },
  { path: 'parent>sibling', targetGender: 'female', side: null, elder: null, refGender: null, title: '姑姑/姨妈' },

  // ==================== 堂亲 / 表亲 ====================
  { path: 'parent>sibling>child', targetGender: 'male', side: 'paternal', elder: true, refGender: null, title: '堂兄' },
  { path: 'parent>sibling>child', targetGender: 'male', side: 'paternal', elder: false, refGender: null, title: '堂弟' },
  { path: 'parent>sibling>child', targetGender: 'male', side: 'paternal', elder: null, refGender: null, title: '堂兄弟' },
  { path: 'parent>sibling>child', targetGender: 'female', side: 'paternal', elder: true, refGender: null, title: '堂姐' },
  { path: 'parent>sibling>child', targetGender: 'female', side: 'paternal', elder: false, refGender: null, title: '堂妹' },
  { path: 'parent>sibling>child', targetGender: 'female', side: 'paternal', elder: null, refGender: null, title: '堂姐妹' },

  { path: 'parent>sibling>child', targetGender: 'male', side: 'maternal', elder: true, refGender: null, title: '表兄' },
  { path: 'parent>sibling>child', targetGender: 'male', side: 'maternal', elder: false, refGender: null, title: '表弟' },
  { path: 'parent>sibling>child', targetGender: 'male', side: 'maternal', elder: null, refGender: null, title: '表兄弟' },
  { path: 'parent>sibling>child', targetGender: 'female', side: 'maternal', elder: true, refGender: null, title: '表姐' },
  { path: 'parent>sibling>child', targetGender: 'female', side: 'maternal', elder: false, refGender: null, title: '表妹' },
  { path: 'parent>sibling>child', targetGender: 'female', side: 'maternal', elder: null, refGender: null, title: '表姐妹' },

  // ==================== 侄辈 ====================
  // 男性参考人的兄弟姐妹的子女 → 侄子/侄女
  { path: 'sibling>child', targetGender: 'male', side: null, elder: null, refGender: 'male', title: '侄子' },
  { path: 'sibling>child', targetGender: 'female', side: null, elder: null, refGender: 'male', title: '侄女' },
  // 女性参考人的兄弟姐妹的子女 → 外甥/外甥女
  { path: 'sibling>child', targetGender: 'male', side: null, elder: null, refGender: 'female', title: '外甥' },
  { path: 'sibling>child', targetGender: 'female', side: null, elder: null, refGender: 'female', title: '外甥女' },
  // 兜底
  { path: 'sibling>child', targetGender: 'male', side: null, elder: null, refGender: null, title: '侄子/外甥' },
  { path: 'sibling>child', targetGender: 'female', side: null, elder: null, refGender: null, title: '侄女/外甥女' },

  // ==================== 配偶 ====================
  { path: 'spouse', targetGender: 'male', side: null, elder: null, refGender: null, title: '丈夫' },
  { path: 'spouse', targetGender: 'female', side: null, elder: null, refGender: null, title: '妻子' },

  // ==================== 配偶的父母 ====================
  { path: 'spouse>parent', targetGender: 'male', side: null, elder: null, refGender: 'male', title: '岳父' },
  { path: 'spouse>parent', targetGender: 'female', side: null, elder: null, refGender: 'male', title: '岳母' },
  { path: 'spouse>parent', targetGender: 'male', side: null, elder: null, refGender: 'female', title: '公公' },
  { path: 'spouse>parent', targetGender: 'female', side: null, elder: null, refGender: 'female', title: '婆婆' },
  { path: 'spouse>parent', targetGender: 'male', side: null, elder: null, refGender: null, title: '公公/岳父' },
  { path: 'spouse>parent', targetGender: 'female', side: null, elder: null, refGender: null, title: '婆婆/岳母' },

  // ==================== 子女的配偶 ====================
  { path: 'child>spouse', targetGender: 'male', side: null, elder: null, refGender: null, title: '女婿' },
  { path: 'child>spouse', targetGender: 'female', side: null, elder: null, refGender: null, title: '儿媳' },

  // ==================== 兄弟姐妹的配偶 ====================
  { path: 'sibling>spouse', targetGender: 'male', side: null, elder: true, refGender: null, title: '姐夫' },
  { path: 'sibling>spouse', targetGender: 'male', side: null, elder: false, refGender: null, title: '妹夫' },
  { path: 'sibling>spouse', targetGender: 'male', side: null, elder: null, refGender: null, title: '姐夫/妹夫' },
  { path: 'sibling>spouse', targetGender: 'female', side: null, elder: true, refGender: null, title: '嫂子' },
  { path: 'sibling>spouse', targetGender: 'female', side: null, elder: false, refGender: null, title: '弟媳' },
  { path: 'sibling>spouse', targetGender: 'female', side: null, elder: null, refGender: null, title: '嫂子/弟媳' },

  // ==================== 配偶的兄弟姐妹 ====================
  { path: 'spouse>sibling', targetGender: 'male', side: null, elder: true, refGender: 'female', title: '大伯子' },
  { path: 'spouse>sibling', targetGender: 'male', side: null, elder: false, refGender: 'female', title: '小叔子' },
  { path: 'spouse>sibling', targetGender: 'female', side: null, elder: true, refGender: 'female', title: '大姑子' },
  { path: 'spouse>sibling', targetGender: 'female', side: null, elder: false, refGender: 'female', title: '小姑子' },
  { path: 'spouse>sibling', targetGender: 'male', side: null, elder: true, refGender: 'male', title: '大舅子' },
  { path: 'spouse>sibling', targetGender: 'male', side: null, elder: false, refGender: 'male', title: '小舅子' },
  { path: 'spouse>sibling', targetGender: 'female', side: null, elder: true, refGender: 'male', title: '大姨子' },
  { path: 'spouse>sibling', targetGender: 'female', side: null, elder: false, refGender: 'male', title: '小姨子' },

  // ==================== 妯娌 / 连襟 ====================
  { path: 'spouse>sibling>spouse', targetGender: 'female', side: null, elder: null, refGender: 'female', title: '妯娌' },
  { path: 'spouse>sibling>spouse', targetGender: 'male', side: null, elder: null, refGender: 'male', title: '连襟' },

  // ==================== 隔代旁系 ====================
  { path: 'parent>parent>sibling', targetGender: 'male', side: 'paternal', elder: null, refGender: null, title: '叔公/伯公' },
  { path: 'parent>parent>sibling', targetGender: 'female', side: 'paternal', elder: null, refGender: null, title: '姑婆' },
  { path: 'parent>parent>sibling', targetGender: 'male', side: 'maternal', elder: null, refGender: null, title: '舅公' },
  { path: 'parent>parent>sibling', targetGender: 'female', side: 'maternal', elder: null, refGender: null, title: '姨婆' },

  // ==================== 堂亲的配偶 ====================
  { path: 'parent>sibling>child>spouse', targetGender: 'female', side: 'paternal', elder: null, refGender: null, title: '堂嫂/堂弟媳' },
  { path: 'parent>sibling>child>spouse', targetGender: 'male', side: 'paternal', elder: null, refGender: null, title: '堂姐夫/堂妹夫' },
  { path: 'parent>sibling>child>spouse', targetGender: 'female', side: 'maternal', elder: null, refGender: null, title: '表嫂/表弟媳' },
  { path: 'parent>sibling>child>spouse', targetGender: 'male', side: 'maternal', elder: null, refGender: null, title: '表姐夫/表妹夫' },

  // ==================== 侄辈的子女 ====================
  { path: 'sibling>child>child', targetGender: 'male', side: null, elder: null, refGender: null, title: '侄孙/外甥孙' },
  { path: 'sibling>child>child', targetGender: 'female', side: null, elder: null, refGender: null, title: '侄孙女/外甥孙女' },

  // ==================== 堂叔 / 表叔 ====================
  { path: 'parent>parent>sibling>child', targetGender: 'male', side: 'paternal', elder: null, refGender: null, title: '堂叔/堂伯' },
  { path: 'parent>parent>sibling>child', targetGender: 'female', side: 'paternal', elder: null, refGender: null, title: '堂姑' },
  { path: 'parent>parent>sibling>child', targetGender: 'male', side: 'maternal', elder: null, refGender: null, title: '表叔/表舅' },
  { path: 'parent>parent>sibling>child', targetGender: 'female', side: 'maternal', elder: null, refGender: null, title: '表姑/表姨' },
];

// ── 反向称谓映射 ──

const REVERSE_MAP: Record<string, { male: string; female: string }> = {
  本人: { male: '本人', female: '本人' },
  父亲: { male: '儿子', female: '女儿' },
  母亲: { male: '儿子', female: '女儿' },
  儿子: { male: '父亲', female: '母亲' },
  女儿: { male: '父亲', female: '母亲' },
  爷爷: { male: '孙子', female: '孙女' },
  奶奶: { male: '孙子', female: '孙女' },
  外公: { male: '外孙', female: '外孙女' },
  外婆: { male: '外孙', female: '外孙女' },
  曾祖父: { male: '曾孙', female: '曾孙女' },
  曾祖母: { male: '曾孙', female: '曾孙女' },
  外曾祖父: { male: '外曾孙', female: '外曾孙女' },
  外曾祖母: { male: '外曾孙', female: '外曾孙女' },
  高祖父: { male: '玄孙', female: '玄孙女' },
  高祖母: { male: '玄孙', female: '玄孙女' },
  孙子: { male: '爷爷', female: '奶奶' },
  孙女: { male: '爷爷', female: '奶奶' },
  曾孙: { male: '曾祖父', female: '曾祖母' },
  曾孙女: { male: '曾祖父', female: '曾祖母' },
  玄孙: { male: '高祖父', female: '高祖母' },
  玄孙女: { male: '高祖父', female: '高祖母' },
  哥哥: { male: '弟弟', female: '妹妹' },
  弟弟: { male: '哥哥', female: '姐姐' },
  姐姐: { male: '弟弟', female: '妹妹' },
  妹妹: { male: '哥哥', female: '姐姐' },
  兄弟: { male: '兄弟', female: '姐妹' },
  姐妹: { male: '兄弟', female: '姐妹' },
  伯父: { male: '侄子', female: '侄女' },
  叔叔: { male: '侄子', female: '侄女' },
  叔伯: { male: '侄子', female: '侄女' },
  姑姑: { male: '侄子', female: '侄女' },
  舅舅: { male: '外甥', female: '外甥女' },
  姨妈: { male: '外甥', female: '外甥女' },
  侄子: { male: '叔伯', female: '姑姑' },
  侄女: { male: '叔伯', female: '姑姑' },
  外甥: { male: '舅舅', female: '姨妈' },
  外甥女: { male: '舅舅', female: '姨妈' },
  堂兄: { male: '堂弟', female: '堂妹' },
  堂弟: { male: '堂兄', female: '堂姐' },
  堂姐: { male: '堂弟', female: '堂妹' },
  堂妹: { male: '堂兄', female: '堂姐' },
  堂兄弟: { male: '堂兄弟', female: '堂姐妹' },
  堂姐妹: { male: '堂兄弟', female: '堂姐妹' },
  表兄: { male: '表弟', female: '表妹' },
  表弟: { male: '表兄', female: '表姐' },
  表姐: { male: '表弟', female: '表妹' },
  表妹: { male: '表兄', female: '表姐' },
  表兄弟: { male: '表兄弟', female: '表姐妹' },
  表姐妹: { male: '表兄弟', female: '表姐妹' },
  丈夫: { male: '妻子', female: '丈夫' },
  妻子: { male: '妻子', female: '丈夫' },
  公公: { male: '女婿', female: '儿媳' },
  婆婆: { male: '女婿', female: '儿媳' },
  岳父: { male: '女婿', female: '儿媳' },
  岳母: { male: '女婿', female: '儿媳' },
  女婿: { male: '岳父', female: '岳母' },
  儿媳: { male: '公公', female: '婆婆' },
  嫂子: { male: '小叔子', female: '小姑子' },
  弟媳: { male: '大伯子', female: '大姑子' },
  姐夫: { male: '小舅子', female: '小姨子' },
  妹夫: { male: '大舅子', female: '大姨子' },
  亲属: { male: '亲属', female: '亲属' },
  姻亲: { male: '姻亲', female: '姻亲' },
};

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

    // 判断目标人是否年长
    const elder = this.isElder(toPerson, fromPerson);

    // 匹配称谓规则
    const title = this.matchTitle(pathStr, toPerson.gender, side, elder, fromPerson.gender);

    return {
      title,
      reverse_title: this.getReverseTitle(title, fromPerson.gender),
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

  // ── 规则匹配 ──

  private matchTitle(
    pathStr: string,
    targetGender: Gender,
    side: Side,
    elder: boolean | null,
    refGender: Gender
  ): string {
    const matchingSide = side === 'paternal' || side === 'maternal' ? side : null;

    for (const rule of TITLE_RULES) {
      if (rule.path !== pathStr) continue;
      if (rule.targetGender !== null && rule.targetGender !== targetGender) continue;
      if (rule.side !== null && rule.side !== matchingSide) continue;
      if (rule.elder !== null && rule.elder !== elder) continue;
      if (rule.refGender !== null && rule.refGender !== refGender) continue;
      return rule.title;
    }

    // 路径包含 spouse → 笼统的"姻亲"
    if (pathStr.includes('spouse')) {
      return '姻亲';
    }

    return '亲属';
  }

  // ── 反向称谓 ──

  getReverseTitle(originalTitle: string, from_gender: Gender): string {
    // 处理含斜杠的复合称谓，取第一个尝试匹配
    const primary = originalTitle.split('/')[0];
    const reverse = REVERSE_MAP[primary] ?? REVERSE_MAP[originalTitle];
    if (!reverse) return '亲属';
    return from_gender === 'female' ? reverse.female : reverse.male;
  }

  // ── 年龄比较 ──

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
