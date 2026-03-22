import { Person, Gender, RelationType, RelationPath, RelationPathNode } from '../types';

// 称谓映射表
const relationMap: Record<string, Record<Gender, string>> = {
  'parent': {
    [Gender.MALE]: RelationType.FATHER,
    [Gender.FEMALE]: RelationType.MOTHER,
    [Gender.UNKNOWN]: '父母',
  },
  'child': {
    [Gender.MALE]: RelationType.SON,
    [Gender.FEMALE]: RelationType.DAUGHTER,
    [Gender.UNKNOWN]: '子女',
  },
  'spouse': {
    [Gender.MALE]: RelationType.HUSBAND,
    [Gender.FEMALE]: RelationType.WIFE,
    [Gender.UNKNOWN]: '配偶',
  },
  'sibling': {
    [Gender.MALE]: RelationType.BROTHER,
    [Gender.FEMALE]: RelationType.SISTER,
    [Gender.UNKNOWN]: '兄弟姐妹',
  },
  'grandparent': {
    [Gender.MALE]: RelationType.GRANDFATHER,
    [Gender.FEMALE]: RelationType.GRANDMOTHER,
    [Gender.UNKNOWN]: '祖父母',
  },
  'grandchild': {
    [Gender.MALE]: RelationType.GRANDSON,
    [Gender.FEMALE]: RelationType.GRANDDAUGHTER,
    [Gender.UNKNOWN]: '孙辈',
  },
};

// 计算两人之间的关系
export function calculateRelation(
  fromPerson: Person,
  toPerson: Person,
  personMap: Map<string, Person>
): RelationPath | null {
  // 找到从fromPerson到toPerson的路径
  const path = findPath(fromPerson, toPerson, personMap);
  if (!path || path.length === 0) return null;

  const nodes: RelationPathNode[] = [];
  
  for (let i = 0; i < path.length - 1; i++) {
    const current = path[i];
    const next = path[i + 1];
    const relation = getDirectRelation(current, next);
    
    nodes.push({
      person: next,
      relation,
      direction: getDirection(current, next),
    });
  }

  return {
    nodes,
    distance: nodes.length,
  };
}

// 查找两人之间的路径（BFS）
function findPath(
  start: Person,
  end: Person,
  personMap: Map<string, Person>
): Person[] | null {
  if (start.id === end.id) return [start];

  const visited = new Set<string>();
  const queue: { person: Person; path: Person[] }[] = [{ person: start, path: [start] }];

  while (queue.length > 0) {
    const { person, path } = queue.shift()!;

    if (person.id === end.id) {
      return path;
    }

    if (visited.has(person.id)) continue;
    visited.add(person.id);

    // 获取所有相关的人
    const related = getRelatedPersons(person, personMap);
    
    for (const relatedPerson of related) {
      if (!visited.has(relatedPerson.id)) {
        queue.push({
          person: relatedPerson,
          path: [...path, relatedPerson],
        });
      }
    }
  }

  return null;
}

// 获取与某人直接相关的人
function getRelatedPersons(person: Person, personMap: Map<string, Person>): Person[] {
  const related: Person[] = [];

  // 父母
  if (person.fatherId) {
    const father = personMap.get(person.fatherId);
    if (father) related.push(father);
  }
  if (person.motherId) {
    const mother = personMap.get(person.motherId);
    if (mother) related.push(mother);
  }

  // 配偶
  if (person.spouseIds) {
    for (const spouseId of person.spouseIds) {
      const spouse = personMap.get(spouseId);
      if (spouse) related.push(spouse);
    }
  }

  // 子女
  if (person.childrenIds) {
    for (const childId of person.childrenIds) {
      const child = personMap.get(childId);
      if (child) related.push(child);
    }
  }

  return related;
}

// 获取直接关系
function getDirectRelation(from: Person, to: Person): string {
  // 父母关系
  if (from.fatherId === to.id || from.motherId === to.id) {
    return relationMap.parent[to.gender];
  }

  // 子女关系
  if (to.fatherId === from.id || to.motherId === from.id) {
    return relationMap.child[to.gender];
  }

  // 配偶关系
  if (from.spouseIds?.includes(to.id)) {
    return relationMap.spouse[to.gender];
  }

  // 兄弟姐妹关系
  if (from.fatherId && from.fatherId === to.fatherId) {
    return relationMap.sibling[to.gender];
  }
  if (from.motherId && from.motherId === to.motherId) {
    return relationMap.sibling[to.gender];
  }

  return RelationType.UNKNOWN;
}

// 获取关系方向
function getDirection(from: Person, to: Person): 'up' | 'down' | 'same' {
  // 向上（长辈）
  if (from.fatherId === to.id || from.motherId === to.id) {
    return 'up';
  }

  // 向下（晚辈）
  if (to.fatherId === from.id || to.motherId === from.id) {
    return 'down';
  }

  // 同辈
  return 'same';
}

// 获取相对于"我"的完整称谓
export function getFullRelationTitle(
  referencePerson: Person,
  targetPerson: Person,
  personMap: Map<string, Person>
): string {
  const path = calculateRelation(referencePerson, targetPerson, personMap);
  if (!path || path.nodes.length === 0) {
    return targetPerson.name;
  }

  // 构建完整称谓
  const relations = path.nodes.map(n => n.relation);
  
  // 简化称谓
  return simplifyRelationTitle(relations, targetPerson.gender);
}

// 简化称谓
function simplifyRelationTitle(relations: string[], gender: Gender): string {
  if (relations.length === 1) {
    return relations[0];
  }

  // 多代关系简化
  const relationKey = relations.join('-');
  
  // 常见多代关系映射
  const complexRelations: Record<string, string> = {
    '父亲-父亲': '祖父',
    '父亲-母亲': '祖母',
    '母亲-父亲': '外祖父',
    '母亲-母亲': '外祖母',
    '儿子-儿子': '孙子',
    '儿子-女儿': '孙女',
    '女儿-儿子': '外孙',
    '女儿-女儿': '外孙女',
    '父亲-兄弟': '伯父/叔叔',
    '父亲-姐妹': '姑姑',
    '母亲-兄弟': '舅舅',
    '母亲-姐妹': '姨妈',
  };

  return complexRelations[relationKey] || relations[relations.length - 1];
}

// 获取关系路径显示文本
export function getRelationPathText(path: RelationPath): string {
  if (path.nodes.length === 0) return '自己';
  
  return path.nodes.map(n => n.relation).join(' → ');
}

// 计算代际差
export function getGenerationDifference(
  fromPerson: Person,
  toPerson: Person
): number {
  return toPerson.generation - fromPerson.generation;
}
