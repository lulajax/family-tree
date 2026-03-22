import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import type { DualTreeResponse, PersonNode, CollateralFamily, DescendantNode } from '../../types';
import { DeleteConfirmDialog } from '../person/DeleteConfirmDialog';
import { PersonEditDialog } from '../person/PersonEditDialog';

interface DualFamilyTreeProps {
  dualTree: DualTreeResponse;
  onPersonClick: (person: PersonNode) => void;
  onSetReference: (personId: string) => void;
  onAddRelative: (person: PersonNode) => void;
  onDelete?: (person: PersonNode) => Promise<void>;
  onEdit?: (person: PersonNode, data: {
    name: string;
    gender: 'male' | 'female' | 'unknown';
    birth_date?: string;
    death_date?: string;
    bio?: string;
  }) => Promise<void>;
}

// ── 常量 ──
const NODE_W = 150;
const NODE_H = 64;
const H_GAP = 40;   // 同层节点横间距
const V_GAP = 120;  // 层级间距
const HALF_GAP = 140; // 中心到父系/母系主列的半间距
const SPOUSE_GAP = 20; // 夫妻节点间距
const COLUMN_PAT = -(HALF_GAP + NODE_W / 2); // 父系主列 X
const COLUMN_MAT = +(HALF_GAP + NODE_W / 2); // 母系主列 X

const COLORS = {
  male: '#3b82f6',
  female: '#ec4899',
  unknown: '#6b7280',
  reference: '#f59e0b',
  paternalBg: 'rgba(59,130,246,0.06)',
  maternalBg: 'rgba(236,72,153,0.06)',
  affinityBg: 'rgba(245,158,11,0.06)',
  link: '#cbd5e1',
};

interface LayoutNode {
  person: PersonNode;
  x: number;
  y: number;
  type: 'ancestor' | 'spouse' | 'sibling' | 'reference' | 'child'
    | 'collateral-spouse' | 'collateral-child' | 'inlaw-parent' | 'inlaw-sibling';
}

interface LayoutLink {
  source: { x: number; y: number };
  target: { x: number; y: number };
  type: 'parent-child' | 'spouse';
}

export const DualFamilyTree: React.FC<DualFamilyTreeProps> = ({
  dualTree,
  onPersonClick,
  onSetReference,
  onAddRelative,
  onDelete,
  onEdit,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; person: PersonNode | null;
  }>({ x: 0, y: 0, person: null });
  const [deleteTarget, setDeleteTarget] = useState<PersonNode | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editTarget, setEditTarget] = useState<PersonNode | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // ── 计算布局 ──
    const { nodes, links, bounds } = computeLayout(dualTree);

    const width = bounds.maxX - bounds.minX + NODE_W * 2 + 100;
    const height = bounds.maxY - bounds.minY + NODE_H * 2 + 100;
    const offsetX = -bounds.minX + NODE_W / 2 + 50;
    const offsetY = -bounds.minY + NODE_H / 2 + 50;

    svg.attr('width', '100%').attr('height', '100%');

    const g = svg.append('g');

    // ── 缩放 ──
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom as never);

    const initialScale = Math.min(
      (svgRef.current.clientWidth || 800) / width,
      (svgRef.current.clientHeight || 600) / height,
      1
    );
    svg.call(
      (zoom.transform as never),
      d3.zoomIdentity
        .translate(
          ((svgRef.current.clientWidth || 800) - width * initialScale) / 2 + offsetX * initialScale,
          offsetY * initialScale + 40
        )
        .scale(initialScale)
    );

    // ── 背景区域 ──
    const hasBothSides = dualTree.paternal.length > 0 && dualTree.maternal.length > 0;

    // 父系区域
    const pNodes = nodes.filter((n) => n.person.side === 'paternal');
    if (pNodes.length > 0) {
      const minX = Math.min(...pNodes.map((n) => n.x)) - NODE_W / 2 - 20;
      const minY = Math.min(...pNodes.map((n) => n.y)) - NODE_H / 2 - 40;
      const maxX = hasBothSides
        ? Math.min(-10, Math.max(...pNodes.map((n) => n.x)) + NODE_W / 2 + 20)
        : Math.max(...pNodes.map((n) => n.x)) + NODE_W / 2 + 20;
      const maxY = Math.max(...pNodes.map((n) => n.y)) + NODE_H / 2 + 20;
      g.append('rect')
        .attr('x', minX).attr('y', minY)
        .attr('width', maxX - minX).attr('height', maxY - minY)
        .attr('rx', 16).attr('fill', COLORS.paternalBg).attr('stroke', 'rgba(59,130,246,0.15)')
        .attr('stroke-width', 1);
      g.append('text')
        .attr('x', (minX + maxX) / 2).attr('y', minY + 20)
        .attr('text-anchor', 'middle').attr('fill', '#3b82f6')
        .attr('font-size', '14px').attr('font-weight', '600').attr('opacity', 0.7)
        .text('父系血统');
    }

    // 母系区域
    const mNodes = nodes.filter((n) => n.person.side === 'maternal');
    if (mNodes.length > 0) {
      const minX = hasBothSides
        ? Math.max(10, Math.min(...mNodes.map((n) => n.x)) - NODE_W / 2 - 20)
        : Math.min(...mNodes.map((n) => n.x)) - NODE_W / 2 - 20;
      const minY = Math.min(...mNodes.map((n) => n.y)) - NODE_H / 2 - 40;
      const maxX = Math.max(...mNodes.map((n) => n.x)) + NODE_W / 2 + 20;
      const maxY = Math.max(...mNodes.map((n) => n.y)) + NODE_H / 2 + 20;
      g.append('rect')
        .attr('x', minX).attr('y', minY)
        .attr('width', maxX - minX).attr('height', maxY - minY)
        .attr('rx', 16).attr('fill', COLORS.maternalBg).attr('stroke', 'rgba(236,72,153,0.15)')
        .attr('stroke-width', 1);
      g.append('text')
        .attr('x', (minX + maxX) / 2).attr('y', minY + 20)
        .attr('text-anchor', 'middle').attr('fill', '#ec4899')
        .attr('font-size', '14px').attr('font-weight', '600').attr('opacity', 0.7)
        .text('母系血统');
    }

    // 姻亲区域
    const aNodes = nodes.filter((n) => n.person.side === 'affinity');
    if (aNodes.length > 0) {
      const minX = Math.min(...aNodes.map((n) => n.x)) - NODE_W / 2 - 20;
      const minY = Math.min(...aNodes.map((n) => n.y)) - NODE_H / 2 - 40;
      const maxX = Math.max(...aNodes.map((n) => n.x)) + NODE_W / 2 + 20;
      const maxY = Math.max(...aNodes.map((n) => n.y)) + NODE_H / 2 + 20;
      g.append('rect')
        .attr('x', minX).attr('y', minY)
        .attr('width', maxX - minX).attr('height', maxY - minY)
        .attr('rx', 16).attr('fill', COLORS.affinityBg).attr('stroke', 'rgba(245,158,11,0.15)')
        .attr('stroke-width', 1);
      g.append('text')
        .attr('x', (minX + maxX) / 2).attr('y', minY + 20)
        .attr('text-anchor', 'middle').attr('fill', '#d97706')
        .attr('font-size', '14px').attr('font-weight', '600').attr('opacity', 0.7)
        .text('姻亲');
    }

    // ── 中心分隔线 ──
    if (hasBothSides) {
      g.append('line')
        .attr('x1', 0).attr('y1', bounds.minY - NODE_H - 40)
        .attr('x2', 0).attr('y2', bounds.maxY + NODE_H + 20)
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '8,4')
        .attr('opacity', 0.5);
    }

    // ── 亲子连接线（贝塞尔曲线） ──
    g.selectAll('.link-pc')
      .data(links.filter((l) => l.type === 'parent-child'))
      .enter()
      .append('path')
      .attr('d', (d) => {
        const mx = (d.source.x + d.target.x) / 2;
        const my = (d.source.y + d.target.y) / 2;
        return `M${d.source.x},${d.source.y + NODE_H / 2} Q${d.source.x},${my} ${mx},${my} Q${d.target.x},${my} ${d.target.x},${d.target.y - NODE_H / 2}`;
      })
      .attr('fill', 'none')
      .attr('stroke', COLORS.link)
      .attr('stroke-width', 1.5);

    // ── 配偶连接线（水平虚线） ──
    g.selectAll('.link-spouse')
      .data(links.filter((l) => l.type === 'spouse'))
      .enter()
      .append('line')
      .attr('x1', (d) => d.source.x + NODE_W / 2)
      .attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x - NODE_W / 2)
      .attr('y2', (d) => d.target.y)
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '6,3');

    // ── 节点 ──
    const nodeGroups = g.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('transform', (d) => `translate(${d.x - NODE_W / 2}, ${d.y - NODE_H / 2})`)
      .style('cursor', 'pointer')
      .on('click', (_event, d) => onPersonClick(d.person))
      .on('contextmenu', (event, d) => {
        event.preventDefault();
        setContextMenu({ x: event.pageX, y: event.pageY, person: d.person });
      });

    // 卡片背景
    nodeGroups.append('rect')
      .attr('width', NODE_W).attr('height', NODE_H)
      .attr('rx', 10).attr('ry', 10)
      .attr('fill', (d) => {
        if (d.person.title === '本人') return COLORS.reference;
        return d.person.gender === 'male' ? COLORS.male
          : d.person.gender === 'female' ? COLORS.female
          : COLORS.unknown;
      })
      .attr('stroke', (d) => d.person.title === '本人' ? '#d97706' : 'rgba(0,0,0,0.1)')
      .attr('stroke-width', (d) => d.person.title === '本人' ? 2.5 : 1)
      .attr('opacity', 0.92);

    // 姓名
    nodeGroups.append('text')
      .attr('x', NODE_W / 2).attr('y', 24)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff').attr('font-size', '13px').attr('font-weight', 'bold')
      .text((d) => d.person.name);

    // 称谓
    nodeGroups.append('text')
      .attr('x', NODE_W / 2).attr('y', 44)
      .attr('text-anchor', 'middle')
      .attr('fill', 'rgba(255,255,255,0.85)').attr('font-size', '11px')
      .text((d) => d.person.title);

    // 生卒年
    nodeGroups.append('text')
      .attr('x', NODE_W / 2).attr('y', 58)
      .attr('text-anchor', 'middle')
      .attr('fill', 'rgba(255,255,255,0.6)').attr('font-size', '9px')
      .text((d) => {
        const b = d.person.birth_date ? d.person.birth_date.substring(0, 4) : '?';
        const dd = d.person.death_date ? d.person.death_date.substring(0, 4) : '';
        return dd ? `${b}-${dd}` : `${b}-`;
      });

    // ── "+"按钮 ──
    const addBtnGroup = nodeGroups.append('g')
      .attr('transform', `translate(${NODE_W - 8}, -8)`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onAddRelative(d.person);
      });

    addBtnGroup.append('circle')
      .attr('r', 10)
      .attr('fill', 'white')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0);

    addBtnGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', '#3b82f6')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('opacity', 0)
      .text('+');

    // Hover 显示 "+" 按钮
    nodeGroups.on('mouseenter', function () {
      d3.select(this).selectAll('circle').transition().duration(150).attr('opacity', 1);
      d3.select(this).selectAll('text').filter(function () {
        return d3.select(this).text() === '+';
      }).transition().duration(150).attr('opacity', 1);
    }).on('mouseleave', function () {
      d3.select(this).selectAll('circle').transition().duration(150).attr('opacity', 0);
      d3.select(this).selectAll('text').filter(function () {
        return d3.select(this).text() === '+';
      }).transition().duration(150).attr('opacity', 0);
    });

    // 入场动画
    nodeGroups.style('opacity', 0)
      .transition().duration(400).delay((_, i) => i * 30)
      .style('opacity', 1);

  }, [dualTree, onPersonClick, onSetReference, onAddRelative]);

  // 关闭右键菜单
  useEffect(() => {
    const close = () => setContextMenu((prev) => ({ ...prev, person: null }));
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  return (
    <div className="relative w-full h-full bg-gray-50 overflow-hidden">
      <svg ref={svgRef} className="w-full h-full" />

      {/* 图例 */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md p-3 text-xs space-y-1.5">
        <div className="font-semibold mb-1">图例</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ background: COLORS.male }} /><span>男性</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ background: COLORS.female }} /><span>女性</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ background: COLORS.reference }} /><span>焦点人物</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-3 h-3 rounded" style={{ background: COLORS.paternalBg, border: '1px solid rgba(59,130,246,0.3)' }} /><span>父系血统</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ background: COLORS.maternalBg, border: '1px solid rgba(236,72,153,0.3)' }} /><span>母系血统</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ background: COLORS.affinityBg, border: '1px solid rgba(245,158,11,0.3)' }} /><span>姻亲</span>
        </div>
      </div>

      {/* 右键菜单 */}
      {contextMenu.person && (
        <div
          className="fixed bg-white rounded-lg shadow-xl border py-1 z-50 min-w-[150px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="px-3 py-2 border-b text-sm font-semibold">{contextMenu.person.name}</div>
          <button
            onClick={() => { onPersonClick(contextMenu.person!); setContextMenu((p) => ({ ...p, person: null })); }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
          >
            查看详情
          </button>
          {onEdit && (
            <button
              onClick={() => { setEditTarget(contextMenu.person!); setContextMenu((p) => ({ ...p, person: null })); }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
            >
              编辑信息
            </button>
          )}
          <button
            onClick={() => { onSetReference(contextMenu.person!.id); setContextMenu((p) => ({ ...p, person: null })); }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
          >
            设为焦点
          </button>
          <button
            onClick={() => { onAddRelative(contextMenu.person!); setContextMenu((p) => ({ ...p, person: null })); }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
          >
            添加亲属
          </button>
          {onDelete && (
            <>
              <div className="border-t my-1" />
              <button
                onClick={() => { setDeleteTarget(contextMenu.person!); setContextMenu((p) => ({ ...p, person: null })); }}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                删除人物
              </button>
            </>
          )}
        </div>
      )}

      {/* 删除确认对话框 */}
      {deleteTarget && onDelete && (
        <DeleteConfirmDialog
          person={deleteTarget}
          isDeleting={isDeleting}
          onCancel={() => { setDeleteTarget(null); setIsDeleting(false); }}
          onConfirm={async () => {
            setIsDeleting(true);
            try {
              await onDelete(deleteTarget);
              setDeleteTarget(null);
            } catch {
              setIsDeleting(false);
            }
          }}
        />
      )}

      {/* 编辑对话框 */}
      {editTarget && onEdit && (
        <PersonEditDialog
          person={editTarget}
          isSaving={isEditing}
          onCancel={() => { setEditTarget(null); setIsEditing(false); }}
          onConfirm={async (data) => {
            setIsEditing(true);
            try {
              await onEdit(editTarget, data);
              setEditTarget(null);
            } catch {
              setIsEditing(false);
            }
          }}
        />
      )}
    </div>
  );
};

// ── 布局算法 ──

// ── 递归后代布局工具 ──

/** 测量一个后代子树需要的水平宽度 */
function measureDescendant(desc: DescendantNode): number {
  const unitW = desc.spouse ? (2 * NODE_W + SPOUSE_GAP) : NODE_W;
  if (desc.children.length === 0) return unitW;

  let childrenTotalW = 0;
  for (let i = 0; i < desc.children.length; i++) {
    if (i > 0) childrenTotalW += H_GAP;
    childrenTotalW += measureDescendant(desc.children[i]);
  }

  return Math.max(unitW, childrenTotalW);
}

/** 递归布局后代树 */
function layoutDescendants(
  descendants: DescendantNode[],
  centerX: number,
  y: number,
  parentX: number,
  parentY: number,
  nodes: LayoutNode[],
  links: LayoutLink[],
) {
  if (descendants.length === 0) return;

  // 计算总宽度
  let totalW = 0;
  for (let i = 0; i < descendants.length; i++) {
    if (i > 0) totalW += H_GAP;
    totalW += measureDescendant(descendants[i]);
  }

  let curX = centerX - totalW / 2;

  for (const desc of descendants) {
    const w = measureDescendant(desc);
    const descCenterX = curX + w / 2;

    // 人物位置（如果有配偶，往左偏让夫妻居中）
    let personX: number;
    if (desc.spouse) {
      personX = descCenterX - (NODE_W + SPOUSE_GAP) / 2;
    } else {
      personX = descCenterX;
    }

    nodes.push({ person: desc.person, x: personX, y, type: 'child' });
    links.push({ source: { x: parentX, y: parentY }, target: { x: personX, y }, type: 'parent-child' });

    if (desc.spouse) {
      const spouseX = personX + NODE_W + SPOUSE_GAP;
      nodes.push({ person: desc.spouse, x: spouseX, y, type: 'spouse' });
      links.push({ source: { x: personX, y }, target: { x: spouseX, y }, type: 'spouse' });
    }

    // 递归布局子女
    if (desc.children.length > 0) {
      layoutDescendants(desc.children, descCenterX, y + V_GAP, personX, y, nodes, links);
    }

    curX += w + H_GAP;
  }
}

/**
 * 布局旁系家庭：从基准位置向外扩展，返回占用的总宽度
 */
function layoutCollateralFamilies(
  families: CollateralFamily[],
  baseX: number,
  y: number,
  direction: 1 | -1,  // 1=向右 -1=向左
  nodes: LayoutNode[],
  links: LayoutLink[],
  parentAnchorY?: number,
  parentAnchorX?: number,
): number {
  let offset = 0;
  for (const cf of families) {
    // 计算这个旁系家庭需要的宽度
    const selfUnitW = cf.spouse ? (2 * NODE_W + SPOUSE_GAP) : NODE_W;
    let childrenW = 0;
    for (let i = 0; i < cf.children.length; i++) {
      if (i > 0) childrenW += H_GAP;
      childrenW += measureDescendant(cf.children[i]);
    }
    const familyW = Math.max(selfUnitW, childrenW);
    const familyUnits = Math.ceil(familyW / (NODE_W + H_GAP));

    const sibX = baseX + direction * ((NODE_W + H_GAP) * offset + NODE_W / 2 + H_GAP + familyW / 2);
    // 调整：让 person 位于 family 中心
    const personX = cf.spouse
      ? sibX - direction * (NODE_W + SPOUSE_GAP) / 2
      : sibX;

    nodes.push({ person: cf.person, x: personX, y, type: 'sibling' });

    // 连到父级祖先
    if (parentAnchorY !== undefined && parentAnchorX !== undefined) {
      links.push({ source: { x: parentAnchorX, y: parentAnchorY }, target: { x: personX, y }, type: 'parent-child' });
    }

    // 旁系的配偶（更外侧）
    if (cf.spouse) {
      const spouseX = personX + direction * (NODE_W + SPOUSE_GAP);
      nodes.push({ person: cf.spouse, x: spouseX, y, type: 'collateral-spouse' });
      links.push({ source: { x: personX, y }, target: { x: spouseX, y }, type: 'spouse' });
    }

    // 旁系的子女（递归后代布局）
    if (cf.children.length > 0) {
      const childY = y + V_GAP * 0.7;
      layoutDescendants(cf.children, sibX, childY, personX, y, nodes, links);
    }

    offset += familyUnits;
  }
  return offset;
}

/**
 * 布局某个祖先的配偶的父母和兄弟姐妹
 * spouseX: 配偶节点的X坐标
 * y: 配偶节点的Y坐标
 * direction: 父母放置方向 (-1=更往左, 1=更往右)
 */
function layoutAncestorSpouseFamily(
  layer: { spouseParents: PersonNode[]; spouseSiblings: CollateralFamily[]; spouse: PersonNode | null },
  spouseX: number,
  y: number,
  direction: 1 | -1,
  nodes: LayoutNode[],
  links: LayoutLink[],
) {
  if (!layer.spouse) return;

  // 配偶的父母：在配偶上方，Y 偏移 0.5 个 V_GAP（不与主祖先链同层）
  const parentY = y - V_GAP * 0.5;
  if (layer.spouseParents.length > 0) {
    layer.spouseParents.forEach((parent, pi) => {
      const parentX = spouseX + direction * pi * (NODE_W + SPOUSE_GAP);
      nodes.push({ person: parent, x: parentX, y: parentY, type: 'inlaw-parent' });
      links.push({ source: { x: parentX, y: parentY }, target: { x: spouseX, y }, type: 'parent-child' });
    });
    // 父母之间配偶连线
    if (layer.spouseParents.length === 2) {
      const p1X = spouseX;
      const p2X = spouseX + direction * (NODE_W + SPOUSE_GAP);
      links.push({ source: { x: p1X, y: parentY }, target: { x: p2X, y: parentY }, type: 'spouse' });
    }
  }

  // 配偶的兄弟姐妹：从配偶位置向外延伸
  if (layer.spouseSiblings.length > 0) {
    layoutCollateralFamilies(
      layer.spouseSiblings, spouseX, y, direction,
      nodes, links,
      layer.spouseParents.length > 0 ? parentY : undefined,
      layer.spouseParents.length > 0 ? spouseX : undefined
    );
  }
}

function computeLayout(tree: DualTreeResponse): {
  nodes: LayoutNode[];
  links: LayoutLink[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
} {
  const nodes: LayoutNode[] = [];
  const links: LayoutLink[] = [];

  const hasFather = tree.paternal.length > 0;
  const hasMother = tree.maternal.length > 0;

  // ── 参考人 ──
  const refX = hasFather ? COLUMN_PAT : (hasMother ? COLUMN_MAT : 0);
  const refY = 0;
  nodes.push({ person: tree.reference, x: refX, y: refY, type: 'reference' });

  // ── 先布局配偶区，测量右边界以动态确定母系列位置 ──
  const spouseStartIdx = nodes.length;

  tree.spouses.forEach((sf, i) => {
    const spX = refX + (NODE_W + SPOUSE_GAP) + i * (NODE_W + H_GAP);
    nodes.push({ person: sf.person, x: spX, y: refY, type: 'spouse' });
    links.push({ source: { x: refX, y: refY }, target: { x: spX, y: refY }, type: 'spouse' });

    // 配偶的祖先链（岳父→岳祖父→...完整链）
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
      if (layer.spouse) {
        const layerSpouseX = spX + NODE_W + SPOUSE_GAP;
        spouseOuterX = layerSpouseX;
        nodes.push({ person: layer.spouse, x: layerSpouseX, y: layerY, type: 'spouse' });
        links.push({ source: { x: spX, y: layerY }, target: { x: layerSpouseX, y: layerY }, type: 'spouse' });

        layoutAncestorSpouseFamily(layer, layerSpouseX, layerY, 1, nodes, links);
      }

      const sibParentY = ai + 1 < sf.ancestors.length ? -((ai + 2) * V_GAP) : undefined;
      const sibParentX = ai + 1 < sf.ancestors.length ? spX : undefined;
      layoutCollateralFamilies(
        layer.siblings, spouseOuterX, layerY, 1,
        nodes, links, sibParentY, sibParentX
      );
    }

    const sibAnchorY = sf.ancestors.length > 0 ? -V_GAP : undefined;
    const sibAnchorX = sf.ancestors.length > 0 ? spX : undefined;
    layoutCollateralFamilies(
      sf.siblings, spX, refY, 1,
      nodes, links, sibAnchorY, sibAnchorX
    );
  });

  // ── 动态计算母系列位置：避免与姻亲区域重叠 ──
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

  // ── 父亲的兄弟姐妹（叔/姑）→ 向左延伸（CollateralFamily） ──
  if (hasFather) {
    const parentAnchorY = tree.paternal.length > 1 ? -(2 * V_GAP) : undefined;
    const parentAnchorX = tree.paternal.length > 1 ? COLUMN_PAT : undefined;
    layoutCollateralFamilies(
      tree.paternal[0].siblings, COLUMN_PAT, fatherY, -1,
      nodes, links, parentAnchorY, parentAnchorX
    );
  }

  // ── 母亲的兄弟姐妹（舅/姨）→ 向右延伸（CollateralFamily） ──
  if (hasMother) {
    const parentAnchorY = tree.maternal.length > 1 ? -(2 * V_GAP) : undefined;
    const parentAnchorX = tree.maternal.length > 1 ? colMat : undefined;
    layoutCollateralFamilies(
      tree.maternal[0].siblings, colMat, fatherY, 1,
      nodes, links, parentAnchorY, parentAnchorX
    );
  }

  // ── 高代父系祖先（gen≥2） ──
  for (let i = 1; i < tree.paternal.length; i++) {
    const layer = tree.paternal[i];
    const y = -(i + 1) * V_GAP;

    nodes.push({ person: layer.ancestor, x: COLUMN_PAT, y, type: 'ancestor' });

    const prevId = tree.paternal[i - 1].ancestor.id;
    const prevNode = nodes.find((n) => n.person.id === prevId);
    if (prevNode) {
      links.push({ source: { x: COLUMN_PAT, y }, target: { x: prevNode.x, y: prevNode.y }, type: 'parent-child' });
    }

    let outerX = COLUMN_PAT;
    if (layer.spouse) {
      const spouseX = COLUMN_PAT - (NODE_W + SPOUSE_GAP);
      outerX = spouseX;
      nodes.push({ person: layer.spouse, x: spouseX, y, type: 'spouse' });
      links.push({ source: { x: COLUMN_PAT, y }, target: { x: spouseX, y }, type: 'spouse' });

      layoutAncestorSpouseFamily(layer, spouseX, y, -1, nodes, links);
    }

    const parentAnchorY = i + 1 < tree.paternal.length ? -((i + 2) * V_GAP) : undefined;
    const parentAnchorX = i + 1 < tree.paternal.length ? COLUMN_PAT : undefined;
    layoutCollateralFamilies(
      layer.siblings, outerX, y, -1,
      nodes, links, parentAnchorY, parentAnchorX
    );
  }

  // ── 高代母系祖先（gen≥2） ──
  for (let i = 1; i < tree.maternal.length; i++) {
    const layer = tree.maternal[i];
    const y = -(i + 1) * V_GAP;

    nodes.push({ person: layer.ancestor, x: colMat, y, type: 'ancestor' });

    const prevId = tree.maternal[i - 1].ancestor.id;
    const prevNode = nodes.find((n) => n.person.id === prevId);
    if (prevNode) {
      links.push({ source: { x: colMat, y }, target: { x: prevNode.x, y: prevNode.y }, type: 'parent-child' });
    }

    let outerX = colMat;
    if (layer.spouse) {
      const spouseX = colMat + (NODE_W + SPOUSE_GAP);
      outerX = spouseX;
      nodes.push({ person: layer.spouse, x: spouseX, y, type: 'spouse' });
      links.push({ source: { x: colMat, y }, target: { x: spouseX, y }, type: 'spouse' });

      layoutAncestorSpouseFamily(layer, spouseX, y, 1, nodes, links);
    }

    const parentAnchorY = i + 1 < tree.maternal.length ? -((i + 2) * V_GAP) : undefined;
    const parentAnchorX = i + 1 < tree.maternal.length ? colMat : undefined;
    layoutCollateralFamilies(
      layer.siblings, outerX, y, 1,
      nodes, links, parentAnchorY, parentAnchorX
    );
  }

  // ── 参考人兄弟姐妹（CollateralFamily，向左排列） ──
  if (hasFather) {
    layoutCollateralFamilies(
      tree.siblings, refX, refY, -1,
      nodes, links, hasFather ? fatherY : undefined, hasFather ? COLUMN_PAT : undefined
    );
  } else {
    layoutCollateralFamilies(
      tree.siblings, refX, refY, -1,
      nodes, links, undefined, undefined
    );
  }

  // ── 子女（参考人下方，递归后代树） ──
  if (tree.children.length > 0) {
    const childrenY = refY + V_GAP;
    layoutDescendants(tree.children, refX, childrenY, refX, refY, nodes, links);
  }

  // 计算边界
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);

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

export default DualFamilyTree;
