import { query } from '../config/database';
import { Gender, Side, UUID } from '../types';

// ── 双系图谱专用类型 ──

export interface PersonNode {
  id: UUID;
  name: string;
  gender: Gender;
  birth_date: string | null;
  death_date: string | null;
  title: string;
  side: Side;
}

export interface DescendantNode {
  person: PersonNode;
  spouse: PersonNode | null;
  children: DescendantNode[];
}

export interface CollateralFamily {
  person: PersonNode;
  spouse: PersonNode | null;
  children: DescendantNode[];
}

export interface SpouseFamily {
  person: PersonNode;
  ancestors: AncestorLayer[];     // 配偶的祖先链（从配偶父亲向上追溯，配偶母亲为spouse）
  siblings: CollateralFamily[];
}

export interface AncestorLayer {
  ancestor: PersonNode;
  spouse: PersonNode | null;
  siblings: CollateralFamily[];
  spouseParents: PersonNode[];
  spouseSiblings: CollateralFamily[];
  generation: number;
}

export interface DualTreeResponse {
  reference: PersonNode;
  paternal: AncestorLayer[];
  maternal: AncestorLayer[];
  siblings: CollateralFamily[];
  children: DescendantNode[];
  spouses: SpouseFamily[];
}

// ── 内部辅助类型 ──

interface PersonRow {
  id: string;
  name: string;
  gender: Gender;
  birth_date: Date | null;
  death_date: Date | null;
}

interface RelRow {
  from_person_id: string;
  to_person_id: string;
  type: string;
  subtype: string | null;
}

/**
 * 双系图谱构建服务。
 *
 * 设计要点：
 *  1. 一次性加载整个家族的 persons + relationships 到内存
 *  2. 在内存中用邻接表遍历，彻底避免 N+1 查询
 *  3. 以参考人为中心，分别沿父方 / 母方向上追溯
 */
export class DualTreeService {
  async buildDualTree(
    familyId: string,
    referencePersonId: string,
    maxDepth = 20
  ): Promise<DualTreeResponse> {
    // ── 1. 批量加载 ──
    const [personsResult, relsResult] = await Promise.all([
      query<PersonRow>(
        'SELECT id, name, gender, birth_date, death_date FROM persons WHERE family_id = $1',
        [familyId]
      ),
      query<RelRow>(
        `SELECT r.from_person_id, r.to_person_id, r.type, r.subtype
         FROM relationships r
         JOIN persons p ON p.id = r.from_person_id
         WHERE p.family_id = $1 AND r.is_active = TRUE`,
        [familyId]
      ),
    ]);

    const personMap = new Map<string, PersonRow>();
    for (const p of personsResult.rows) {
      personMap.set(p.id, p);
    }

    // ── 2. 构建邻接表 ──
    const parentsMap = new Map<string, PersonRow[]>();
    const childrenMap = new Map<string, PersonRow[]>();
    const spouseMap = new Map<string, PersonRow[]>();

    for (const r of relsResult.rows) {
      if (r.type === 'parent_child') {
        const parentPerson = personMap.get(r.from_person_id);
        const childPerson = personMap.get(r.to_person_id);
        if (parentPerson && childPerson) {
          pushTo(parentsMap, r.to_person_id, parentPerson);
          pushTo(childrenMap, r.from_person_id, childPerson);
        }
      } else if (r.type === 'spouse') {
        const a = personMap.get(r.from_person_id);
        const b = personMap.get(r.to_person_id);
        if (a && b) {
          pushTo(spouseMap, r.from_person_id, b);
          pushTo(spouseMap, r.to_person_id, a);
        }
      }
    }

    const ref = personMap.get(referencePersonId);
    if (!ref) {
      throw new Error('参考人不存在');
    }

    // ── 3. 找父方 / 母方 ──
    const refParents = parentsMap.get(referencePersonId) ?? [];
    let father = refParents.find((p) => p.gender === 'male') ?? null;
    let mother = refParents.find((p) => p.gender === 'female') ?? null;

    // 如果只找到一个父母，通过配偶关系推导另一个
    // （处理只建了一方 parent_child 关系的情况）
    if (father && !mother) {
      const fatherSpouses = spouseMap.get(father.id) ?? [];
      mother = fatherSpouses.find((s) => s.gender === 'female') ?? null;
    }
    if (mother && !father) {
      const motherSpouses = spouseMap.get(mother.id) ?? [];
      father = motherSpouses.find((s) => s.gender === 'male') ?? null;
    }

    // ── 4. 递归构建祖先链 ──
    const paternalChain = father
      ? this.buildAncestorChain(father, 1, maxDepth, parentsMap, childrenMap, spouseMap, personMap, 'paternal', ref)
      : [];
    const maternalChain = mother
      ? this.buildAncestorChain(mother, 1, maxDepth, parentsMap, childrenMap, spouseMap, personMap, 'maternal', ref)
      : [];

    // ── 5. 参考人的兄弟姐妹（共享父母推导）→ CollateralFamily[] ──
    const siblingSet = new Set<string>();
    for (const parent of refParents) {
      const parentChildren = childrenMap.get(parent.id) ?? [];
      for (const child of parentChildren) {
        if (child.id !== referencePersonId) {
          siblingSet.add(child.id);
        }
      }
    }
    const siblingsResult: CollateralFamily[] = [];
    for (const sibId of siblingSet) {
      const sib = personMap.get(sibId);
      if (sib) {
        siblingsResult.push(this.buildCollateralFamily(sib, ref, 0, 'paternal', spouseMap, childrenMap, personMap));
      }
    }

    // ── 6. 参考人的子女（递归后代树） ──
    const refChildren = childrenMap.get(referencePersonId) ?? [];
    const visited = new Set<string>([referencePersonId]);
    const childrenResult: DescendantNode[] = refChildren.map((c) =>
      this.buildDescendantTree(c, ref, 1, 'paternal', 10, spouseMap, childrenMap, personMap, visited)
    );

    // ── 7. 参考人的配偶 → SpouseFamily[] ──
    const refSpouses = spouseMap.get(referencePersonId) ?? [];
    const spousesResult: SpouseFamily[] = refSpouses.map((s) =>
      this.buildSpouseFamily(s, ref, parentsMap, childrenMap, spouseMap, personMap)
    );

    return {
      reference: toNode(ref, '本人', 'paternal'),
      paternal: paternalChain,
      maternal: maternalChain,
      siblings: siblingsResult,
      children: childrenResult,
      spouses: spousesResult,
    };
  }

  // ── 递归构建后代树 ──

  private buildDescendantTree(
    person: PersonRow,
    ref: PersonRow,
    generation: number,
    side: Side,
    maxDescendantDepth: number,
    spouseMap: Map<string, PersonRow[]>,
    childrenMap: Map<string, PersonRow[]>,
    personMap: Map<string, PersonRow>,
    visited: Set<string>,
  ): DescendantNode {
    visited.add(person.id);

    const spouses = spouseMap.get(person.id) ?? [];
    const mainSpouse = spouses.length > 0 ? spouses[0] : null;

    const title = this.getDescendantTitle(person, generation);
    const spouseTitle = mainSpouse ? this.getDescendantSpouseTitle(mainSpouse, generation) : '';

    let childDescendants: DescendantNode[] = [];
    if (generation < maxDescendantDepth) {
      const kids = childrenMap.get(person.id) ?? [];
      childDescendants = kids
        .filter((k) => !visited.has(k.id))
        .map((k) =>
          this.buildDescendantTree(k, ref, generation + 1, side, maxDescendantDepth, spouseMap, childrenMap, personMap, visited)
        );
    }

    return {
      person: toNode(person, title, side),
      spouse: mainSpouse ? toNode(mainSpouse, spouseTitle, 'affinity') : null,
      children: childDescendants,
    };
  }

  // ── 递归构建旁系后代树 ──

  private buildCollateralDescendantTree(
    person: PersonRow,
    generation: number,
    side: Side,
    maxDepth: number,
    spouseMap: Map<string, PersonRow[]>,
    childrenMap: Map<string, PersonRow[]>,
    personMap: Map<string, PersonRow>,
    visited: Set<string>,
    title: string,
  ): DescendantNode {
    visited.add(person.id);

    const spouses = spouseMap.get(person.id) ?? [];
    const mainSpouse = spouses.length > 0 ? spouses[0] : null;

    let childDescendants: DescendantNode[] = [];
    if (generation < maxDepth) {
      const kids = childrenMap.get(person.id) ?? [];
      childDescendants = kids
        .filter((k) => !visited.has(k.id))
        .map((k) => {
          const childTitle = k.gender === 'male' ? '子' : k.gender === 'female' ? '女' : '子女';
          return this.buildCollateralDescendantTree(k, generation + 1, side, maxDepth, spouseMap, childrenMap, personMap, visited, childTitle);
        });
    }

    return {
      person: toNode(person, title, side),
      spouse: mainSpouse ? toNode(mainSpouse, '配偶', side) : null,
      children: childDescendants,
    };
  }

  // ── 构建旁系亲属家庭 ──

  private buildCollateralFamily(
    sib: PersonRow,
    ref: PersonRow,
    ancestorGeneration: number,
    side: 'paternal' | 'maternal',
    spouseMap: Map<string, PersonRow[]>,
    childrenMap: Map<string, PersonRow[]>,
    _personMap: Map<string, PersonRow>,
  ): CollateralFamily {
    const title = ancestorGeneration === 0
      ? this.getSiblingTitle(sib, ref)
      : this.getAncestorSiblingTitle(sib, ancestorGeneration, side);

    const sibSpouses = spouseMap.get(sib.id) ?? [];
    const sibSpouse = sibSpouses.length > 0 ? sibSpouses[0] : null;

    const sibChildren = childrenMap.get(sib.id) ?? [];
    const visited = new Set<string>([sib.id]);
    const childDescendants: DescendantNode[] = sibChildren
      .filter((c) => !visited.has(c.id))
      .map((c) => {
        const childTitle = this.getCollateralChildTitle(c, ancestorGeneration, side);
        return this.buildCollateralDescendantTree(c, 1, side, 10, spouseMap, childrenMap, _personMap, visited, childTitle);
      });

    return {
      person: toNode(sib, title, side),
      spouse: sibSpouse
        ? toNode(sibSpouse, this.getSiblingSpouseTitle(sibSpouse, sib, ancestorGeneration, side), side)
        : null,
      children: childDescendants,
    };
  }

  // ── 构建配偶家族 ──

  private buildSpouseFamily(
    spouse: PersonRow,
    ref: PersonRow,
    parentsMap: Map<string, PersonRow[]>,
    childrenMap: Map<string, PersonRow[]>,
    spouseMap: Map<string, PersonRow[]>,
    personMap: Map<string, PersonRow>,
  ): SpouseFamily {
    const spouseTitle = spouse.gender === 'male' ? '丈夫' : '妻子';

    // 配偶的父母 → 构建完整祖先链
    const spouseParents = parentsMap.get(spouse.id) ?? [];
    const spouseFather = spouseParents.find((p) => p.gender === 'male') ?? spouseParents[0] ?? null;

    const ancestorChain = spouseFather
      ? this.buildAncestorChain(spouseFather, 1, 20, parentsMap, childrenMap, spouseMap, personMap, 'paternal', ref, true)
      : [];

    // 配偶的兄弟姐妹（通过配偶的父母推导）
    const spouseSiblingSet = new Set<string>();
    for (const parent of spouseParents) {
      const parentChildren = childrenMap.get(parent.id) ?? [];
      for (const child of parentChildren) {
        if (child.id !== spouse.id) {
          spouseSiblingSet.add(child.id);
        }
      }
    }
    const siblingFamilies: CollateralFamily[] = [];
    for (const sibId of spouseSiblingSet) {
      const sib = personMap.get(sibId);
      if (sib) {
        const sibTitle = this.getInLawSiblingTitle(sib, ref);
        const sibSpouses = spouseMap.get(sib.id) ?? [];
        const sibSpouse = sibSpouses.length > 0 ? sibSpouses[0] : null;
        const sibChildren = childrenMap.get(sib.id) ?? [];
        const sibVisited = new Set<string>([sib.id]);
        const sibChildDescendants: DescendantNode[] = sibChildren
          .filter((c) => !sibVisited.has(c.id))
          .map((c) => this.buildCollateralDescendantTree(c, 1, 'affinity', 10, spouseMap, childrenMap, personMap, sibVisited, '子女'));
        siblingFamilies.push({
          person: toNode(sib, sibTitle, 'affinity'),
          spouse: sibSpouse ? toNode(sibSpouse, '配偶', 'affinity') : null,
          children: sibChildDescendants,
        });
      }
    }

    return {
      person: toNode(spouse, spouseTitle, 'affinity'),
      ancestors: ancestorChain,
      siblings: siblingFamilies,
    };
  }

  // ── 递归构建某一侧的祖先链 ──

  private buildAncestorChain(
    person: PersonRow,
    generation: number,
    maxDepth: number,
    parentsMap: Map<string, PersonRow[]>,
    childrenMap: Map<string, PersonRow[]>,
    spouseMap: Map<string, PersonRow[]>,
    personMap: Map<string, PersonRow>,
    side: 'paternal' | 'maternal',
    ref: PersonRow,
    forSpouse = false,
  ): AncestorLayer[] {
    const result: AncestorLayer[] = [];

    let current: PersonRow | null = person;
    let gen = generation;

    while (current && gen <= maxDepth) {
      // 配偶
      const spouses = spouseMap.get(current.id) ?? [];
      const mainSpouse = spouses.length > 0 ? spouses[0] : null;

      // 兄弟姐妹 → CollateralFamily[]
      const currentParents = parentsMap.get(current.id) ?? [];
      const siblingSet = new Set<string>();
      for (const p of currentParents) {
        const pChildren = childrenMap.get(p.id) ?? [];
        for (const c of pChildren) {
          if (c.id !== current.id) {
            siblingSet.add(c.id);
          }
        }
      }
      const siblings: CollateralFamily[] = [];
      for (const sibId of siblingSet) {
        const sib = personMap.get(sibId);
        if (sib) {
          siblings.push(this.buildCollateralFamily(sib, ref, gen, side, spouseMap, childrenMap, personMap));
        }
      }

      // 配偶的父母和兄弟姐妹
      let spouseParentNodes: PersonNode[] = [];
      let spouseSiblingFamilies: CollateralFamily[] = [];
      if (mainSpouse) {
        const spParents = parentsMap.get(mainSpouse.id) ?? [];
        spouseParentNodes = spParents.map((p) =>
          toNode(p, this.getAncestorSpouseParentTitle(p, gen, side), side)
        );

        const spSibSet = new Set<string>();
        for (const p of spParents) {
          const pChildren = childrenMap.get(p.id) ?? [];
          for (const c of pChildren) {
            if (c.id !== mainSpouse.id) {
              spSibSet.add(c.id);
            }
          }
        }
        for (const sibId of spSibSet) {
          const sib = personMap.get(sibId);
          if (sib) {
            spouseSiblingFamilies.push(
              this.buildCollateralFamily(sib, ref, gen, side, spouseMap, childrenMap, personMap)
            );
          }
        }
      }

      const nodeSide: Side = forSpouse ? 'affinity' : side;
      const title = forSpouse
        ? this.getSpouseAncestorTitle(current, gen, side, ref)
        : this.getAncestorTitle(current, gen, side);
      const spouseTitle = mainSpouse
        ? (forSpouse
            ? this.getSpouseAncestorSpouseTitle(mainSpouse, gen, side, ref)
            : this.getAncestorSpouseTitle(mainSpouse, gen, side))
        : '';
      result.push({
        ancestor: toNode(current, title, nodeSide),
        spouse: mainSpouse ? toNode(mainSpouse, spouseTitle, nodeSide) : null,
        siblings,
        spouseParents: spouseParentNodes,
        spouseSiblings: spouseSiblingFamilies,
        generation: gen,
      });

      // 继续向上追溯
      const nextParents: PersonRow[] = parentsMap.get(current.id) ?? [];
      const nextAncestor: PersonRow | null =
        side === 'paternal'
          ? nextParents.find((p: PersonRow) => p.gender === 'male') ?? nextParents[0] ?? null
          : nextParents.find((p: PersonRow) => p.gender === 'female') ?? nextParents[0] ?? null;

      current = nextAncestor ?? null;
      gen++;
    }

    return result;
  }

  // ── 称谓辅助方法 ──

  private getAncestorTitle(person: PersonRow, generation: number, side: 'paternal' | 'maternal'): string {
    if (side === 'paternal') {
      switch (generation) {
        case 1: return person.gender === 'male' ? '父亲' : '母亲';
        case 2: return person.gender === 'male' ? '爷爷' : '奶奶';
        case 3: return person.gender === 'male' ? '曾祖父' : '曾祖母';
        case 4: return person.gender === 'male' ? '高祖父' : '高祖母';
        default: return `${generation}世祖`;
      }
    } else {
      switch (generation) {
        case 1: return person.gender === 'male' ? '父亲' : '母亲';
        case 2: return person.gender === 'male' ? '外公' : '外婆';
        case 3: return person.gender === 'male' ? '外曾祖父' : '外曾祖母';
        case 4: return person.gender === 'male' ? '外高祖父' : '外高祖母';
        default: return `外${generation}世祖`;
      }
    }
  }

  private getAncestorSpouseTitle(person: PersonRow, generation: number, side: 'paternal' | 'maternal'): string {
    if (side === 'paternal') {
      switch (generation) {
        case 1: return person.gender === 'female' ? '母亲' : '父亲';
        case 2: return person.gender === 'female' ? '奶奶' : '爷爷';
        case 3: return person.gender === 'female' ? '曾祖母' : '曾祖父';
        default: return `${generation}世祖配偶`;
      }
    } else {
      switch (generation) {
        case 1: return person.gender === 'female' ? '母亲' : '父亲';
        case 2: return person.gender === 'female' ? '外婆' : '外公';
        case 3: return person.gender === 'female' ? '外曾祖母' : '外曾祖父';
        default: return `外${generation}世祖配偶`;
      }
    }
  }

  private getAncestorSpouseParentTitle(parent: PersonRow, generation: number, side: 'paternal' | 'maternal'): string {
    // 例：gen=2 paternal，配偶=奶奶，奶奶的父亲=奶奶的爹
    if (generation === 1) {
      // 父亲的妻子(母亲)的父母 → 外公/外婆 (这个分支不太会触发，因为gen=1的配偶就是母亲本人)
      return parent.gender === 'male' ? '外公' : '外婆';
    }
    if (generation === 2) {
      if (side === 'paternal') {
        // 爷爷的妻子(奶奶)的父母
        return parent.gender === 'male' ? '奶奶的父亲' : '奶奶的母亲';
      } else {
        // 外婆的丈夫(外公)的父母
        return parent.gender === 'male' ? '外公的父亲' : '外公的母亲';
      }
    }
    return '配偶方长辈';
  }

  private getAncestorSiblingTitle(person: PersonRow, ancestorGeneration: number, side: 'paternal' | 'maternal'): string {
    if (ancestorGeneration === 1) {
      if (side === 'paternal') {
        return person.gender === 'male' ? '叔伯' : '姑姑';
      } else {
        return person.gender === 'male' ? '舅舅' : '姨妈';
      }
    }
    if (ancestorGeneration === 2) {
      if (side === 'paternal') {
        return person.gender === 'male' ? '叔公/伯公' : '姑婆';
      } else {
        return person.gender === 'male' ? '舅公' : '姨婆';
      }
    }
    return '远亲长辈';
  }

  private getSiblingTitle(sibling: PersonRow, reference: PersonRow): string {
    const sibBirth = sibling.birth_date?.getTime() ?? 0;
    const refBirth = reference.birth_date?.getTime() ?? 0;
    const isElder = sibBirth < refBirth;

    if (sibling.gender === 'male') {
      return isElder ? '哥哥' : '弟弟';
    } else if (sibling.gender === 'female') {
      return isElder ? '姐姐' : '妹妹';
    }
    return '兄弟姐妹';
  }

  // ── 新增称谓方法 ──

  private getSpouseAncestorTitle(person: PersonRow, gen: number, _side: 'paternal' | 'maternal', ref: PersonRow): string {
    if (ref.gender === 'male') {
      // 妻子的祖先
      switch (gen) {
        case 1: return person.gender === 'male' ? '岳父' : '岳母';
        case 2: return person.gender === 'male' ? '岳祖父' : '岳祖母';
        case 3: return person.gender === 'male' ? '岳曾祖父' : '岳曾祖母';
        default: return `岳${gen}世祖`;
      }
    } else {
      // 丈夫的祖先
      switch (gen) {
        case 1: return person.gender === 'male' ? '公公' : '婆婆';
        case 2: return person.gender === 'male' ? '太公' : '太婆';
        case 3: return person.gender === 'male' ? '太太公' : '太太婆';
        default: return `夫方${gen}世祖`;
      }
    }
  }

  private getSpouseAncestorSpouseTitle(spouse: PersonRow, gen: number, _side: 'paternal' | 'maternal', ref: PersonRow): string {
    if (ref.gender === 'male') {
      switch (gen) {
        case 1: return spouse.gender === 'female' ? '岳母' : '岳父';
        case 2: return spouse.gender === 'female' ? '岳祖母' : '岳祖父';
        default: return `岳${gen}世祖配偶`;
      }
    } else {
      switch (gen) {
        case 1: return spouse.gender === 'female' ? '婆婆' : '公公';
        case 2: return spouse.gender === 'female' ? '太婆' : '太公';
        default: return `夫方${gen}世祖配偶`;
      }
    }
  }



  private getInLawSiblingTitle(sib: PersonRow, ref: PersonRow): string {
    if (ref.gender === 'male') {
      return sib.gender === 'male' ? '小舅子' : '小姨子';
    } else {
      return sib.gender === 'male' ? '小叔子' : '小姑子';
    }
  }

  private getSiblingSpouseTitle(sp: PersonRow, sib: PersonRow, ancestorGeneration: number, side: 'paternal' | 'maternal'): string {
    if (ancestorGeneration === 0) {
      // 参考人兄弟的配偶
      if (sib.gender === 'male') {
        return sp.gender === 'female' ? '嫂子/弟妹' : '配偶';
      } else {
        return sp.gender === 'male' ? '姐夫/妹夫' : '配偶';
      }
    }
    if (ancestorGeneration === 1) {
      if (side === 'paternal') {
        return sp.gender === 'female' ? '婶婶/伯母' : '姑父';
      } else {
        return sp.gender === 'female' ? '舅妈' : '姨父';
      }
    }
    return '配偶';
  }

  private getDescendantTitle(person: PersonRow, generation: number): string {
    switch (generation) {
      case 1: return person.gender === 'male' ? '儿子' : person.gender === 'female' ? '女儿' : '子女';
      case 2: return person.gender === 'male' ? '孙子' : person.gender === 'female' ? '孙女' : '孙辈';
      case 3: return person.gender === 'male' ? '曾孙' : person.gender === 'female' ? '曾孙女' : '曾孙辈';
      case 4: return person.gender === 'male' ? '玄孙' : person.gender === 'female' ? '玄孙女' : '玄孙辈';
      default: return `${generation}世孙`;
    }
  }

  private getDescendantSpouseTitle(spouse: PersonRow, generation: number): string {
    switch (generation) {
      case 1: return spouse.gender === 'female' ? '儿媳' : '女婿';
      case 2: return spouse.gender === 'female' ? '孙媳' : '孙女婿';
      default: return '配偶';
    }
  }

  private getCollateralChildTitle(child: PersonRow, ancestorGeneration: number, side: 'paternal' | 'maternal'): string {
    if (ancestorGeneration === 0) {
      // 参考人兄弟的子女
      return child.gender === 'male' ? '侄子' : '侄女';
    }
    if (ancestorGeneration === 1) {
      if (side === 'paternal') {
        return child.gender === 'male' ? '堂兄弟' : '堂姐妹';
      } else {
        return child.gender === 'male' ? '表兄弟' : '表姐妹';
      }
    }
    return '远亲';
  }
}

// ── 工具函数 ──

function toNode(person: PersonRow, title: string, side: Side): PersonNode {
  return {
    id: person.id,
    name: person.name,
    gender: person.gender,
    birth_date: person.birth_date ? person.birth_date.toISOString().split('T')[0] : null,
    death_date: person.death_date ? person.death_date.toISOString().split('T')[0] : null,
    title,
    side,
  };
}

function pushTo<T>(map: Map<string, T[]>, key: string, value: T): void {
  const list = map.get(key);
  if (list) {
    list.push(value);
  } else {
    map.set(key, [value]);
  }
}

export const dualTreeService = new DualTreeService();
