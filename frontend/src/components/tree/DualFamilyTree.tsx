import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import type { DualTreeResponse, PersonNode } from '../../types';
import { computeLayout, computeRegions, NODE_W, NODE_H } from '../../utils/dualTreeLayout';
import { TreeNodeCard } from './TreeNodeCard';
import { ConnectionLines } from './ConnectionLines';
import { TreeBackground } from './TreeBackground';
import { TreeContextMenu } from './TreeContextMenu';
import { TreeLegend } from './TreeLegend';
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

interface Transform {
  x: number;
  y: number;
  scale: number;
}

export const DualFamilyTree: React.FC<DualFamilyTreeProps> = ({
  dualTree,
  onPersonClick,
  onSetReference,
  onAddRelative,
  onDelete,
  onEdit,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Pan/Zoom state ──
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  // ── Dialog state ──
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; person: PersonNode } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PersonNode | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editTarget, setEditTarget] = useState<PersonNode | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // ── Layout computation (pure, memoized) ──
  const { nodes, links, bounds } = useMemo(() => computeLayout(dualTree), [dualTree]);

  const hasBothSides = dualTree.paternal.length > 0 && dualTree.maternal.length > 0;
  const regions = useMemo(() => computeRegions(nodes, hasBothSides), [nodes, hasBothSides]);

  // ── Auto-fit on data change ──
  useEffect(() => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth || 800;
    const ch = containerRef.current.clientHeight || 600;

    const treeW = bounds.maxX - bounds.minX + NODE_W * 2 + 100;
    const treeH = bounds.maxY - bounds.minY + NODE_H * 2 + 100;

    const scale = Math.min(cw / treeW, ch / treeH, 1);
    const offsetX = -bounds.minX + NODE_W / 2 + 50;
    const offsetY = -bounds.minY + NODE_H / 2 + 50;

    setTransform({
      x: (cw - treeW * scale) / 2 + offsetX * scale,
      y: offsetY * scale + 40,
      scale,
    });
  }, [bounds]);

  // ── SVG viewport dimensions for connection lines ──
  const svgWidth = bounds.maxX - bounds.minX + NODE_W * 2 + 200;
  const svgHeight = bounds.maxY - bounds.minY + NODE_H * 2 + 200;
  const svgOffsetX = -bounds.minX + NODE_W / 2 + 100;
  const svgOffsetY = -bounds.minY + NODE_H / 2 + 100;

  // ── Zoom (wheel) ──
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setTransform(prev => {
      const newScale = Math.min(3, Math.max(0.15, prev.scale + delta * prev.scale));
      const ratio = newScale / prev.scale;
      // Zoom toward cursor
      const rect = containerRef.current!.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      return {
        x: cx - ratio * (cx - prev.x),
        y: cy - ratio * (cy - prev.y),
        scale: newScale,
      };
    });
  }, []);

  // ── Pan (mouse drag) ──
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // left button only
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
  }, [transform.x, transform.y]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setTransform(prev => ({ ...prev, x: panStart.current.tx + dx, y: panStart.current.ty + dy }));
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // ── Context menu handlers ──
  const handleNodeContextMenu = useCallback((e: React.MouseEvent, person: PersonNode) => {
    setContextMenu({ x: e.clientX, y: e.clientY, person });
  }, []);

  const handleEditFromMenu = useCallback((person: PersonNode) => {
    setEditTarget(person);
  }, []);

  const handleDeleteFromMenu = useCallback((person: PersonNode) => {
    setDeleteTarget(person);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-gray-50 overflow-hidden"
      style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      role="tree"
      aria-label="家族谱系图"
    >
      {/* Transformed layer */}
      <div
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {/* SVG layer: backgrounds + connection lines */}
        <svg
          width={svgWidth}
          height={svgHeight}
          style={{
            position: 'absolute',
            left: -svgOffsetX,
            top: -svgOffsetY,
            pointerEvents: 'none',
          }}
        >
          <g transform={`translate(${svgOffsetX}, ${svgOffsetY})`}>
            <TreeBackground
              regions={regions}
              hasBothSides={hasBothSides}
              minY={bounds.minY}
              maxY={bounds.maxY}
            />
            <ConnectionLines links={links} />
          </g>
        </svg>

        {/* HTML layer: node cards */}
        {nodes.map(node => (
          <TreeNodeCard
            key={node.person.id}
            person={node.person}
            x={node.x}
            y={node.y}
            onClick={onPersonClick}
            onContextMenu={handleNodeContextMenu}
            onAddRelative={onAddRelative}
          />
        ))}
      </div>

      {/* Fixed overlays (not affected by pan/zoom) */}
      <TreeLegend />

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5">
        <button
          onClick={() => setTransform(prev => {
            const newScale = Math.min(3, prev.scale * 1.3);
            const ratio = newScale / prev.scale;
            const cw = containerRef.current?.clientWidth ?? 800;
            const ch = containerRef.current?.clientHeight ?? 600;
            return { x: cw / 2 - ratio * (cw / 2 - prev.x), y: ch / 2 - ratio * (ch / 2 - prev.y), scale: newScale };
          })}
          className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-lg shadow-md flex items-center justify-center hover:bg-white text-gray-600 transition-colors"
          title="放大"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12M6 12h12" /></svg>
        </button>
        <button
          onClick={() => setTransform(prev => {
            const newScale = Math.max(0.15, prev.scale / 1.3);
            const ratio = newScale / prev.scale;
            const cw = containerRef.current?.clientWidth ?? 800;
            const ch = containerRef.current?.clientHeight ?? 600;
            return { x: cw / 2 - ratio * (cw / 2 - prev.x), y: ch / 2 - ratio * (ch / 2 - prev.y), scale: newScale };
          })}
          className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-lg shadow-md flex items-center justify-center hover:bg-white text-gray-600 transition-colors"
          title="缩小"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h12" /></svg>
        </button>
        <button
          onClick={() => {
            if (!containerRef.current) return;
            const cw = containerRef.current.clientWidth;
            const ch = containerRef.current.clientHeight;
            const treeW = bounds.maxX - bounds.minX + NODE_W * 2 + 100;
            const treeH = bounds.maxY - bounds.minY + NODE_H * 2 + 100;
            const scale = Math.min(cw / treeW, ch / treeH, 1);
            const offsetX = -bounds.minX + NODE_W / 2 + 50;
            const offsetY = -bounds.minY + NODE_H / 2 + 50;
            setTransform({ x: (cw - treeW * scale) / 2 + offsetX * scale, y: offsetY * scale + 40, scale });
          }}
          className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-lg shadow-md flex items-center justify-center hover:bg-white text-gray-600 transition-colors"
          title="适应屏幕"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" /></svg>
        </button>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <TreeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          person={contextMenu.person}
          onClose={() => setContextMenu(null)}
          onViewDetail={onPersonClick}
          onSetReference={onSetReference}
          onAddRelative={onAddRelative}
          onEdit={onEdit ? handleEditFromMenu : undefined}
          onDelete={onDelete ? handleDeleteFromMenu : undefined}
        />
      )}

      {/* Delete confirmation dialog */}
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

      {/* Edit dialog */}
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

export default DualFamilyTree;
