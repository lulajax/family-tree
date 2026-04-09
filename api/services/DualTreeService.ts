import { query } from '../config/database';
import { Gender, Side, UUID } from '../types';
import { matchTitleWithFallback, buildAncestorPath, buildDescendantPath } from './titleRules';

// ── 双系图谱专用类型 ──

export interface PersonNode {
  id: UUID;
  name: string;
  gender: Gender;
  birth_date: string | null;
  death_date: string | null;
  photo_url: string | null;
  birth_order: number | null;
  native_place: string | null;
  title: string;
  side: Side;
  isFormerSpouse?: boolean;
}

export interface DescendantNode {
  person: PersonNode;
  spouses: PersonNode[];
  spouseParents: PersonNode[];
  children: DescendantNode[];
}

export interface CollateralFamily {
  person: PersonNode;
  spouses: PersonNode[];
  children: DescendantNode[];
}

export interface SpouseFamily {
  person: PersonNode;
  ancestors: AncestorLayer[];
  siblings: CollateralFamily[];
}

export interface AncestorLayer {
  ancestor: PersonNode;
  spouses: PersonNode[];
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
  photo_url: string | null;
  birth_order: number | null;
  native_place: string | null;
}

interface RelRow {
  from_person_id: string;
  to_person_id: string;
  type: string;
  subtype: string | null;
  start_date: Date | null;
  is_active: boolean;
}

/**
 * 双系图谱构建服务。
 *
 * 设计要点：
 *  1. 一次性加载整个家族的 persons + relationships 到内存
 *  2. 在内存中用邻接表遍历，彻底避免 N+1 查询
 *  3. 以参考人为中心，分别沿父方 / 母方向上追溯
 *  4. 称谓通过 titleRules.ts 统一规则表匹配，支持 177 条规则 + 兜底
 *  5. 父系/母系均沿男性向上追溯（母系：母亲→外公→外曾祖父→…）
 *  6. 支持多配偶，按 start_date 排序（原配在前）
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
        'SELECT id, name, gender, birth_date, death_date, photo_url, birth_order, native_place FROM persons WHERE family_id = $1',
        [familyId]
      ),
      query<RelRow>(
        `SELECT r.from_person_id, r.to_person_id, r.type, r.subtype, r.start_date, r.is_active
         FROM relationships r
         JOIN persons p ON p.id = r.from_person_id
         WHERE p.family_id = $1 AND (r.is_active = TRUE OR r.type = 'spouse')`,
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
    const formerSpouseMap = new Map<string, PersonRow[]>();   // 前配偶

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
          if (r.is_active) {
            pushToUnique(spouseMap, r.from_person_id, b);
            pushToUnique(spouseMap, r.to_person_id, a);
          } else {
            pushToUnique(formerSpouseMap, r.from_person_id, b);
            pushToUnique(formerSpouseMap, r.to_person_id, a);
          }
        }
      }
    }

    // 多配偶排序：按 start_date ASC，null 在前（原配）
    for (const [personId, spouseList] of spouseMap) {
      if (spouseList.length <= 1) continue;
      const spouseWithDates = spouseList.map(sp => {
        const rel = relsResult.rows.find(r =>
          r.type === 'spouse' &&
          ((r.from_person_id === personId && r.to_person_id === sp.id) ||
           (r.to_person_id === personId && r.from_person_id === sp.id))
        );
        return { spouse: sp, startDate: rel?.start_date ?? null };
      });
      spouseWithDates.sort((a, b) => {
        if (a.startDate === null && b.startDate === null) return 0;
        if (a.startDate === null) return -1;
        if (b.startDate === null) return 1;
        return a.startDate.getTime() - b.startDate.getTime();
      });
      spouseMap.set(personId, spouseWithDates.map(s => s.spouse));
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
      ? this.buildAncestorChain(father, 1, maxDepth, parentsMap, childrenMap, spouseMap, personMap, 'paternal', ref, false, formerSpouseMap)
      : [];
    const maternalChain = mother
      ? this.buildAncestorChain(mother, 1, maxDepth, parentsMap, childrenMap, spouseMap, personMap, 'maternal', ref, false, formerSpouseMap)
      : [];

    // ── 5. 参考人的兄弟姐妹 ──
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
        siblingsResult.push(this.buildCollateralFamily(sib, ref, 0, 'paternal', spouseMap, childrenMap, personMap, formerSpouseMap));
      }
    }
    siblingsResult.sort((a, b) => sortByBirthOrder(personMap.get(a.person.id), personMap.get(b.person.id)));

    // ── 6. 参考人的子女 ──
    const refChildren = childrenMap.get(referencePersonId) ?? [];
    const sortedChildren = [...refChildren].sort(sortByBirthOrder);
    const visited = new Set<string>([referencePersonId]);
    const childrenResult: DescendantNode[] = sortedChildren.map((c) => {
      // 通过儿子的后代 = paternal（孙子），通过女儿的后代 = maternal（外孙）
      const childSide = c.gender === 'female' ? 'maternal' : 'paternal';
      return this.buildDescendantTree(c, ref, 1, childSide as Side, 10, parentsMap, spouseMap, childrenMap, personMap, visited, formerSpouseMap);
    });

    // ── 7. 参考人的配偶（含前配偶） ──
    const refSpouses = spouseMap.get(referencePersonId) ?? [];
    const refFormerSpouses = formerSpouseMap.get(referencePersonId) ?? [];
    const spousesResult: SpouseFamily[] = refSpouses.map((s) =>
      this.buildSpouseFamily(s, ref, parentsMap, childrenMap, spouseMap, personMap)
    );
    // 前配偶也构建家族树，标记 isFormerSpouse
    for (const fs of refFormerSpouses) {
      if (refSpouses.some(s => s.id === fs.id)) continue; // 跳过已在现配中的
      const sf = this.buildSpouseFamily(fs, ref, parentsMap, childrenMap, spouseMap, personMap);
      sf.person.isFormerSpouse = true;
      spousesResult.push(sf);
    }

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
    parentsMap: Map<string, PersonRow[]>,
    spouseMap: Map<string, PersonRow[]>,
    childrenMap: Map<string, PersonRow[]>,
    personMap: Map<string, PersonRow>,
    visited: Set<string>,
    formerSpouseMap?: Map<string, PersonRow[]>,
  ): DescendantNode {
    visited.add(person.id);

    const allSpouses = spouseMap.get(person.id) ?? [];
    const formerSpouses = formerSpouseMap?.get(person.id) ?? [];
    const descendantPath = buildDescendantPath(generation);
    const spousePath = descendantPath + '>spouse';

    const title = matchTitleWithFallback(descendantPath, person.gender, side, null, ref.gender);
    const spouseNodes = allSpouses.map(sp =>
      toNode(sp, matchTitleWithFallback(spousePath, sp.gender, side, null, ref.gender), 'affinity')
    );
    // 前配偶
    const formerSpouseNodes = formerSpouses
      .filter(fs => !allSpouses.some(s => s.id === fs.id))
      .map(sp =>
        toNode(sp, '前' + matchTitleWithFallback(spousePath, sp.gender, side, null, ref.gender), 'affinity', true)
      );

    // 查询配偶的父母（亲家）
    const spouseParentNodes: PersonNode[] = [];
    for (const sp of allSpouses) {
      const spParents = parentsMap.get(sp.id) ?? [];
      for (const p of spParents) {
        const parentTitle = p.gender === 'male' ? '亲家公' : '亲家母';
        spouseParentNodes.push(toNode(p, parentTitle, 'affinity'));
      }
    }

    let childDescendants: DescendantNode[] = [];
    if (generation < maxDescendantDepth) {
      const kids = childrenMap.get(person.id) ?? [];
      const sortedKids = [...kids].sort(sortByBirthOrder);
      childDescendants = sortedKids
        .filter((k) => !visited.has(k.id))
        .map((k) =>
          this.buildDescendantTree(k, ref, generation + 1, side, maxDescendantDepth, parentsMap, spouseMap, childrenMap, personMap, visited, formerSpouseMap)
        );
    }

    return {
      person: toNode(person, title, side),
      spouses: [...spouseNodes, ...formerSpouseNodes],
      spouseParents: spouseParentNodes,
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
    formerSpouseMap?: Map<string, PersonRow[]>,
  ): DescendantNode {
    visited.add(person.id);

    const allSpouses = spouseMap.get(person.id) ?? [];
    const formerSpouses = formerSpouseMap?.get(person.id) ?? [];
    const spouseNodes = allSpouses.map(sp => toNode(sp, '配偶', side));
    const formerSpouseNodes = formerSpouses
      .filter(fs => !allSpouses.some(s => s.id === fs.id))
      .map(sp => toNode(sp, '前配偶', side, true));

    let childDescendants: DescendantNode[] = [];
    if (generation < maxDepth) {
      const kids = childrenMap.get(person.id) ?? [];
      const sortedKids = [...kids].sort(sortByBirthOrder);
      childDescendants = sortedKids
        .filter((k) => !visited.has(k.id))
        .map((k) => {
          const childTitle = k.gender === 'male' ? '子' : k.gender === 'female' ? '女' : '子女';
          return this.buildCollateralDescendantTree(k, generation + 1, side, maxDepth, spouseMap, childrenMap, personMap, visited, childTitle, formerSpouseMap);
        });
    }

    return {
      person: toNode(person, title, side),
      spouses: [...spouseNodes, ...formerSpouseNodes],
      spouseParents: [],
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
    personMap: Map<string, PersonRow>,
    formerSpouseMap?: Map<string, PersonRow[]>,
  ): CollateralFamily {
    // 路径：ancestorGen=0 → 'sibling'，ancestorGen=1 → 'parent>sibling'，etc.
    const pathStr = ancestorGeneration === 0
      ? 'sibling'
      : buildAncestorPath(ancestorGeneration) + '>sibling';

    const elder = isElder(sib, ref);
    const title = matchTitleWithFallback(pathStr, sib.gender, side, elder, ref.gender);

    const allSibSpouses = spouseMap.get(sib.id) ?? [];
    const formerSpouses = formerSpouseMap?.get(sib.id) ?? [];
    const spousePathStr = pathStr + '>spouse';
    const spouseNodes = allSibSpouses.map(sp =>
      toNode(sp, matchTitleWithFallback(spousePathStr, sp.gender, side, elder, ref.gender), side)
    );
    const formerSpouseNodes = formerSpouses
      .filter(fs => !allSibSpouses.some(s => s.id === fs.id))
      .map(sp => toNode(sp, '前' + matchTitleWithFallback(spousePathStr, sp.gender, side, elder, ref.gender), side, true));

    const sibChildren = childrenMap.get(sib.id) ?? [];
    const sortedSibChildren = [...sibChildren].sort(sortByBirthOrder);
    const visited = new Set<string>([sib.id]);
    const childPathStr = pathStr + '>child';
    const childDescendants: DescendantNode[] = sortedSibChildren
      .filter((c) => !visited.has(c.id))
      .map((c) => {
        const childRefGender = childPathStr === 'sibling>child' ? sib.gender : ref.gender;
        const childTitle = matchTitleWithFallback(childPathStr, c.gender, side, null, childRefGender);
        return this.buildCollateralDescendantTree(c, 1, side, 10, spouseMap, childrenMap, personMap, visited, childTitle, formerSpouseMap);
      });

    return {
      person: toNode(sib, title, side),
      spouses: [...spouseNodes, ...formerSpouseNodes],
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
    const spouseTitle = matchTitleWithFallback('spouse', spouse.gender, null, null, ref.gender);

    // 配偶的父母 → 构建完整祖先链
    const spouseParents = parentsMap.get(spouse.id) ?? [];
    const spouseFather = spouseParents.find((p) => p.gender === 'male') ?? spouseParents[0] ?? null;

    const ancestorChain = spouseFather
      ? this.buildAncestorChain(spouseFather, 1, 20, parentsMap, childrenMap, spouseMap, personMap, 'paternal', ref, true)
      : [];

    // 配偶的兄弟姐妹
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
        const sibElder = isElder(sib, spouse);
        const sibTitle = matchTitleWithFallback('spouse>sibling', sib.gender, null, sibElder, ref.gender);
        const allSibSpouses = spouseMap.get(sib.id) ?? [];
        const sibSpouseNodes = allSibSpouses.map(sp =>
          toNode(sp, matchTitleWithFallback('spouse>sibling>spouse', sp.gender, null, null, ref.gender), 'affinity')
        );
        const sibChildren = childrenMap.get(sib.id) ?? [];
        const sibVisited = new Set<string>([sib.id]);
        const sibChildDescendants: DescendantNode[] = sibChildren
          .filter((c) => !sibVisited.has(c.id))
          .map((c) => {
            const childTitle = matchTitleWithFallback('spouse>sibling>child', c.gender, null, null, ref.gender);
            return this.buildCollateralDescendantTree(c, 1, 'affinity', 10, spouseMap, childrenMap, personMap, sibVisited, childTitle);
          });
        siblingFamilies.push({
          person: toNode(sib, sibTitle, 'affinity'),
          spouses: sibSpouseNodes,
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
    formerSpouseMap?: Map<string, PersonRow[]>,
  ): AncestorLayer[] {
    const result: AncestorLayer[] = [];

    let current: PersonRow | null = person;
    let gen = generation;

    while (current && gen <= maxDepth) {
      const ancestorPath = buildAncestorPath(gen);
      // 配偶祖先链使用 'spouse>parent>...' 路径
      const titlePath = forSpouse ? 'spouse>' + ancestorPath : ancestorPath;

      const nodeSide: Side = forSpouse ? 'affinity' : side;
      const titleSide = forSpouse ? null : side;

      // 祖先称谓
      const title = matchTitleWithFallback(titlePath, current.gender, titleSide, null, ref.gender);
      // 深层配偶祖先的称谓兜底
      const ancestorTitle = forSpouse ? spouseAncestorFallback(title, gen, current.gender, ref.gender) : title;

      // 全部配偶
      const allSpouses = spouseMap.get(current.id) ?? [];
      const spouseNodes = allSpouses.map(sp => {
        let spTitle = matchTitleWithFallback(titlePath, sp.gender, titleSide, null, ref.gender);
        if (forSpouse) spTitle = spouseAncestorFallback(spTitle, gen, sp.gender, ref.gender);
        return toNode(sp, spTitle, nodeSide);
      });

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
          siblings.push(this.buildCollateralFamily(sib, ref, gen, side, spouseMap, childrenMap, personMap, formerSpouseMap));
        }
      }

      // 第一个配偶的父母和兄弟姐妹
      const mainSpouse = allSpouses.length > 0 ? allSpouses[0] : null;
      let spouseParentNodes: PersonNode[] = [];
      let spouseSiblingFamilies: CollateralFamily[] = [];
      if (mainSpouse) {
        const mainSpouseTitle = matchTitleWithFallback(titlePath, mainSpouse.gender, titleSide, null, ref.gender);
        const spParents = parentsMap.get(mainSpouse.id) ?? [];
        spouseParentNodes = spParents.map((p) =>
          toNode(p, `${mainSpouseTitle}的${p.gender === 'male' ? '父亲' : '母亲'}`, nodeSide)
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
              this.buildCollateralFamily(sib, ref, gen, side, spouseMap, childrenMap, personMap, formerSpouseMap)
            );
          }
        }
      }

      result.push({
        ancestor: toNode(current, ancestorTitle, nodeSide),
        spouses: spouseNodes,
        siblings,
        spouseParents: spouseParentNodes,
        spouseSiblings: spouseSiblingFamilies,
        generation: gen,
      });

      // 向上追溯：父系和母系均沿男性向上
      // 修复：原代码母系沿女性追溯（母亲→外婆→外婆的母亲），
      // 正确路径：母亲→外公→外曾祖父→外高祖父→…
      const nextParents: PersonRow[] = parentsMap.get(current.id) ?? [];
      const nextAncestor: PersonRow | null =
        nextParents.find((p: PersonRow) => p.gender === 'male') ?? nextParents[0] ?? null;

      current = nextAncestor ?? null;
      gen++;
    }

    return result;
  }
}

// ── 工具函数 ──

function toNode(person: PersonRow, title: string, side: Side, isFormerSpouse?: boolean): PersonNode {
  const node: PersonNode = {
    id: person.id,
    name: person.name,
    gender: person.gender,
    birth_date: person.birth_date ? person.birth_date.toISOString().split('T')[0] : null,
    death_date: person.death_date ? person.death_date.toISOString().split('T')[0] : null,
    photo_url: person.photo_url ?? null,
    birth_order: person.birth_order ?? null,
    native_place: person.native_place ?? null,
    title,
    side,
  };
  if (isFormerSpouse) node.isFormerSpouse = true;
  return node;
}

function pushTo<T>(map: Map<string, T[]>, key: string, value: T): void {
  const list = map.get(key);
  if (list) {
    list.push(value);
  } else {
    map.set(key, [value]);
  }
}

/** pushTo with deduplication by id (for spouse bidirectional entries) */
function pushToUnique(map: Map<string, PersonRow[]>, key: string, value: PersonRow): void {
  const list = map.get(key);
  if (list) {
    if (!list.some(p => p.id === value.id)) {
      list.push(value);
    }
  } else {
    map.set(key, [value]);
  }
}

/** Compare two persons for ordering: birth_order → birth_date → name */
function sortByBirthOrder(a: PersonRow | undefined, b: PersonRow | undefined): number {
  if (!a || !b) return 0;
  if (a.birth_order !== null && b.birth_order !== null) return a.birth_order - b.birth_order;
  if (a.birth_order !== null) return -1;
  if (b.birth_order !== null) return 1;
  if (a.birth_date && b.birth_date) return a.birth_date.getTime() - b.birth_date.getTime();
  if (a.birth_date) return -1;
  if (b.birth_date) return 1;
  return a.name.localeCompare(b.name);
}

/** Determine if person A is elder than person B */
function isElder(a: PersonRow, b: PersonRow): boolean | null {
  if (a.birth_date && b.birth_date) return a.birth_date.getTime() < b.birth_date.getTime();
  if (a.birth_order !== null && b.birth_order !== null) return a.birth_order < b.birth_order;
  return null;
}

/** 深层配偶祖先称谓兜底（规则表仅覆盖 2 代，更深层用此函数） */
function spouseAncestorFallback(matchedTitle: string, gen: number, gender: Gender, refGender: Gender): string {
  if (matchedTitle !== '姻亲' && matchedTitle !== '亲属') return matchedTitle;
  if (refGender === 'male') {
    return gender === 'male' ? `岳${gen}世祖` : `岳${gen}世祖母`;
  } else {
    return gender === 'male' ? `夫方${gen}世祖` : `夫方${gen}世祖母`;
  }
}

export const dualTreeService = new DualTreeService();
