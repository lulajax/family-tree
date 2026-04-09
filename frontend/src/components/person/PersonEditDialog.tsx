import { useState, useEffect } from 'react';
import type { PersonNode } from '../../types';

interface PersonEditDialogProps {
  person: PersonNode;
  onConfirm: (data: {
    name: string;
    gender: 'male' | 'female' | 'unknown';
    birth_date?: string;
    death_date?: string;
    bio?: string;
  }) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export const PersonEditDialog: React.FC<PersonEditDialogProps> = ({
  person,
  onConfirm,
  onCancel,
  isSaving = false,
}) => {
  const [name, setName] = useState(person.name);
  const [gender, setGender] = useState<'male' | 'female' | 'unknown'>(person.gender);
  const [birthDate, setBirthDate] = useState(person.birth_date ?? '');
  const [deathDate, setDeathDate] = useState(person.death_date ?? '');
  const [bio, setBio] = useState('');
  const [nativePlace, setNativePlace] = useState(person.native_place ?? '');
  const [birthOrder, setBirthOrder] = useState(person.birth_order != null ? String(person.birth_order) : '');

  // 重置表单当 person 变化时
  useEffect(() => {
    setName(person.name);
    setGender(person.gender);
    setBirthDate(person.birth_date ?? '');
    setDeathDate(person.death_date ?? '');
    setBio('');
    setNativePlace(person.native_place ?? '');
    setBirthOrder(person.birth_order != null ? String(person.birth_order) : '');
  }, [person]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const data: {
      name: string;
      gender: 'male' | 'female' | 'unknown';
      birth_date?: string;
      death_date?: string;
      bio?: string;
    } = {
      name: name.trim(),
      gender,
    };

    if (birthDate) data.birth_date = birthDate;
    if (deathDate) data.death_date = deathDate;
    if (bio.trim()) data.bio = bio.trim();
    if (nativePlace.trim()) (data as Record<string, unknown>).native_place = nativePlace.trim();
    if (birthOrder) (data as Record<string, unknown>).birth_order = parseInt(birthOrder, 10);

    onConfirm(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* 头部 */}
        <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-blue-600"
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
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">编辑人物信息</h3>
              <p className="text-sm text-gray-500">修改 {person.name} 的详细信息</p>
            </div>
          </div>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">性别</label>
            <div className="flex gap-2">
              {(
                [
                  ['male', '男'],
                  ['female', '女'],
                  ['unknown', '未知'],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setGender(v)}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                    gender === v
                      ? v === 'male'
                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                        : v === 'female'
                          ? 'bg-pink-50 border-pink-300 text-pink-700 font-medium'
                          : 'bg-gray-100 border-gray-300 text-gray-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 日期 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">出生日期</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">逝世日期</label>
              <input
                type="date"
                value={deathDate}
                onChange={(e) => setDeathDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* 籍贯 & 排行 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">籍贯</label>
              <input
                type="text"
                value={nativePlace}
                onChange={(e) => setNativePlace(e.target.value)}
                placeholder="例：广东潮州"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">排行</label>
              <input
                type="number"
                min="1"
                value={birthOrder}
                onChange={(e) => setBirthOrder(e.target.value)}
                placeholder="第几位"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* 简介 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">简介</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="可选，添加人物简介..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>
        </form>

        {/* 按钮 */}
        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                保存中...
              </>
            ) : (
              '保存'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonEditDialog;
