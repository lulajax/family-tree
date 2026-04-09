/**
 * 双系族谱布局引擎 — 纯坐标计算，无 DOM 依赖
 *
 * 从 DualFamilyTree.tsx 提取，用于将 D3 渲染改为 React 组件渲染。
 */
import type { DualTreeResponse, PersonNode, CollateralFamily, DescendantNode, AncestorLayer } from '../types';

// ── 布局常量 ──
export const NODE_W = 160;
export const NODE_H = 80;
export const H_GAP = 50;       // 同层节点横间距
export const V_GAP = 130;      // 层级间距
export const HALF_GAP = 160;   // 中心到父系/母系主列的半间距
export const SPOUSE_GAP = 30;  // 夫妻节点间距
export const COLUMN_PAT = -(HALF_GAP + NODE_W / 2); // 父系主列 X
export const COLUMN_MAT = +(HALF_GAP + NODE_W / 2); // 母系主列 X

// ── 颜色 ──
export const COLORS = {
  male: '#3b82f6',
  female: '#ec4899',
  unknown: '#6b7280',
  reference: '#f59e0b',
  paternalBg: 'rgba(59,130,246,0.06)',
  maternalBg: 'rgba(236,72,153,0.06)',
  affinityBg: 'rgba(245,158,11,0.06)',
  link: '#cbd5e1',
};

// ── 布局数据结构 ──

export type LayoutNodeType =
  | 'ancestor' | 'spouse' | 'sibling' | 'reference' | 'child'
  | 'collateral-spouse' | 'collateral-child' | 'inlaw-parent' | 'inlaw-sibling';

export interface LayoutNode {
  person: PersonNode;
  x: number;
  y: number;
  type: LayoutNodeType;
  childCount?: number;       // 子女数量（用于折叠指示）
  isCollapsed?: boolean;     // 是否被折叠
}

export interface LayoutLink {
  source: { x: number; y: number };
  target: { x: number; y: number };
  type: 'parent-child' | 'spouse' | 'former-spouse';
}

export interface LayoutBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface LayoutResult {
  nodes: LayoutNode[];
  links: LayoutLink[];
  bounds: LayoutBounds;
}

// ── 区域信息（供背景渲染用） ──

export interface RegionInfo {
  label: string;
  color: string;
  strokeColor: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function computeRegions(nodes: LayoutNode[], hasBothSides: boolean): RegionInfo[] {
  const regions: RegionInfo[] = [];

  // 只用祖先和兄弟节点计算父系/母系区域，不包含子女（子女横跨多个区域）
  const ancestorTypes = new Set(['ancestor', 'sibling', 'collateral-spouse']);
  const pNodes = nodes.filter(n => n.person.side === 'paternal' && ancestorTypes.has(n.type));
  const mNodes = nodes.filter(n => n.person.side === 'maternal' && ancestorTypes.has(n.type));
  // 姻亲区域只包含配偶的祖先链，不包含直接配偶和子女的配偶
  const aNodes = nodes.filter(n => n.person.side === 'affinity' && n.type === 'inlaw-parent');

  if (pNodes.length > 0) {
    const minX = Math.min(...pNodes.map(n => n.x)) - NODE_W / 2 - 30;
    const minY = Math.min(...pNodes.map(n => n.y)) - NODE_H / 2 - 48;
    const maxX = hasBothSides
      ? Math.min(-10, Math.max(...pNodes.map(n => n.x)) + NODE_W / 2 + 30)
      : Math.max(...pNodes.map(n => n.x)) + NODE_W / 2 + 30;
    const maxY = Math.max(...pNodes.map(n => n.y)) + NODE_H / 2 + 30;
    regions.push({
      label: '父系血统', color: COLORS.paternalBg,
      strokeColor: 'rgba(59,130,246,0.15)', minX, minY, maxX, maxY,
    });
  }

  if (mNodes.length > 0) {
    const minX = hasBothSides
      ? Math.max(10, Math.min(...mNodes.map(n => n.x)) - NODE_W / 2 - 30)
      : Math.min(...mNodes.map(n => n.x)) - NODE_W / 2 - 30;
    const minY = Math.min(...mNodes.map(n => n.y)) - NODE_H / 2 - 48;
    const maxX = Math.max(...mNodes.map(n => n.x)) + NODE_W / 2 + 30;
    const maxY = Math.max(...mNodes.map(n => n.y)) + NODE_H / 2 + 30;
    regions.push({
      label: '母系血统', color: COLORS.maternalBg,
      strokeColor: 'rgba(236,72,153,0.15)', minX, minY, maxX, maxY,
    });
  }

  if (aNodes.length > 0) {
    const minX = Math.min(...aNodes.map(n => n.x)) - NODE_W / 2 - 30;
    const minY = Math.min(...aNodes.map(n => n.y)) - NODE_H / 2 - 48;
    const maxX = Math.max(...aNodes.map(n => n.x)) + NODE_W / 2 + 30;
    const maxY = Math.max(...aNodes.map(n => n.y)) + NODE_H / 2 + 30;
    regions.push({
      label: '姻亲', color: COLORS.affinityBg,
      strokeColor: 'rgba(245,158,11,0.15)', minX, minY, maxX, maxY,
    });
  }

  return regions;
}

// ── 碰撞检测：在目标 Y 层找到不重叠的 X 位置 ──

function findSafeX(
  existingNodes: LayoutNode[],
  targetY: number,
  desiredX: number,
  direction: 1 | -1 = 1,
): number {
  let safeX = desiredX;
  const minCenterDist = NODE_W + H_GAP;

  for (const n of existingNodes) {
    if (Math.abs(n.y - targetY) >= NODE_H) continue;
    if (direction === 1) {
      const needed = n.x + minCenterDist;
      if (safeX < needed && safeX > n.x - minCenterDist) {
        safeX = needed;
      }
    } else {
      const needed = n.x - minCenterDist;
      if (safeX > needed && safeX < n.x + minCenterDist) {
        safeX = needed;
      }
    }
  }
  return safeX;
}

// ── 后代子树测量 ──

function measureDescendant(desc: DescendantNode): number {
  // 本人 + 所有配偶（含前配偶）的宽度
  const spouseCount = desc.spouses.length;
  const unitW = spouseCount > 0 ? (NODE_W + spouseCount * (NODE_W + SPOUSE_GAP)) : NODE_W;
  // 注：亲家（spouseParents）在上一层独立布局，不计入当前层宽度
  if (desc.children.length === 0) return unitW;

  let childrenTotalW = 0;
  for (let i = 0; i < desc.children.length; i++) {
    if (i > 0) childrenTotalW += H_GAP;
    childrenTotalW += measureDescendant(desc.children[i]);
  }

  return Math.max(unitW, childrenTotalW);
}

// ── 递归后代布局 ──

function layoutDescendants(
  descendants: DescendantNode[],
  centerX: number,
  y: number,
  parentX: number,
  parentY: number,
  nodes: LayoutNode[],
  links: LayoutLink[],
  collapsedNodes?: Set<string>,
): void {
  if (descendants.length === 0) return;

  let totalW = 0;
  for (let i = 0; i < descendants.length; i++) {
    if (i > 0) totalW += H_GAP;
    totalW += measureDescendant(descendants[i]);
  }

  let curX = centerX - totalW / 2;

  for (const desc of descendants) {
    const w = measureDescendant(desc);
    const descCenterX = curX + w / 2;

    let personX: number;
    const spCount = desc.spouses.length;
    if (spCount > 0) {
      // 本人居左，所有配偶在右侧排列
      const totalPairW = NODE_W + spCount * (NODE_W + SPOUSE_GAP);
      personX = descCenterX - totalPairW / 2 + NODE_W / 2;
    } else {
      personX = descCenterX;
    }

    const isCollapsed = collapsedNodes?.has(desc.person.id) ?? false;
    const totalChildren = desc.children.length;

    nodes.push({
      person: desc.person, x: personX, y, type: 'child',
      childCount: totalChildren > 0 ? totalChildren : undefined,
      isCollapsed: isCollapsed && totalChildren > 0,
    });
    links.push({ source: { x: parentX, y: parentY }, target: { x: personX, y }, type: 'parent-child' });

    // 渲染所有配偶（含前配偶）
    let lastSpouseX = personX;
    for (let si = 0; si < desc.spouses.length; si++) {
      const sp = desc.spouses[si];
      const spouseX = personX + (si + 1) * (NODE_W + SPOUSE_GAP);
      const linkType = sp.isFormerSpouse ? 'former-spouse' as const : 'spouse' as const;
      nodes.push({ person: sp, x: spouseX, y, type: 'spouse' });
      links.push({ source: { x: lastSpouseX, y }, target: { x: spouseX, y }, type: linkType });
      lastSpouseX = spouseX;
    }

    // 亲家：配偶的父母，显示在同辈层（完整 V_GAP），带碰撞检测
    if (desc.spouses[0] && !desc.spouses[0].isFormerSpouse && desc.spouseParents && desc.spouseParents.length > 0) {
      const firstSpouseX = personX + NODE_W + SPOUSE_GAP;
      const spParentY = y - V_GAP;
      const parentPositions: number[] = [];
      for (let pi = 0; pi < desc.spouseParents.length; pi++) {
        let spParentX = firstSpouseX + pi * (NODE_W + SPOUSE_GAP);
        spParentX = findSafeX(nodes, spParentY, spParentX, 1);
        if (pi > 0) {
          spParentX = Math.max(spParentX, parentPositions[pi - 1] + NODE_W + SPOUSE_GAP);
        }
        parentPositions.push(spParentX);
        nodes.push({ person: desc.spouseParents[pi], x: spParentX, y: spParentY, type: 'inlaw-parent' });
        if (pi === 0) {
          links.push({ source: { x: spParentX, y: spParentY }, target: { x: firstSpouseX, y }, type: 'parent-child' });
        }
      }
      if (desc.spouseParents.length === 2) {
        links.push({ source: { x: parentPositions[0], y: spParentY }, target: { x: parentPositions[1], y: spParentY }, type: 'spouse' });
      }
    }

    if (desc.children.length > 0 && !isCollapsed) {
      // 有配偶时从夫妻中点引出子女连线
      const childAnchorX = desc.spouses[0]
        ? personX + (NODE_W + SPOUSE_GAP) / 2
        : personX;
      layoutDescendants(desc.children, descCenterX, y + V_GAP, childAnchorX, y, nodes, links, collapsedNodes);
    }

    curX += w + H_GAP;
  }
}

// ── 旁系家庭布局 ──

function layoutCollateralFamilies(
  families: CollateralFamily[],
  baseX: number,
  y: number,
  direction: 1 | -1,
  nodes: LayoutNode[],
  links: LayoutLink[],
  parentAnchorY?: number,
  parentAnchorX?: number,
  collapsedNodes?: Set<string>,
): number {
  let offset = 0;
  for (const cf of families) {
    const spouseCount = cf.spouses.length;
    const selfUnitW = spouseCount > 0 ? (NODE_W + spouseCount * (NODE_W + SPOUSE_GAP)) : NODE_W;
    let childrenW = 0;
    for (let i = 0; i < cf.children.length; i++) {
      if (i > 0) childrenW += H_GAP;
      childrenW += measureDescendant(cf.children[i]);
    }
    const familyW = Math.max(selfUnitW, childrenW);
    const familyUnits = Math.ceil(familyW / (NODE_W + H_GAP));

    const sibX = baseX + direction * ((NODE_W + H_GAP) * offset + NODE_W / 2 + H_GAP + familyW / 2);
    const cfSpCount = cf.spouses.length;
    const personX = cfSpCount > 0
      ? sibX - direction * (cfSpCount * (NODE_W + SPOUSE_GAP)) / 2
      : sibX;

    const cfIsCollapsed = collapsedNodes?.has(cf.person.id) ?? false;
    nodes.push({
      person: cf.person, x: personX, y, type: 'sibling',
      childCount: cf.children.length > 0 ? cf.children.length : undefined,
      isCollapsed: cfIsCollapsed && cf.children.length > 0,
    });

    if (parentAnchorY !== undefined && parentAnchorX !== undefined) {
      links.push({ source: { x: parentAnchorX, y: parentAnchorY }, target: { x: personX, y }, type: 'parent-child' });
    }

    // 渲染所有配偶（含前配偶）
    let lastCfSpouseX = personX;
    for (let si = 0; si < cf.spouses.length; si++) {
      const sp = cf.spouses[si];
      const spouseX = personX + direction * (si + 1) * (NODE_W + SPOUSE_GAP);
      const linkType = sp.isFormerSpouse ? 'former-spouse' as const : 'spouse' as const;
      nodes.push({ person: sp, x: spouseX, y, type: 'collateral-spouse' });
      links.push({ source: { x: lastCfSpouseX, y }, target: { x: spouseX, y }, type: linkType });
      lastCfSpouseX = spouseX;
    }

    if (cf.children.length > 0 && !cfIsCollapsed) {
      const childY = y + V_GAP;
      const cfAnchorX = cf.spouses[0]
        ? personX + direction * (NODE_W + SPOUSE_GAP) / 2
        : personX;
      layoutDescendants(cf.children, sibX, childY, cfAnchorX, y, nodes, links, collapsedNodes);
    }

    offset += familyUnits;
  }
  return offset;
}

// ── 祖先配偶家族布局 ──

function layoutAncestorSpouseFamily(
  layer: AncestorLayer,
  spouseX: number,
  y: number,
  direction: 1 | -1,
  nodes: LayoutNode[],
  links: LayoutLink[],
): void {
  if (!layer.spouses[0]) return;

  // 配偶的父母（同辈层，带碰撞检测）
  const parentY = y - V_GAP;
  if (layer.spouseParents.length > 0) {
    const parentPositions: number[] = [];
    layer.spouseParents.forEach((parent, pi) => {
      let parentX = spouseX + direction * pi * (NODE_W + SPOUSE_GAP);
      parentX = findSafeX(nodes, parentY, parentX, direction);
      if (pi > 0) {
        const minX = direction === 1
          ? parentPositions[pi - 1] + NODE_W + SPOUSE_GAP
          : parentPositions[pi - 1] - NODE_W - SPOUSE_GAP;
        parentX = direction === 1 ? Math.max(parentX, minX) : Math.min(parentX, minX);
      }
      parentPositions.push(parentX);
      nodes.push({ person: parent, x: parentX, y: parentY, type: 'inlaw-parent' });
      links.push({ source: { x: parentX, y: parentY }, target: { x: spouseX, y }, type: 'parent-child' });
    });
    if (layer.spouseParents.length === 2) {
      links.push({ source: { x: parentPositions[0], y: parentY }, target: { x: parentPositions[1], y: parentY }, type: 'spouse' });
    }
  }

  // 配偶的兄弟姐妹
  if (layer.spouseSiblings.length > 0) {
    layoutCollateralFamilies(
      layer.spouseSiblings, spouseX, y, direction,
      nodes, links,
      layer.spouseParents.length > 0 ? parentY : undefined,
      layer.spouseParents.length > 0 ? spouseX : undefined,
    );
  }
}

// ── 主布局函数 ──

export function computeLayout(tree: DualTreeResponse, collapsedNodes?: Set<string>): LayoutResult {
  const nodes: LayoutNode[] = [];
  const links: LayoutLink[] = [];

  const hasFather = tree.paternal.length > 0;
  const hasMother = tree.maternal.length > 0;

  // ── 参考人 ──
  const refX = hasFather ? COLUMN_PAT : (hasMother ? COLUMN_MAT : 0);
  const refY = 0;
  nodes.push({ person: tree.reference, x: refX, y: refY, type: 'reference' });

  // ── 配偶区 ──
  const spouseStartIdx = nodes.length;

  tree.spouses.forEach((sf, i) => {
    const spX = refX + (NODE_W + SPOUSE_GAP) + i * (NODE_W + H_GAP);
    const spLinkType = sf.person.isFormerSpouse ? 'former-spouse' as const : 'spouse' as const;
    nodes.push({ person: sf.person, x: spX, y: refY, type: 'spouse' });
    links.push({ source: { x: refX, y: refY }, target: { x: spX, y: refY }, type: spLinkType });

    // 配偶的祖先链
    for (let ai = 0; ai < sf.ancestors.length; ai++) {
      const layer = sf.ancestors[ai];
      const layerY = -(ai + 1) * V_GAP;

      nodes.push({ person: layer.ancestor, x: spX, y: layerY, type: 'inlaw-parent' });

      if (ai === 0) {
        links.push({ source: { x: spX, y: layerY }, target: { x: spX, y: refY }, type: 'parent-child' });
      } else {
        links.push({ source: { x: spX, y: layerY }, target: { x: spX, y: -(ai) * V_GAP }, type: 'parent-child' });
      }

      let spouseOuterX = spX;
      if (layer.spouses[0]) {
        const layerSpouseX = spX + NODE_W + SPOUSE_GAP;
        spouseOuterX = layerSpouseX;
        nodes.push({ person: layer.spouses[0], x: layerSpouseX, y: layerY, type: 'spouse' });
        links.push({ source: { x: spX, y: layerY }, target: { x: layerSpouseX, y: layerY }, type: 'spouse' });

        layoutAncestorSpouseFamily(layer, layerSpouseX, layerY, 1, nodes, links);
      }

      const sibParentY = ai + 1 < sf.ancestors.length ? -((ai + 2) * V_GAP) : undefined;
      const sibParentX = ai + 1 < sf.ancestors.length ? spX : undefined;
      layoutCollateralFamilies(
        layer.siblings, spouseOuterX, layerY, 1,
        nodes, links, sibParentY, sibParentX,
      );
    }

    const sibAnchorY = sf.ancestors.length > 0 ? -V_GAP : undefined;
    const sibAnchorX = sf.ancestors.length > 0 ? spX : undefined;
    layoutCollateralFamilies(
      sf.siblings, spX, refY, 1,
      nodes, links, sibAnchorY, sibAnchorX,
    );
  });

  // ── 动态计算母系列位置 ──
  let colMat = COLUMN_MAT;
  if (hasFather && hasMother && nodes.length > spouseStartIdx) {
    const spouseMaxX = Math.max(...nodes.slice(spouseStartIdx).map(n => n.x));
    const affinityRightEdge = spouseMaxX + NODE_W / 2;
    colMat = Math.max(COLUMN_MAT, affinityRightEdge + H_GAP + NODE_W / 2);
  }

  // ── 父亲 & 母亲（gen=1） ──
  const fatherY = -V_GAP;

  if (hasFather) {
    nodes.push({ person: tree.paternal[0].ancestor, x: COLUMN_PAT, y: fatherY, type: 'ancestor' });
    links.push({ source: { x: COLUMN_PAT, y: fatherY }, target: { x: refX, y: refY }, type: 'parent-child' });
  }
  if (hasMother) {
    nodes.push({ person: tree.maternal[0].ancestor, x: colMat, y: fatherY, type: 'ancestor' });
    if (!hasFather) {
      links.push({ source: { x: colMat, y: fatherY }, target: { x: refX, y: refY }, type: 'parent-child' });
    }
  }
  if (hasFather && hasMother) {
    links.push({ source: { x: COLUMN_PAT, y: fatherY }, target: { x: colMat, y: fatherY }, type: 'spouse' });
  }

  // ── 父亲的兄弟姐妹 ──
  if (hasFather) {
    const parentAnchorY = tree.paternal.length > 1 ? -(2 * V_GAP) : undefined;
    const parentAnchorX = tree.paternal.length > 1 ? COLUMN_PAT : undefined;
    layoutCollateralFamilies(
      tree.paternal[0].siblings, COLUMN_PAT, fatherY, -1,
      nodes, links, parentAnchorY, parentAnchorX, collapsedNodes,
    );
  }

  // ── 母亲的兄弟姐妹 ──
  if (hasMother) {
    const parentAnchorY = tree.maternal.length > 1 ? -(2 * V_GAP) : undefined;
    const parentAnchorX = tree.maternal.length > 1 ? colMat : undefined;
    layoutCollateralFamilies(
      tree.maternal[0].siblings, colMat, fatherY, 1,
      nodes, links, parentAnchorY, parentAnchorX, collapsedNodes,
    );
  }

  // ── 高代父系祖先（gen>=2） ──
  for (let i = 1; i < tree.paternal.length; i++) {
    const layer = tree.paternal[i];
    const y = -(i + 1) * V_GAP;

    nodes.push({ person: layer.ancestor, x: COLUMN_PAT, y, type: 'ancestor' });

    const prevId = tree.paternal[i - 1].ancestor.id;
    const prevNode = nodes.find(n => n.person.id === prevId);
    if (prevNode) {
      links.push({ source: { x: COLUMN_PAT, y }, target: { x: prevNode.x, y: prevNode.y }, type: 'parent-child' });
    }

    let outerX = COLUMN_PAT;
    if (layer.spouses[0]) {
      const spouseX = COLUMN_PAT - (NODE_W + SPOUSE_GAP);
      outerX = spouseX;
      nodes.push({ person: layer.spouses[0], x: spouseX, y, type: 'spouse' });
      links.push({ source: { x: COLUMN_PAT, y }, target: { x: spouseX, y }, type: 'spouse' });

      layoutAncestorSpouseFamily(layer, spouseX, y, -1, nodes, links);
    }

    const parentAnchorY = i + 1 < tree.paternal.length ? -((i + 2) * V_GAP) : undefined;
    const parentAnchorX = i + 1 < tree.paternal.length ? COLUMN_PAT : undefined;
    layoutCollateralFamilies(
      layer.siblings, outerX, y, -1,
      nodes, links, parentAnchorY, parentAnchorX, collapsedNodes,
    );
  }

  // ── 高代母系祖先（gen>=2） ──
  for (let i = 1; i < tree.maternal.length; i++) {
    const layer = tree.maternal[i];
    const y = -(i + 1) * V_GAP;

    nodes.push({ person: layer.ancestor, x: colMat, y, type: 'ancestor' });

    const prevId = tree.maternal[i - 1].ancestor.id;
    const prevNode = nodes.find(n => n.person.id === prevId);
    if (prevNode) {
      links.push({ source: { x: colMat, y }, target: { x: prevNode.x, y: prevNode.y }, type: 'parent-child' });
    }

    let outerX = colMat;
    if (layer.spouses[0]) {
      const spouseX = colMat + (NODE_W + SPOUSE_GAP);
      outerX = spouseX;
      nodes.push({ person: layer.spouses[0], x: spouseX, y, type: 'spouse' });
      links.push({ source: { x: colMat, y }, target: { x: spouseX, y }, type: 'spouse' });

      layoutAncestorSpouseFamily(layer, spouseX, y, 1, nodes, links);
    }

    const parentAnchorY = i + 1 < tree.maternal.length ? -((i + 2) * V_GAP) : undefined;
    const parentAnchorX = i + 1 < tree.maternal.length ? colMat : undefined;
    layoutCollateralFamilies(
      layer.siblings, outerX, y, 1,
      nodes, links, parentAnchorY, parentAnchorX, collapsedNodes,
    );
  }

  // ── 参考人兄弟姐妹 ──
  if (hasFather) {
    layoutCollateralFamilies(
      tree.siblings, refX, refY, -1,
      nodes, links, fatherY, COLUMN_PAT, collapsedNodes,
    );
  } else {
    layoutCollateralFamilies(
      tree.siblings, refX, refY, -1,
      nodes, links, undefined, undefined, collapsedNodes,
    );
  }

  // ── 子女 ──
  if (tree.children.length > 0) {
    const childrenY = refY + V_GAP;
    // 有配偶时，子女居中于夫妻中点，连线也从中点引出
    const coupleAnchorX = tree.spouses.length > 0
      ? refX + (NODE_W + SPOUSE_GAP) / 2
      : refX;
    layoutDescendants(tree.children, coupleAnchorX, childrenY, coupleAnchorX, refY, nodes, links, collapsedNodes);
  }

  // 计算边界
  const xs = nodes.map(n => n.x);
  const ys = nodes.map(n => n.y);

  return {
    nodes,
    links,
    bounds: {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    },
  };
}
