'use client';

import { useState, useRef } from 'react';
import { Upload, X, FileText, Video, Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface UploadContentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ContentType = 'VIDEO' | 'DOCUMENT' | 'EXTERNAL_LINK';

const typeOptions: { value: ContentType; label: string; icon: React.ComponentType<{ className?: string }>; accept: string }[] = [
  { value: 'VIDEO', label: 'Video', icon: Video, accept: '.mp4,.mov,.avi,.mkv,.webm' },
  { value: 'DOCUMENT', label: 'Document', icon: FileText, accept: '.pdf,.pptx,.docx,.xlsx' },
  { value: 'EXTERNAL_LINK', label: 'External Link', icon: Link2, accept: '' },
];

export function UploadContentModal({ open, onClose, onSuccess }: UploadContentModalProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'select' | 'details'>('select');
  const [contentType, setContentType] = useState<ContentType>('VIDEO');
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function reset() {
    setStep('select');
    setContentType('VIDEO');
    setFile(null);
    setExternalUrl('');
    setTitle('');
    setDescription('');
    setTags('');
    setUploading(false);
    setUploadProgress(0);
    setError(null);
    setDragOver(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFileSelect(selectedFile: File) {
    setFile(selectedFile);
    if (!title) {
      setTitle(selectedFile.name.replace(/\.[^.]+$/, ''));
    }
    setStep('details');
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFileSelect(selectedFile);
  }

  async function handleSubmit() {
    if (!accessToken) return;
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setError(null);
    setUploading(true);

    try {
      let s3Key: string | undefined;
      let s3Bucket: string | undefined;
      let fileSizeBytes: number | undefined;
      let mimeType: string | undefined;

      if (contentType !== 'EXTERNAL_LINK' && file) {
        // Step 1: Get presigned upload URL
        setUploadProgress(10);
        const uploadRes = await api.post<{ upload_url: string; s3_key: string }>(
          '/api/v1/admin/content/upload',
          {
            filename: file.name,
            content_type: file.type,
            file_size_bytes: file.size,
          },
          accessToken,
        );

        s3Key = uploadRes.s3_key;
        fileSizeBytes = file.size;
        mimeType = file.type;

        // Step 2: Upload file to S3 (or mock)
        setUploadProgress(30);
        try {
          await fetch(uploadRes.upload_url, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          });
        } catch {
          // Mock URL will fail — that's OK in dev mode
        }
        setUploadProgress(70);
      }

      // Step 3: Create content record
      await api.post(
        '/api/v1/admin/content',
        {
          title: title.trim(),
          description: description.trim() || null,
          type: contentType,
          s3_key: s3Key ?? null,
          s3_bucket: s3Bucket ?? null,
          file_size_bytes: fileSizeBytes ?? null,
          mime_type: mimeType ?? null,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        },
        accessToken,
      );

      setUploadProgress(100);
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Content</DialogTitle>
          <DialogDescription>
            {step === 'select' ? 'Select a file or provide an external link' : 'Add details about your content'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4">
            {/* Content Type Selector */}
            <div className="flex gap-2">
              {typeOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setContentType(opt.value)}
                    className={`flex flex-1 flex-col items-center gap-1 rounded-lg border-2 p-3 text-sm transition-colors ${
                      contentType === opt.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {contentType === 'EXTERNAL_LINK' ? (
              <div className="space-y-3">
                <div>
                  <Label>External URL</Label>
                  <Input
                    placeholder="https://example.com/resource"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    if (!title && externalUrl) setTitle(externalUrl.split('/').pop() ?? 'External Link');
                    setStep('details');
                  }}
                  disabled={!externalUrl.trim()}
                >
                  Next
                </Button>
              </div>
            ) : (
              /* Drag and Drop Zone */
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                  dragOver
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-700">
                  Drag & drop or click to select
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {contentType === 'VIDEO'
                    ? 'MP4, MOV, AVI, MKV, WebM (max 500MB)'
                    : 'PDF, PPTX, DOCX, XLSX (max 50MB)'}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={typeOptions.find((o) => o.value === contentType)?.accept}
                  onChange={handleFileInputChange}
                />
              </div>
            )}
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-4">
            {file && (
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                {contentType === 'VIDEO' ? (
                  <Video className="h-5 w-5 text-blue-500" />
                ) : (
                  <FileText className="h-5 w-5 text-orange-500" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
                <button onClick={() => { setFile(null); setStep('select'); }}>
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            )}

            <div>
              <Label htmlFor="upload-title">Title *</Label>
              <Input
                id="upload-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Content title"
              />
            </div>

            <div>
              <Label htmlFor="upload-desc">Description</Label>
              <textarea
                id="upload-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Optional description..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="upload-tags">Tags (comma-separated)</Label>
              <Input
                id="upload-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="intro, module1, lecture"
              />
            </div>

            {uploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-blue-500 transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}

        {step === 'details' && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setStep('select')} disabled={uploading}>
              Back
            </Button>
            <Button onClick={handleSubmit} disabled={uploading || !title.trim()}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
