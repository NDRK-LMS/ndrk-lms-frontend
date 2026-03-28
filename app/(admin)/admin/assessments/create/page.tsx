'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface ProgrammeOption { id: string; title: string }
interface ModuleOption { id: string; title: string }
interface BatchOption { id: string; name: string }

export default function CreateAssessmentPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  // Dropdown data
  const [programmes, setProgrammes] = useState<ProgrammeOption[]>([]);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('QUIZ');
  const [programmeId, setProgrammeId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [maxAttempts, setMaxAttempts] = useState('1');
  const [passingScore, setPassingScore] = useState('60');
  const [totalPoints, setTotalPoints] = useState('100');
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [showResults, setShowResults] = useState('AFTER_GRADING');
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [negativeMarkValue, setNegativeMarkValue] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableUntil, setAvailableUntil] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load programmes on mount
  useEffect(() => {
    if (!accessToken) return;
    api
      .get<{ programmes: ProgrammeOption[] }>('/api/v1/admin/programmes?limit=100', accessToken)
      .then((res) => setProgrammes(res.programmes ?? []))
      .catch(() => {});
  }, [accessToken]);

  // Load modules & batches when programme changes
  useEffect(() => {
    if (!accessToken || !programmeId) {
      setModules([]);
      setBatches([]);
      setModuleId('');
      setBatchId('');
      return;
    }

    api
      .get<{ programme: { id: string }; modules: ModuleOption[]; batches: BatchOption[] }>(
        `/api/v1/admin/programmes/${programmeId}`,
        accessToken,
      )
      .then((res) => {
        setModules(res.modules ?? []);
        setBatches(res.batches ?? []);
      })
      .catch(() => {});
  }, [accessToken, programmeId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !title.trim() || !programmeId) {
      setError('Title and Programme are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await api.post<{ id: string }>(
        '/api/v1/admin/assessments',
        {
          title: title.trim(),
          description: description.trim() || null,
          type,
          programme_id: programmeId,
          module_id: moduleId || null,
          batch_id: batchId || null,
          duration_minutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
          max_attempts: parseInt(maxAttempts, 10) || 1,
          passing_score: parseFloat(passingScore) || null,
          total_points: parseFloat(totalPoints) || 100,
          shuffle_questions: shuffleQuestions,
          show_results: showResults,
          negative_marking: negativeMarking,
          negative_mark_value: negativeMarkValue ? parseFloat(negativeMarkValue) : null,
          available_from: availableFrom || null,
          available_until: availableUntil || null,
        },
        accessToken,
      );
      router.push(`/admin/assessments/${result.id}/submissions`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assessment');
    } finally {
      setSaving(false);
    }
  }

  const selectClass = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/assessments')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Create Assessment</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Assessment Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Module 1 Quiz" />
            </div>

            <div>
              <Label>Description</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Instructions for learners..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <select value={type} onChange={(e) => setType(e.target.value)} className={selectClass}>
                  <option value="QUIZ">Quiz</option>
                  <option value="ASSIGNMENT">Assignment</option>
                  <option value="EXAM">Exam</option>
                  <option value="PRACTICE">Practice</option>
                </select>
              </div>
              <div>
                <Label>Programme *</Label>
                <select value={programmeId} onChange={(e) => setProgrammeId(e.target.value)} className={selectClass}>
                  <option value="">Select a programme</option>
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Module (optional)</Label>
                <select value={moduleId} onChange={(e) => setModuleId(e.target.value)} className={selectClass} disabled={!programmeId}>
                  <option value="">All modules</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
                {programmeId && modules.length === 0 && (
                  <p className="mt-1 text-xs text-gray-400">No modules in this programme</p>
                )}
              </div>
              <div>
                <Label>Batch (optional)</Label>
                <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className={selectClass} disabled={!programmeId}>
                  <option value="">All batches</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                {programmeId && batches.length === 0 && (
                  <p className="mt-1 text-xs text-gray-400">No batches in this programme</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Duration (min)</Label>
                <Input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="30" />
              </div>
              <div>
                <Label>Max Attempts</Label>
                <Input type="number" value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} />
              </div>
              <div>
                <Label>Total Points</Label>
                <Input type="number" value={totalPoints} onChange={(e) => setTotalPoints(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Passing Score (%)</Label>
                <Input type="number" value={passingScore} onChange={(e) => setPassingScore(e.target.value)} />
              </div>
              <div>
                <Label>Show Results</Label>
                <select value={showResults} onChange={(e) => setShowResults(e.target.value)} className={selectClass}>
                  <option value="IMMEDIATELY">Immediately</option>
                  <option value="AFTER_CLOSE">After Close</option>
                  <option value="AFTER_GRADING">After Grading</option>
                  <option value="NEVER">Never</option>
                </select>
              </div>
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={shuffleQuestions} onChange={(e) => setShuffleQuestions(e.target.checked)} />
                Shuffle Questions
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={negativeMarking} onChange={(e) => setNegativeMarking(e.target.checked)} />
                Negative Marking
              </label>
            </div>

            {negativeMarking && (
              <div>
                <Label>Negative Mark Value (points deducted per wrong answer)</Label>
                <Input type="number" value={negativeMarkValue} onChange={(e) => setNegativeMarkValue(e.target.value)} placeholder="1" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Available From (opens at)</Label>
                <Input type="datetime-local" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} />
              </div>
              <div>
                <Label>Available Until (closes at)</Label>
                <Input type="datetime-local" value={availableUntil} onChange={(e) => setAvailableUntil(e.target.value)} />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" disabled={saving} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Creating...' : 'Create Assessment (DRAFT)'}
            </Button>

            <p className="text-xs text-gray-400 text-center">
              Assessment will be created as DRAFT. Add questions, then publish.
            </p>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
