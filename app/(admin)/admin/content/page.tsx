'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Upload,
  Grid3x3,
  List,
  Video,
  FileText,
  Link2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { UploadContentModal } from '@/components/admin/upload-content-modal';

interface ContentItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  s3_key: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  duration_seconds: number | null;
  transcode_status: string;
  thumbnail_url: string | null;
  tags: string[];
  uploaded_by: string;
  created_at: string;
}

interface ContentListResponse {
  data: ContentItem[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  VIDEO: Video,
  DOCUMENT: FileText,
  EXTERNAL_LINK: Link2,
  SCORM: FileText,
};

const statusColors: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  FAILED: 'bg-red-100 text-red-700',
};

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  COMPLETED: CheckCircle,
  PENDING: Clock,
  PROCESSING: Loader2,
  FAILED: AlertCircle,
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ContentLibraryPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '20');
    if (search.trim()) params.set('search', search.trim());
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (statusFilter !== 'all') params.set('transcode_status', statusFilter);

    api
      .get<ContentListResponse>(`/api/v1/admin/content?${params}`, accessToken)
      .then((res) => {
        setContent(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken, page, search, typeFilter, statusFilter, refreshKey]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Library</h1>
          <p className="text-sm text-gray-500">{total} items</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Content
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search content..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">All types</option>
          <option value="VIDEO">Video</option>
          <option value="DOCUMENT">Document</option>
          <option value="EXTERNAL_LINK">External Link</option>
          <option value="SCORM">SCORM</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">All status</option>
          <option value="COMPLETED">Completed</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="FAILED">Failed</option>
        </select>
        <div className="flex rounded-md border border-gray-300 overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content Grid/List */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      ) : content.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <FileText className="h-12 w-12 mb-3" />
          <p className="text-lg font-medium">No content found</p>
          <p className="text-sm">Upload your first content to get started</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {content.map((item) => {
            const TypeIcon = typeIcons[item.type] ?? FileText;
            const StatusIcon = statusIcons[item.transcode_status] ?? Clock;
            return (
              <Link key={item.id} href={`/admin/content/${item.id}`}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <div className="flex h-32 items-center justify-center bg-gray-50 rounded-t-xl">
                    <TypeIcon className="h-12 w-12 text-gray-300" />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-sm line-clamp-1">{item.title}</h3>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <TypeIcon className="h-3 w-3" />
                        {item.type.replace('_', ' ')}
                      </span>
                      {item.duration_seconds && (
                        <span>{formatDuration(item.duration_seconds)}</span>
                      )}
                      <span>{formatBytes(item.file_size_bytes)}</span>
                    </div>
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[item.transcode_status] ?? 'bg-gray-100 text-gray-600'}`}>
                        <StatusIcon className="h-3 w-3" />
                        {item.transcode_status}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {content.map((item) => {
                const StatusIcon = statusIcons[item.transcode_status] ?? Clock;
                return (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/content/${item.id}`} className="font-medium text-blue-600 hover:underline">
                        {item.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.type.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-gray-500">{formatBytes(item.file_size_bytes)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDuration(item.duration_seconds)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[item.transcode_status] ?? 'bg-gray-100'}`}>
                        <StatusIcon className="h-3 w-3" />
                        {item.transcode_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages} ({total} items)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      <UploadContentModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
