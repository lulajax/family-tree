import { useState } from 'react';
import type { PersonNode } from '../../types';

interface AddRelativeDialogProps {
  person: PersonNode;
  onClose: () => void;
  onSubmit: (
    personId: string,
    relationType: string,
    personData: { name: string; gender?: string; birth_date?: string; death_date?: string },
  ) => Promise<void>;
}

const RELATION_TYPES = [
  { value: 'father', label: '父亲' },
  { value: 'mother', label: '母亲' },
  { value: 'child', label: '子女' },
  { value: 'spouse', label: '配偶' },
  { value: 'sibling', label: '兄弟姐妹' },
] as const;

export const AddRelativeDialog: React.FC<AddRelativeDialogProps> = ({
  person,
  onClose,
  onSubmit,
}) => {
  const [relationType, setRelationType] = useState('child');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'unknown'>('unknown');
  const [birthDate, setBirthDate] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(person.id, relationType, {
        name: name.trim(),
        gender: gender !== 'unknown' ? gender : undefined,
        birth_date: birthDate || undefined,
        death_date: deathDate || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            为「{person.name}」添加亲属
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <svg
              className="w-5 h-5 text-gray-400"
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

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
              {error}
            </div>
          )}

          {/* 关系类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              关系类型
            </label>
            <div className="grid grid-cols-3 gap-2">
              {RELATION_TYPES.map((rt) => (
                <button
                  key={rt.value}
                  type="button"
                  onClick={() => setRelationType(rt.value)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    relationType === rt.value
                      ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {rt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 姓名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              姓名 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入姓名"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
              required
            />
          </div>

          {/* 性别 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              性别
            </label>
            <div className="flex gap-2">
              {[
                { v: 'male' as const, label: '男' },
                { v: 'female' as const, label: '女' },
                { v: 'unknown' as const, label: '未知' },
              ].map((g) => (
                <button
                  key={g.v}
                  type="button"
                  onClick={() => setGender(g.v)}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                    gender === g.v
                      ? g.v === 'male'
                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                        : g.v === 'female'
                          ? 'bg-pink-50 border-pink-300 text-pink-700 font-medium'
                          : 'bg-gray-100 border-gray-300 text-gray-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* 日期 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                出生日期
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                逝世日期
              </label>
              <input
                type="date"
                value={deathDate}
                onChange={(e) => setDeathDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!name.trim() || submitting}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {submitting ? '添加中...' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRelativeDialog;
