import { useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useFamily, useImportJob } from '../api/queries';
import { apiClient, API_BASE } from '../api/client';

export function ImportPage() {
  const { familyId } = useParams<{ familyId: string }>();
  const { data: family } = useFamily(familyId ?? null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  // Import options
  const [txMode, setTxMode] = useState<'all_or_nothing' | 'partial' | 'dry_run'>('partial');
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // Poll job status
  const { data: job } = useImportJob(jobId);

  const handleFileSelect = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['csv', 'xlsx'].includes(ext)) {
      setError('仅支持 CSV 和 XLSX 格式');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('文件大小不能超过 10MB');
      return;
    }
    setSelectedFile(file);
    setError(null);
    setJobId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleSubmit = async () => {
    if (!selectedFile || !familyId) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('family_id', familyId);
      formData.append('options', JSON.stringify({
        transaction_mode: txMode,
        skip_duplicates: skipDuplicates,
      }));

      const result = await apiClient<{ id: string }>('/import', {
        method: 'POST',
        body: formData,
      });
      setJobId(result.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const isDone = job?.status === 'completed' || job?.status === 'failed';
  const progress = job?.summary
    ? job.summary.total > 0 ? Math.round((job.summary.processed / job.summary.total) * 100) : 0
    : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          导入数据{family ? ` — ${family.name}` : ''}
        </h1>
        <p className="text-sm text-gray-500 mt-1">通过 CSV 或 XLSX 文件批量导入族谱成员</p>
      </div>

      {/* Template download */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-blue-800 font-medium">导入模板</p>
            <p className="text-xs text-blue-600 mt-1">
              CSV 文件需要包含以下列：id, name, gender, birth_date, death_date, bio, father_id, mother_id, spouse_id
            </p>
            <a
              href={`${API_BASE}/import/template`}
              download
              className="inline-flex items-center gap-1 mt-2 text-sm text-blue-700 hover:text-blue-800 font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              下载模板
            </a>
          </div>
        </div>
      </div>

      {/* File upload zone */}
      {!jobId && (
        <>
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
            />
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {selectedFile ? (
              <div>
                <p className="text-sm font-medium text-gray-700">{selectedFile.name}</p>
                <p className="text-xs text-gray-500 mt-1">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500">拖放文件到此处，或点击选择</p>
                <p className="text-xs text-gray-400 mt-1">支持 CSV、XLSX（最大 10MB）</p>
              </div>
            )}
          </div>

          {/* Options */}
          {selectedFile && (
            <div className="mt-4 bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">事务模式</label>
                  <select
                    value={txMode}
                    onChange={(e) => setTxMode(e.target.value as typeof txMode)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="partial">部分导入（跳过错误行）</option>
                    <option value="all_or_nothing">全量事务（有错全部回滚）</option>
                    <option value="dry_run">模拟运行（不实际写入）</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipDuplicates}
                      onChange={(e) => setSkipDuplicates(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    跳过重复项
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSubmit}
                  disabled={uploading}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? '上传中...' : '开始导入'}
                </button>
                <button
                  onClick={() => { setSelectedFile(null); setError(null); }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  清除
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Progress */}
      {job && (
        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">导入进度</h3>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              job.status === 'completed' ? 'bg-green-100 text-green-700' :
              job.status === 'failed' ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {job.status === 'pending' ? '等待中' :
               job.status === 'processing' ? '处理中' :
               job.status === 'completed' ? '已完成' : '失败'}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                job.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-lg font-bold text-gray-800">{job.summary.total}</div>
              <div className="text-xs text-gray-500">总计</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-lg font-bold text-gray-800">{job.summary.processed}</div>
              <div className="text-xs text-gray-500">已处理</div>
            </div>
            <div className="bg-green-50 rounded-lg p-2">
              <div className="text-lg font-bold text-green-700">{job.summary.succeeded}</div>
              <div className="text-xs text-green-600">成功</div>
            </div>
            <div className="bg-red-50 rounded-lg p-2">
              <div className="text-lg font-bold text-red-700">{job.summary.failed}</div>
              <div className="text-xs text-red-600">失败</div>
            </div>
          </div>

          {/* Errors table */}
          {job.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-red-700 mb-2">错误详情 ({job.errors.length})</h4>
              <div className="max-h-48 overflow-y-auto border border-red-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-red-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-red-700">行号</th>
                      <th className="text-left px-3 py-2 text-red-700">字段</th>
                      <th className="text-left px-3 py-2 text-red-700">错误</th>
                    </tr>
                  </thead>
                  <tbody>
                    {job.errors.map((err, i) => (
                      <tr key={i} className="border-t border-red-100">
                        <td className="px-3 py-2 text-gray-700">{err.row}</td>
                        <td className="px-3 py-2 text-gray-700">{err.field}</td>
                        <td className="px-3 py-2 text-red-600">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions when done */}
          {isDone && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => { setJobId(null); setSelectedFile(null); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                再次导入
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
