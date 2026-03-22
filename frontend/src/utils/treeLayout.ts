/**
 * 双系族谱系统 - D3树布局工具
 */

import * as d3 from 'd3';
import type { TreeNode, TreeLayout, LayoutNode, LayoutLink, Person } from '../types';

// ==================== 配置常量 ====================

export const TREE_CONFIG = {
  nodeWidth: 160,
  nodeHeight: 60,
  spouseWidth: 40,
  levelHeight: 100,
  siblingGap: 20,
  subtreeGap: 40,
  animationDuration: 300,
} as const;

// ==================== 树布局计算 ====================

/**
 * 计算树形布局
 */
export function calculateTreeLayout(
  rootNode: TreeNode,
  direction: 'vertical' | 'horizontal' = 'vertical'
): TreeLayout {
  const hierarchy = d3.hierarchy<TreeNode>(rootNode, d => d.children);
  
  // 使用tree布局
  const treeLayout = d3.tree<TreeNode>()
    .nodeSize([
      TREE_CONFIG.nodeWidth + TREE_CONFIG.siblingGap,
      TREE_CONFIG.levelHeight,
    ]);
  
  treeLayout(hierarchy);
  
  const nodes: LayoutNode[] = [];
  const links: LayoutLink[] = [];
  
  // 处理节点位置
  hierarchy.descendants().forEach((d, i) => {
    const isHorizontal = direction === 'horizontal';
    const x = isHorizontal ? d.y : d.x;
    const y = isHorizontal ? d.x : d.y;
    
    // 主节点
    nodes.push({
      id: d.data.person.id,
      x,
      y,
      person: d.data.person,
      parentId: d.parent?.data.person.id,
    });
    
    // 配偶节点
    if (d.data.spouses && d.data.spouses.length > 0) {
      d.data.spouses.forEach((spouse, spouseIndex) => {
        const spouseX = x + TREE_CONFIG.nodeWidth / 2 + TREE_CONFIG.spouseWidth / 2 + 
                       (spouseIndex * (TREE_CONFIG.spouseWidth + 10));
        const spouseY = y;
        
        nodes.push({
          id: spouse.id,
          x: spouseX,
          y: spouseY,
          person: spouse,
          isSpouse: true,
          parentId: d.data.person.id,
        });
        
        // 配偶连线
        links.push({
          source: d.data.person.id,
          target: spouse.id,
          type: 'spouse',
        });
      });
    }
    
    // 父子连线
    if (d.parent) {
      links.push({
        source: d.parent.data.person.id,
        target: d.data.person.id,
        type: 'parent-child',
      });
    }
  });
  
  // 计算边界
  const xExtent = d3.extent(nodes, d => d.x) as [number, number];
  const yExtent = d3.extent(nodes, d => d.y) as [number, number];
  
  return {
    nodes,
    links,
    width: (xExtent[1] - xExtent[0]) + TREE_CONFIG.nodeWidth * 2,
    height: (yExtent[1] - yExtent[0]) + TREE_CONFIG.nodeHeight * 2,
  };
}

/**
 * 计算双系并排布局
 */
export function calculateDualTreeLayout(
  paternalRoot: TreeNode,
  maternalRoot: TreeNode,
  centerGap: number = 100
): { paternal: TreeLayout; maternal: TreeLayout; combinedWidth: number; height: number } {
  const paternal = calculateTreeLayout(paternalRoot);
  const maternal = calculateTreeLayout(maternalRoot);
  
  // 调整母系树的位置（向右偏移）
  const paternalWidth = paternal.width;
  const offsetX = paternalWidth + centerGap;
  
  maternal.nodes.forEach(node => {
    node.x += offsetX;
  });
  
  return {
    paternal,
    maternal,
    combinedWidth: paternalWidth + centerGap + maternal.width,
    height: Math.max(paternal.height, maternal.height),
  };
}

// ==================== 路径计算 ====================

/**
 * 查找从根到目标节点的路径
 */
export function findPathToNode(root: TreeNode, targetId: string): TreeNode[] | null {
  if (root.person.id === targetId) {
    return [root];
  }
  
  if (root.children) {
    for (const child of root.children) {
      const path = findPathToNode(child, targetId);
      if (path) {
        return [root, ...path];
      }
    }
  }
  
  return null;
}

/**
 * 高亮路径
 */
export function getHighlightedLinks(
  layout: TreeLayout,
  highlightedPersonIds: string[]
): Set<string> {
  const highlighted = new Set<string>();
  
  // 创建节点ID到节点的映射
  const nodeMap = new Map(layout.nodes.map(n => [n.id, n]));
  
  // 遍历高亮的人员ID，找到相关的连线
  for (let i = 0; i < highlightedPersonIds.length - 1; i++) {
    const fromId = highlightedPersonIds[i];
    const toId = highlightedPersonIds[i + 1];
    
    // 查找连接这两个节点的连线
    const link = layout.links.find(
      l => (l.source === fromId && l.target === toId) ||
           (l.source === toId && l.target === fromId)
    );
    
    if (link) {
      highlighted.add(`${link.source}-${link.target}`);
    }
  }
  
  return highlighted;
}

// ==================== 缩放和平移 ====================

export interface Transform {
  x: number;
  y: number;
  k: number;
}

/**
 * 创建D3缩放行为
 */
export function createZoomBehavior(
  svg: SVGSVGElement,
  onZoom: (transform: Transform) => void,
  options: {
    minZoom?: number;
    maxZoom?: number;
    extent?: [number, number];
  } = {}
) {
  const { minZoom = 0.25, maxZoom = 3, extent = [100, 3000] } = options;
  
  return d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([minZoom, maxZoom])
    .extent([[0, 0], extent])
    .on('zoom', (event) => {
      onZoom({
        x: event.transform.x,
        y: event.transform.y,
        k: event.transform.k,
      });
    });
}

/**
 * 计算适合视口的变换
 */
export function calculateFitTransform(
  layout: TreeLayout,
  viewportWidth: number,
  viewportHeight: number,
  padding: number = 50
): Transform {
  const contentWidth = layout.width;
  const contentHeight = layout.height;
  
  const scaleX = (viewportWidth - padding * 2) / contentWidth;
  const scaleY = (viewportHeight - padding * 2) / contentHeight;
  const scale = Math.min(scaleX, scaleY, 1); // 最大缩放为1
  
  const x = (viewportWidth - contentWidth * scale) / 2;
  const y = padding;
  
  return { x, y, k: scale };
}

// ==================== 碰撞检测 ====================

/**
 * 检查点是否在节点范围内
 */
export function hitTestNode(
  nodes: LayoutNode[],
  x: number,
  y: number,
  nodeWidth: number = TREE_CONFIG.nodeWidth,
  nodeHeight: number = TREE_CONFIG.nodeHeight
): LayoutNode | null {
  for (const node of nodes) {
    const halfWidth = nodeWidth / 2;
    const halfHeight = nodeHeight / 2;
    
    if (
      x >= node.x - halfWidth &&
      x <= node.x + halfWidth &&
      y >= node.y - halfHeight &&
      y <= node.y + halfHeight
    ) {
      return node;
    }
  }
  
  return null;
}

// ==================== 树数据转换 ====================

/**
 * 将扁平人员列表转换为树结构
 */
export function buildTreeFromPeople(
  people: Person[],
  rootId: string,
  getParentId: (person: Person) => string | undefined
): TreeNode | null {
  const peopleMap = new Map(people.map(p => [p.id, p]));
  const nodeMap = new Map<string, TreeNode>();
  
  // 创建所有节点
  people.forEach(person => {
    nodeMap.set(person.id, {
      person,
      children: [],
      depth: 0,
    });
  });
  
  // 建立父子关系
  let rootNode: TreeNode | null = null;
  
  people.forEach(person => {
    const node = nodeMap.get(person.id)!;
    const parentId = getParentId(person);
    
    if (parentId && nodeMap.has(parentId)) {
      const parent = nodeMap.get(parentId)!;
      parent.children = parent.children || [];
      parent.children.push(node);
      node.depth = parent.depth + 1;
    } else if (person.id === rootId) {
      rootNode = node;
    }
  });
  
  return rootNode;
}

/**
 * 生成模拟树数据（用于开发测试）
 */
export function generateMockTree(depth: number = 4, breadth: number = 2): TreeNode {
  const generatePerson = (id: string, gen: number): Person => ({
    id,
    name: `Person ${id}`,
    gender: Math.random() > 0.5 ? 'male' : 'female',
    birthDate: '1900-01-01',
    generation: gen,
  });
  
  const buildLevel = (level: number, index: number): TreeNode => {
    const id = `p-${level}-${index}`;
    const node: TreeNode = {
      person: generatePerson(id, level),
      children: [],
      depth: level,
    };
    
    if (level < depth) {
      for (let i = 0; i < breadth; i++) {
        node.children!.push(buildLevel(level + 1, index * breadth + i));
      }
    }
    
    // 添加配偶
    if (Math.random() > 0.3) {
      node.spouses = [generatePerson(`${id}-spouse`, level)];
    }
    
    return node;
  };
  
  return buildLevel(0, 0);
}
