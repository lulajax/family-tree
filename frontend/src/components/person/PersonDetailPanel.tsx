import { useState } from 'react';
import type { PersonNode } from '../../types';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { PersonEditDialog } from './PersonEditDialog';

const GENDER_COLORS = {
  male: { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  female: { bg: 'bg-pink-500', light: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  unknown: { bg: 'bg-slate-400', light: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
} as const;

const GENDER_LABELS: Record<string, string> = {
  male: '男',
  female: '女',
  unknown: '未知',
};

const SIDE_LABELS: Record<string, string> = {
  paternal: '父系',
  maternal: '母系',
  self: '本人',
  affinity: '姻亲',
  unknown: '',
};

interface PersonDetailPanelProps {
  person: PersonNode;
  referencePersonId: string;
  onSetReference: (personId: string) => void;
  onClose: () => void;
  onAddRelative: () => void;
  onDelete?: (person: PersonNode) => void;
  onEdit?: (person: PersonNode, data: {
    name: string;
    gender: 'male' | 'female' | 'unknown';
    birth_date?: string;
    death_date?: string;
    bio?: string;
  }) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '未知';
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function calcAge(birth: string | null, death: string | null): string | null {
  if (!birth) return null;
  const b = new Date(birth);
  const end = death ? new Date(death) : new Date();
  const age = Math.floor(
    (end.getTime() - b.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );
  return `${age}岁`;
}

export const PersonDetailPanel: React.FC<PersonDetailPanelProps> = ({
  person,
  referencePersonId,
  onSetReference,
  onClose,
  onAddRelative,
  onDelete,
  onEdit,
}) => {
  const colors = GENDER_COLORS[person.gender] ?? GENDER_COLORS.unknown;
  const isReference = person.id === referencePersonId;
  const age = calcAge(person.birth_date, person.death_date);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className={`${colors.light} border-b ${colors.border}`}>
        <div className="flex items-start justify-between p-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-14 h-14 ${colors.bg} rounded-full flex items-center justify-center text-white text-xl font-bold shadow`}
            >
              {person.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {person.name}
              </h2>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.light} ${colors.text} border ${colors.border}`}
                >
                  {GENDER_LABELS[person.gender] ?? '未知'}
                </span>
                {person.title && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                    {person.title}
                  </span>
                )}
                {SIDE_LABELS[person.side] && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                    {SIDE_LABELS[person.side]}
                  </span>
                )}
                {isReference && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
                    当前焦点
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/60 rounded-lg transition-colors"
            aria-label="关闭"
          >
            <svg
              className="w-5 h-5 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 px-4 pb-4">
          {!isReference && (
            <button
              onClick={() => onSetReference(person.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              设为焦点
            </button>
          )}
          <button
            onClick={onAddRelative}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            添加亲属
          </button>
          {onEdit && (
            <button
              onClick={() => setShowEditDialog(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              编辑
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              删除
            </button>
          )}
        </div>
      </div>

      {/* 详情区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {showDeleteConfirm && onDelete && (
          <DeleteConfirmDialog
            person={person}
            isDeleting={isDeleting}
            onCancel={() => setShowDeleteConfirm(false)}
            onConfirm={async () => {
              setIsDeleting(true);
              try {
                await onDelete(person);
                setShowDeleteConfirm(false);
              } catch {
                setIsDeleting(false);
              }
            }}
          />
        )}

        {showEditDialog && onEdit && (
          <PersonEditDialog
            person={person}
            isSaving={isEditing}
            onCancel={() => setShowEditDialog(false)}
            onConfirm={async (data) => {
              setIsEditing(true);
              try {
                await onEdit(person, data);
                setShowEditDialog(false);
              } catch {
                setIsEditing(false);
              }
            }}
          />
        )}
        <div className="bg-slate-50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            基本信息
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">姓名</dt>
              <dd className="text-slate-800 font-medium">{person.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">性别</dt>
              <dd className="text-slate-800">
                {GENDER_LABELS[person.gender] ?? '未知'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">出生日期</dt>
              <dd className="text-slate-800">
                {formatDate(person.birth_date)}
              </dd>
            </div>
            {person.death_date && (
              <div className="flex justify-between">
                <dt className="text-slate-500">逝世日期</dt>
                <dd className="text-slate-800">
                  {formatDate(person.death_date)}
                </dd>
              </div>
            )}
            {age && (
              <div className="flex justify-between">
                <dt className="text-slate-500">
                  {person.death_date ? '享年' : '年龄'}
                </dt>
                <dd className="text-slate-800">{age}</dd>
              </div>
            )}
            {person.title && (
              <div className="flex justify-between">
                <dt className="text-slate-500">称谓</dt>
                <dd className="text-amber-700 font-medium">{person.title}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
};

export default PersonDetailPanel;
