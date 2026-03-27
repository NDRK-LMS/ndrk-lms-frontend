'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Video,
  FileText,
  Link2,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Save,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface ContentDetail {
  id: string;
  title: string;
  description: string | null;
  type: string;
  s3_key: string | null;
  s3_bucket: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  duration_seconds: number | null;
  transcode_status: string;
  transcode_job_id: string | null;
  hls_manifest_key: string | null;
  thumbnail_url: string | null;
  tags: string[];
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  usage_count: number;
}

interface UsageLesson {
  id: string;
  title: string;
  module_title: string;
  programme_title: string;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  VIDEO: Video,
  DOCUMENT: FileText,
  EXTERNAL_LINK: Link2,
  SCORM: FileText,
};

const statusConfig: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
  COMPLETED: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
  PENDING: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  PROCESSING: { color: 'bg-blue-100 text-blue-700', icon: Loader2 },
  FAILED: { color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const id = params.id as string;

  const [content, setContent] = useState<ContentDetail | null>(null);
  const [usage, setUsage] = useState<UsageLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState('');

  useEffect(() => {
    if (!accessToken || !id) return;

    api
      .get<ContentDetail>(`/api/v1/admin/content/${id}`, accessToken)
      .then((detail) => {
        setContent(detail);
        setEditTitle(detail.title);
        setEditDescription(detail.description ?? '');
        setEditTags((detail.tags ?? []).join(', '));
        // Fetch usage separately — don't block on it
        api
          .get<{ lessons: UsageLesson[] }>(`/api/v1/admin/content/${id}/usage`, accessToken)
          .then((usageData) => setUsage(usageData.lessons))
          .catch(() => {});
      })
      .catch((err) => {
        console.error('Failed to load content:', err);
      })
      .finally(() => setLoading(false));
  }, [accessToken, id]);

  async function handleSave() {
    if (!accessToken) return;
    setSaving(true);
    try {
      const updated = await api.patch<ContentDetail>(
        `/api/v1/admin/content/${id}`,
        {
          title: editTitle,
          description: editDescription || null,
          tags: editTags.split(',').map((t) => t.trim()).filter(Boolean),
        },
        accessToken,
      );
      setContent(updated);
    } catch {
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!accessToken || !confirm('Are you sure you want to delete this content?')) return;
    try {
      await api.delete(`/api/v1/admin/content/${id}`, accessToken);
      router.push('/admin/content');
    } catch {
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
      </div>
    );
  }

  if (!content) {
    return <div className="py-16 text-center text-gray-400">Content not found</div>;
  }

  const TypeIcon = typeIcons[content.type] ?? FileText;
  const status = statusConfig[content.transcode_status] ?? statusConfig.PENDING;
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/content')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{content.title}</h1>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
          <StatusIcon className="h-3 w-3" />
          {content.transcode_status}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Preview */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex h-64 items-center justify-center bg-gray-50 rounded-t-xl">
              <TypeIcon className="h-16 w-16 text-gray-300" />
            </div>
            <CardContent className="p-4 text-center text-sm text-gray-500">
              {content.type === 'VIDEO'
                ? 'Video player will be available after transcoding completes'
                : content.type === 'DOCUMENT'
                  ? 'Document preview will be available here'
                  : 'External link content'}
            </CardContent>
          </Card>
        </div>

        {/* Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <span className="font-medium">{content.type.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Size</span>
                <span>{content.file_size_bytes ? `${(Number(content.file_size_bytes) / (1024 * 1024)).toFixed(1)} MB` : '-'}</span>
              </div>
              {content.duration_seconds && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Duration</span>
                  <span>{Math.floor(content.duration_seconds / 60)}:{(content.duration_seconds % 60).toString().padStart(2, '0')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">MIME</span>
                <span>{content.mime_type ?? '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Used in</span>
                <span>{content.usage_count} lesson(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span>{new Date(content.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Edit Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="desc">Description</Label>
            <textarea
              id="desc"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input id="tags" value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="intro, module1, video" />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage */}
      {usage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Referenced by {usage.length} lesson(s)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {usage.map((lesson) => (
                <div key={lesson.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 text-sm">
                  <div>
                    <span className="font-medium">{lesson.title}</span>
                    <span className="ml-2 text-gray-500">{lesson.module_title} / {lesson.programme_title}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
