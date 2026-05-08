import { useMemo, useState } from 'react';
import type { InviteRole } from '../../types';

const ROLE_OPTIONS: Array<{ value: InviteRole; label: string; description: string }> = [
  { value: 'editor', label: '可编辑', description: '可补充人物、关系和资料' },
  { value: 'member', label: '成员', description: '适合普通家庭成员参与完善' },
  { value: 'viewer', label: '仅查看', description: '只能查看家庭图谱' },
];

interface InviteFamilyDialogProps {
  familyId: string;
  inviteCode?: string | null;
  isCreating?: boolean;
  error?: string | null;
  onCreateInvite: (role: InviteRole) => void;
  onClose: () => void;
}

export function InviteFamilyDialog({
  inviteCode,
  isCreating = false,
  error,
  onCreateInvite,
  onClose,
}: InviteFamilyDialogProps) {
  const [role, setRole] = useState<InviteRole>('member');
  const inviteLink = useMemo(() => {
    if (!inviteCode) return null;
    if (typeof window === 'undefined') return `/invite/${inviteCode}`;
    return `${window.location.origin}/invite/${inviteCode}`;
  }, [inviteCode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <section className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
        <header className="border-b border-blue-100 bg-blue-50 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">家庭协作</p>
              <h3 className="mt-1 text-lg font-bold text-slate-900">邀请家人</h3>
              <p className="mt-1 text-sm text-slate-600">生成邀请链接，让家人一起补全族谱。</p>
            </div>
            <button onClick={onClose} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-white">
              ✕
            </button>
          </div>
        </header>

        <div className="space-y-4 px-6 py-5">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">邀请角色</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {ROLE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-xl border p-3 text-sm transition ${
                    role === option.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="invite-role"
                    value={option.value}
                    checked={role === option.value}
                    onChange={() => setRole(option.value)}
                    className="sr-only"
                  />
                  <span className="font-semibold text-slate-900">{option.label}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                    {option.description}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {inviteCode && inviteLink && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-800">邀请已生成</p>
              <p className="mt-1 break-all rounded-lg bg-white px-3 py-2 font-mono text-sm text-emerald-900">
                {inviteLink}
              </p>
              <p className="mt-2 text-xs text-emerald-700">邀请码：{inviteCode}</p>
            </div>
          )}
        </div>

        <footer className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            关闭
          </button>
          <button
            onClick={() => onCreateInvite(role)}
            disabled={isCreating}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isCreating ? '生成中...' : '生成邀请链接'}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default InviteFamilyDialog;
