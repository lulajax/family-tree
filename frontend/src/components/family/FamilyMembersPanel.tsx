import type { AuditLog, CollaborationRole, FamilyMembership } from '../../types';

const ROLE_LABELS: Record<CollaborationRole, string> = {
  owner: '拥有者',
  editor: '可编辑',
  member: '成员',
  viewer: '仅查看',
};

const ACTION_LABELS: Record<string, string> = {
  create_invite: '创建邀请',
  accept_invite: '接受邀请',
  create_family: '创建家庭',
  update_family: '更新家庭',
  create_person: '添加人物',
  update_person: '更新人物',
  delete_person: '删除人物',
};

interface FamilyMembersPanelProps {
  members: FamilyMembership[];
  activity: AuditLog[];
  isLoading?: boolean;
}

function shortUserId(userId: string): string {
  return userId.length > 10 ? `${userId.slice(0, 8)}…` : userId;
}

function formatDate(value?: string | null): string {
  if (!value) return '刚刚';
  return new Date(value).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export function FamilyMembersPanel({ members, activity, isLoading = false }: FamilyMembersPanelProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">协作</p>
          <h3 className="text-base font-bold text-slate-900">家庭成员</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {members.length} 人
        </span>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-slate-500">加载协作信息中...</p>
      ) : (
        <>
          <div className="mt-4 space-y-2">
            {members.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">还没有成员记录。</p>
            ) : (
              members.map((member) => (
                <div key={member.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{shortUserId(member.user_id)}</p>
                    <p className="text-xs text-slate-500">加入于 {formatDate(member.joined_at)}</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                    {ROLE_LABELS[member.role]}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <h4 className="text-sm font-bold text-slate-900">最近活动</h4>
            <div className="mt-2 space-y-2">
              {activity.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">暂无活动记录。</p>
              ) : (
                activity.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-100 px-3 py-2">
                    <p className="text-sm font-medium text-slate-800">
                      {ACTION_LABELS[item.action] ?? item.action}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.entity_type} · {formatDate(item.created_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default FamilyMembersPanel;
