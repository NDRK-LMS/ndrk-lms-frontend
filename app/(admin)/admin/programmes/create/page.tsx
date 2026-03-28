'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/lib/auth-store';
import { api, ApiError } from '@/lib/api';
import { supabase } from '@/lib/supabase-client';

type ProgrammeStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export default function AdminProgrammeCreatePage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [status, setStatus] = React.useState<ProgrammeStatus>('DRAFT');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [selfEnrollment, setSelfEnrollment] = React.useState(true);
  const [maxCapacity, setMaxCapacity] = React.useState<string>('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = React.useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = React.useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        title,
        description: description || null,
        category: category || null,
        status,
        selfEnrollment,
      };
      if (startDate) body.startDate = startDate;
      if (endDate) body.endDate = endDate;
      if (maxCapacity) body.maxCapacity = Number(maxCapacity);
      if (thumbnailUrl) body.thumbnailUrl = thumbnailUrl;

      const res = await api.post<{ id: string; slug: string }>(
        '/api/v1/admin/programmes',
        body,
        accessToken,
      );

      router.push(`/admin/programmes/${res.id}/structure`);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 401) {
        useAuthStore.getState().clearAuth();
        router.push('/auth/login');
        return;
      }
      setError(e instanceof Error ? e.message : 'Failed to create programme.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create new programme</h1>
          <p className="text-gray-500">
            Step 1 of 3: Basic information. You can add structure and batches after saving.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/admin/programmes')}
        >
          Cancel
        </Button>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Basic information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="title">Programme title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Advanced Machine Learning with TensorFlow"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Comprehensive course covering neural networks, deep learning, computer vision, and NLP..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Data Science"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as ProgrammeStatus)}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="DRAFT" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Duration (weeks)</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                  placeholder="50"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={selfEnrollment}
                  onChange={(e) => setSelfEnrollment(e.target.checked)}
                />
                Allow self-enrollment for this programme
              </Label>
            </div>

            <div className="space-y-2">
              <Label>Programme thumbnail</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    setThumbnailFile(null);
                    setThumbnailPreview(null);
                    setThumbnailUrl(null);
                    return;
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    setError('Thumbnail must be 5MB or smaller.');
                    setThumbnailFile(null);
                    setThumbnailPreview(null);
                    setThumbnailUrl(null);
                    return;
                  }
                  setError(null);
                  setThumbnailFile(file);
                  const reader = new FileReader();
                  reader.onload = () => {
                    if (typeof reader.result === 'string') {
                      setThumbnailPreview(reader.result);
                    }
                  };
                  reader.readAsDataURL(file);

                  if (!supabase) {
                    // Supabase not configured; skip upload, programme can still be created without thumbnail URL.
                    return;
                  }

                  const ext = file.name.split('.').pop() || 'png';
                  const path = `programme-thumbnails/${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2)}.${ext}`;

                  const { error: uploadError } = await supabase.storage
                    .from('thumbnails')
                    .upload(path, file, {
                      cacheControl: '3600',
                      upsert: false,
                    });

                  if (uploadError) {
                    setError(
                      'Could not upload thumbnail (Supabase security policy). Programme will be saved without thumbnail.',
                    );
                    setThumbnailUrl(null);
                    return;
                  }

                  const { data } = supabase.storage.from('thumbnails').getPublicUrl(path);
                  if (data?.publicUrl) {
                    setThumbnailUrl(data.publicUrl);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-between rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-left text-sm text-gray-500 hover:border-gray-400 hover:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                    <ImageIcon className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      {thumbnailFile ? thumbnailFile.name : 'Drop image here or click to upload'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Recommended: 1280x720px, max 5MB. Image is stored with this draft only; backend
                      storage can be wired to use Supabase/S3.
                    </p>
                  </div>
                </div>
                {thumbnailPreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnailPreview}
                    alt="Programme thumbnail preview"
                    className="ml-4 h-12 w-20 rounded object-cover"
                  />
                )}
              </button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/programmes')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save & Continue →'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

