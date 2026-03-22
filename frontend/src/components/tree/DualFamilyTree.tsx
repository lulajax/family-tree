import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { Person, TreeNode, Gender } from '../../types';
import { useFamilyStore } from '../../store/familyStore';

interface DualFamilyTreeProps {
  familyId: string;
  rootPersonId: string;
  onPersonClick: (person: Person) => void;
  onSetReference: (personId: string) => void;
  maxDepth?: number;
}

// 节点尺寸配置
const NODE_WIDTH = 160;
const NODE_HEIGHT = 80;
const LEVEL_HEIGHT = 120;
const SIBLING_SPACING = 180;

// 颜色配置
const COLORS = {
  male: '#3b82f6',
  female: '#ec4899',
  unknown: '#6b7280',
  reference: '#f59e0b',
  stroke: '#374151',
  link: '#9ca3af',
  background: '#f9fafb',
};

export const DualFamilyTree: React.FC<DualFamilyTreeProps> = ({
  familyId,
  rootPersonId,
  onPersonClick,
  onSetReference,
  maxDepth = 5,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    person: Person | null;
  }>({ x: 0, y: 0, person: null });
  
  const { persons, referencePersonId, getPersonById, getAncestors, getDescendants } = useFamilyStore();

  // 构建双系树数据结构
  const buildDualTree = useCallback((rootId: string): { paternal: TreeNode | null; maternal: TreeNode | null } => {
    const rootPerson = getPersonById(rootId);
    if (!rootPerson) return { paternal: null, maternal: null };

    // 构建父系树
    const buildPaternalTree = (personId: string, depth: number): TreeNode | null => {
      if (depth > maxDepth) return null;
      
      const person = getPersonById(personId);
      if (!person) return null;

      const node: TreeNode = {
        id: personId,
        person,
        depth,
        children: [],
      };

      // 只添加父系祖先
      if (person.fatherId) {
        const fatherNode = buildPaternalTree(person.fatherId, depth + 1);
        if (fatherNode) {
          fatherNode.parent = node;
          node.children!.push(fatherNode);
        }
      }

      // 添加父亲的兄弟姐妹
      if (person.fatherId) {
        const father = getPersonById(person.fatherId);
        if (father?.fatherId) {
          const grandfather = getPersonById(father.fatherId);
          if (grandfather?.childrenIds) {
            for (const uncleId of grandfather.childrenIds) {
              if (uncleId !== person.fatherId) {
                const uncleNode = buildPaternalTree(uncleId, depth + 1);
                if (uncleNode) {
                  uncleNode.parent = node;
                  node.children!.push(uncleNode);
                }
              }
            }
          }
        }
      }

      return node;
    };

    // 构建母系树
    const buildMaternalTree = (personId: string, depth: number): TreeNode | null => {
      if (depth > maxDepth) return null;
      
      const person = getPersonById(personId);
      if (!person) return null;

      const node: TreeNode = {
        id: personId,
        person,
        depth,
        children: [],
      };

      // 只添加母系祖先
      if (person.motherId) {
        const motherNode = buildMaternalTree(person.motherId, depth + 1);
        if (motherNode) {
          motherNode.parent = node;
          node.children!.push(motherNode);
        }
      }

      // 添加母亲的兄弟姐妹
      if (person.motherId) {
        const mother = getPersonById(person.motherId);
        if (mother?.motherId) {
          const grandmother = getPersonById(mother.motherId);
          if (grandmother?.childrenIds) {
            for (const auntId of grandmother.childrenIds) {
              if (auntId !== person.motherId) {
                const auntNode = buildMaternalTree(auntId, depth + 1);
                if (auntNode) {
                  auntNode.parent = node;
                  node.children!.push(auntNode);
                }
              }
            }
          }
        }
      }

      return node;
    };

    const paternalRoot = buildPaternalTree(rootId, 0);
    const maternalRoot = buildMaternalTree(rootId, 0);

    return { paternal: paternalRoot, maternal: maternalRoot };
  }, [getPersonById, maxDepth]);

  // 计算树布局
  const calculateTreeLayout = useCallback((
    paternalRoot: TreeNode | null,
    maternalRoot: TreeNode | null
  ): { nodes: TreeNode[]; links: { source: TreeNode; target: TreeNode }[] } => {
    const nodes: TreeNode[] = [];
    const links: { source: TreeNode; target: TreeNode }[] = [];

    // 使用D3的树布局
    const treeLayout = d3.tree<TreeNode>()
      .nodeSize([SIBLING_SPACING, LEVEL_HEIGHT])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.2));

    // 布局父系树（左侧，x为负）
    if (paternalRoot) {
      const paternalHierarchy = d3.hierarchy(paternalRoot);
      treeLayout(paternalHierarchy);

      paternalHierarchy.each((d) => {
        const node = d.data;
        // 父系在左侧，x坐标为负
        node.x = -(d.x || 0) - NODE_WIDTH / 2 - 20;
        node.y = (d.y || 0);
        nodes.push(node);

        if (d.parent) {
          links.push({
            source: d.parent.data,
            target: node,
          });
        }
      });
    }

    // 布局母系树（右侧，x为正）
    if (maternalRoot) {
      const maternalHierarchy = d3.hierarchy(maternalRoot);
      treeLayout(maternalHierarchy);

      maternalHierarchy.each((d) => {
        const node = d.data;
        // 母系在右侧，x坐标为正
        node.x = (d.x || 0) + NODE_WIDTH / 2 + 20;
        node.y = (d.y || 0);
        nodes.push(node);

        if (d.parent) {
          links.push({
            source: d.parent.data,
            target: node,
          });
        }
      });
    }

    return { nodes, links };
  }, []);

  // 渲染SVG
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { paternal, maternal } = buildDualTree(rootPersonId);
    const { nodes, links } = calculateTreeLayout(paternal, maternal);

    if (nodes.length === 0) return;

    // 计算边界
    const xExtent = d3.extent(nodes, d => d.x!) as [number, number];
    const yExtent = d3.extent(nodes, d => d.y!) as [number, number];
    
    const width = Math.max(800, xExtent[1] - xExtent[0] + NODE_WIDTH * 2);
    const height = Math.max(600, yExtent[1] - yExtent[0] + NODE_HEIGHT * 2);

    // 设置SVG尺寸
    svg.attr('width', width).attr('height', height);

    // 创建主容器组，支持缩放平移
    const g = svg.append('g')
      .attr('transform', `translate(${width / 2}, ${NODE_HEIGHT})`);

    // 添加缩放行为
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);
    // 初始缩放
    svg.call(zoom.transform as any, d3.zoomIdentity.translate(width / 2, 80).scale(0.8));

    // 定义连接线生成器
    const linkGenerator = d3.linkVertical<{
      source: { x: number; y: number };
      target: { x: number; y: number };
    }, { x: number; y: number }>()
      .x(d => d.x)
      .y(d => d.y);

    // 绘制连接线
    const linkSelection = g.selectAll('.link')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d => linkGenerator({
        source: { x: d.source.x!, y: d.source.y! + NODE_HEIGHT / 2 },
        target: { x: d.target.x!, y: d.target.y! - NODE_HEIGHT / 2 },
      })!)
      .attr('fill', 'none')
      .attr('stroke', COLORS.link)
      .attr('stroke-width', 1.5);

    // 创建节点组
    const nodeGroups = g.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x! - NODE_WIDTH / 2}, ${d.y! - NODE_HEIGHT / 2})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onPersonClick(d.person);
      })
      .on('contextmenu', (event, d) => {
        event.preventDefault();
        setContextMenu({
          x: event.pageX,
          y: event.pageY,
          person: d.person,
        });
      });

    // 绘制节点矩形
    nodeGroups.append('rect')
      .attr('width', NODE_WIDTH)
      .attr('height', NODE_HEIGHT)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', d => {
        if (d.person.id === referencePersonId) return COLORS.reference;
        switch (d.person.gender) {
          case Gender.MALE: return COLORS.male;
          case Gender.FEMALE: return COLORS.female;
          default: return COLORS.unknown;
        }
      })
      .attr('stroke', COLORS.stroke)
      .attr('stroke-width', d => d.person.id === referencePersonId ? 3 : 1)
      .attr('opacity', 0.9);

    // 添加头像占位
    nodeGroups.append('circle')
      .attr('cx', 30)
      .attr('cy', NODE_HEIGHT / 2)
      .attr('r', 25)
      .attr('fill', '#fff')
      .attr('stroke', COLORS.stroke)
      .attr('stroke-width', 1);

    // 添加姓名
    nodeGroups.append('text')
      .attr('x', 65)
      .attr('y', NODE_HEIGHT / 2 - 5)
      .attr('text-anchor', 'start')
      .attr('fill', '#fff')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .text(d => d.person.name);

    // 添加生卒年份
    nodeGroups.append('text')
      .attr('x', 65)
      .attr('y', NODE_HEIGHT / 2 + 15)
      .attr('text-anchor', 'start')
      .attr('fill', 'rgba(255,255,255,0.8)')
      .attr('font-size', '11px')
      .text(d => {
        const birth = d.person.birthDate ? new Date(d.person.birthDate).getFullYear() : '?';
        const death = d.person.deathDate ? new Date(d.person.deathDate).getFullYear() : '';
        return death ? `${birth}-${death}` : `${birth}-`;
      });

    // 添加代际标识
    nodeGroups.append('text')
      .attr('x', NODE_WIDTH - 8)
      .attr('y', 16)
      .attr('text-anchor', 'end')
      .attr('fill', 'rgba(255,255,255,0.7)')
      .attr('font-size', '10px')
      .text(d => `第${d.person.generation}代`);

    // 添加参考点标记
    nodeGroups.filter(d => d.person.id === referencePersonId)
      .append('circle')
      .attr('cx', NODE_WIDTH - 12)
      .attr('cy', NODE_HEIGHT - 12)
      .attr('r', 6)
      .attr('fill', '#fff')
      .attr('stroke', COLORS.reference)
      .attr('stroke-width', 2);

    // 添加动画
    nodeGroups
      .attr('opacity', 0)
      .transition()
      .duration(500)
      .delay((d, i) => i * 50)
      .attr('opacity', 1);

    linkSelection
      .attr('opacity', 0)
      .transition()
      .duration(500)
      .delay((d, i) => i * 30 + 200)
      .attr('opacity', 1);

  }, [buildDualTree, calculateTreeLayout, rootPersonId, referencePersonId, onPersonClick]);

  // 关闭右键菜单
  useEffect(() => {
    const handleClick = () => setContextMenu(prev => ({ ...prev, person: null }));
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-gray-50 overflow-hidden">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ minHeight: '600px' }}
      />
      
      {/* 控制按钮 */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={() => {
            if (svgRef.current) {
              const svg = d3.select(svgRef.current);
              svg.transition().duration(500).call(
                (d3.zoom() as any).transform,
                d3.zoomIdentity.translate(400, 80).scale(0.8)
              );
            }
          }}
          className="px-3 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow text-sm font-medium"
        >
          重置视图
        </button>
      </div>

      {/* 图例 */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md p-3">
        <h4 className="text-sm font-semibold mb-2">图例</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.male }} />
            <span>男性</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.female }} />
            <span>女性</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.reference }} />
            <span>参考点</span>
          </div>
        </div>
      </div>

      {/* 右键菜单 */}
      {contextMenu.person && (
        <div
          className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 min-w-[150px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="px-3 py-2 border-b border-gray-100">
            <span className="font-semibold text-sm">{contextMenu.person.name}</span>
          </div>
          <button
            onClick={() => {
              onPersonClick(contextMenu.person!);
              setContextMenu(prev => ({ ...prev, person: null }));
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
          >
            查看详情
          </button>
          <button
            onClick={() => {
              onSetReference(contextMenu.person!.id);
              setContextMenu(prev => ({ ...prev, person: null }));
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
          >
            设为参考点
          </button>
        </div>
      )}
    </div>
  );
};

export default DualFamilyTree;
