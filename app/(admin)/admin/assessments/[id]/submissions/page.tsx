'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Users, BarChart3, CheckCircle, XCircle,
  Plus, Trash2, GripVertical, Edit3, ChevronUp, ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface AssessmentDetail {
  id: string;
  title: string;
  status: string;
  type: string;
  total_points: number;
  passing_score: number | null;
  questions: { id: string; question_text: string; type: string; points: number }[];
  _count: { submissions: number };
}

interface Submission {
  id: string;
  attempt_number: number;
  status: string;
  started_at: string;
  submitted_at: string | null;
  total_score: number | null;
  percentage: number | null;
  is_passed: boolean | null;
  time_taken_seconds: number | null;
  users_submissions_user_idTousers: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface Analytics {
  total_submissions: number;
  avg_score: number;
  pass_rate: number;
  score_distribution: { range: string; count: number }[];
}

export default function AssessmentSubmissionsPage() {
  const params = useParams();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const id = params.id as string;

  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);

  // Question builder state
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [showBank, setShowBank] = useState(false);
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);
  const [deleteQuestionText, setDeleteQuestionText] = useState('');
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCsv, setImportCsv] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: { row: number; message: string }[] } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [bankSearch, setBankSearch] = useState('');
  const [bankLoading, setBankLoading] = useState(false);
  const bankTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Live search for question bank
  useEffect(() => {
    if (!showBank || !accessToken) return;
    if (bankTimerRef.current) clearTimeout(bankTimerRef.current);
    bankTimerRef.current = setTimeout(async () => {
      setBankLoading(true);
      try {
        const res = await api.get<{ data: any[] }>(
          `/api/v1/admin/assessments/question-bank?search=${encodeURIComponent(bankSearch)}&limit=20`,
          accessToken,
        );
        setBankQuestions(res.data);
      } catch {}
      setBankLoading(false);
    }, bankSearch ? 400 : 0); // 400ms debounce when typing, immediate on open
    return () => { if (bankTimerRef.current) clearTimeout(bankTimerRef.current); };
  }, [showBank, bankSearch, accessToken]);
  const [editOptions, setEditOptions] = useState<{ id: string; text: string; correct: boolean }[]>([]);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [newQ, setNewQ] = useState({ type: 'MCQ_SINGLE', text: '', points: '10', explanation: '', tags: '', imageUrl: '' });
  const [newQOptions, setNewQOptions] = useState<{ text: string; correct: boolean; imageUrl: string }[]>([
    { text: '', correct: false, imageUrl: '' },
    { text: '', correct: false, imageUrl: '' },
  ]);

  useEffect(() => {
    if (!accessToken || !id) return;

    Promise.all([
      api.get<AssessmentDetail>(`/api/v1/admin/assessments/${id}`, accessToken),
      api.get<Submission[]>(`/api/v1/admin/assessments/${id}/submissions`, accessToken),
      api.get<Analytics>(`/api/v1/admin/assessments/${id}/analytics`, accessToken).catch(() => null),
    ])
      .then(([detail, subs, anal]) => {
        setAssessment(detail);
        setSubmissions(subs);
        if (anal) setAnalytics(anal);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken, id]);

  async function handleAddQuestion() {
    if (!accessToken || !newQ.text.trim()) return;
    setAddingQuestion(true);
    setQuestionError(null);
    try {
      const body: Record<string, unknown> = {
        type: newQ.type,
        question_text: newQ.text.trim(),
        points: parseFloat(newQ.points) || 10,
        explanation: newQ.explanation.trim() || null,
        tags: newQ.tags.split(',').map((t) => t.trim()).filter(Boolean),
        image_url: newQ.imageUrl.trim() || null,
      };
      if (['MCQ_SINGLE', 'MCQ_MULTI', 'TRUE_FALSE'].includes(newQ.type)) {
        body.options = newQOptions
          .filter((o) => o.text.trim())
          .map((o) => ({ option_text: o.text.trim(), is_correct: o.correct, image_url: o.imageUrl.trim() || null }));
      }
      await api.post(`/api/v1/admin/assessments/${id}/questions`, body, accessToken);
      // Refresh assessment
      const detail = await api.get<AssessmentDetail>(`/api/v1/admin/assessments/${id}`, accessToken);
      setAssessment(detail);
      // Reset form
      setNewQ({ type: 'MCQ_SINGLE', text: '', points: '10', explanation: '', tags: '', imageUrl: '' });
      setNewQOptions([{ text: '', correct: false, imageUrl: '' }, { text: '', correct: false, imageUrl: '' }]);
      setShowAddQuestion(false);
    } catch (err) {
      setQuestionError(err instanceof Error ? err.message : 'Failed to add question');
    } finally {
      setAddingQuestion(false);
    }
  }

  async function handleAutoGrade() {
    if (!accessToken) return;
    setGrading(true);
    try {
      await api.post(`/api/v1/admin/assessments/${id}/auto-grade`, {}, accessToken);
      // Refresh submissions
      const subs = await api.get<Submission[]>(`/api/v1/admin/assessments/${id}/submissions`, accessToken);
      setSubmissions(subs);
      const anal = await api.get<Analytics>(`/api/v1/admin/assessments/${id}/analytics`, accessToken);
      setAnalytics(anal);
    } catch {}
    setGrading(false);
  }

  async function handlePublish() {
    if (!accessToken) return;
    setPublishing(true);
    try {
      await api.post(`/api/v1/admin/assessments/${id}/publish`, {}, accessToken);
      const detail = await api.get<AssessmentDetail>(`/api/v1/admin/assessments/${id}`, accessToken);
      setAssessment(detail);
      setShowPublishModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to publish');
    }
    setPublishing(false);
  }

  if (loading) {
    return <div className="space-y-4"><div className="h-8 w-48 animate-pulse rounded bg-gray-200" /><div className="h-64 animate-pulse rounded-xl bg-gray-200" /></div>;
  }

  if (!assessment) {
    return <div className="py-16 text-center text-gray-400">Assessment not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/assessments')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{assessment.title}</h1>
            <p className="text-sm text-gray-500">
              {assessment.type} | {assessment.questions.length} questions | {Number(assessment.total_points)} pts
            </p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            assessment.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
            assessment.status === 'DRAFT' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
            assessment.status === 'GRADED' ? 'bg-blue-100 text-blue-700' :
            'bg-red-100 text-red-700'
          }`}>
            {assessment.status}
          </span>
        </div>
        <div className="flex gap-2">
          {assessment.status === 'DRAFT' && (
            <Button onClick={() => setShowPublishModal(true)}>Publish</Button>
          )}
          <Button variant="outline" onClick={handleAutoGrade} disabled={grading}>
            {grading ? 'Grading...' : 'Auto-Grade All'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {analytics && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{analytics.total_submissions}</p>
                <p className="text-xs text-gray-500">Submissions</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{analytics.avg_score}%</p>
                <p className="text-xs text-gray-500">Average Score</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{analytics.pass_rate}%</p>
                <p className="text-xs text-gray-500">Pass Rate</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Submissions ({submissions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <p className="py-8 text-center text-gray-400">No submissions yet</p>
          ) : (
            <div className="rounded-lg border">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50 text-left text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Learner</th>
                    <th className="px-4 py-3">Attempt</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Result</th>
                    <th className="px-4 py-3">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{sub.users_submissions_user_idTousers.full_name}</p>
                        <p className="text-xs text-gray-400">{sub.users_submissions_user_idTousers.email}</p>
                      </td>
                      <td className="px-4 py-3">#{sub.attempt_number}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          sub.status === 'GRADED' ? 'bg-blue-100 text-blue-700' :
                          sub.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {sub.total_score != null ? `${Number(sub.total_score)}/${Number(assessment.total_points)} (${Number(sub.percentage)}%)` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {sub.is_passed === true && <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-3 w-3" /> Pass</span>}
                        {sub.is_passed === false && <span className="flex items-center gap-1 text-red-600"><XCircle className="h-3 w-3" /> Fail</span>}
                        {sub.is_passed == null && <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions Section with Builder */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Questions ({assessment.questions.length})</CardTitle>
          {assessment.status === 'DRAFT' && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowImportModal(true)}>
                Import
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowBank(true)}>
                Add from Bank
              </Button>
              <Button size="sm" onClick={() => setShowAddQuestion(true)}>
                <Plus className="mr-1 h-4 w-4" /> Add Question
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Add Question Form */}
          {showAddQuestion && assessment.status === 'DRAFT' && (
            <div className="mb-6 rounded-lg border-2 border-blue-200 bg-blue-50/50 p-4 space-y-4">
              <h4 className="font-medium text-sm">New Question</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Question Type</Label>
                  <select
                    value={newQ.type}
                    onChange={(e) => {
                      setNewQ({ ...newQ, type: e.target.value });
                      if (['MCQ_SINGLE', 'TRUE_FALSE'].includes(e.target.value) && newQOptions.length === 0) {
                        setNewQOptions(e.target.value === 'TRUE_FALSE'
                          ? [{ text: 'True', correct: true, imageUrl: '' }, { text: 'False', correct: false, imageUrl: '' }]
                          : [{ text: '', correct: false, imageUrl: '' }, { text: '', correct: false, imageUrl: '' }]
                        );
                      } else if (['MCQ_MULTI'].includes(e.target.value) && newQOptions.length === 0) {
                        setNewQOptions([{ text: '', correct: false, imageUrl: '' }, { text: '', correct: false, imageUrl: '' }, { text: '', correct: false, imageUrl: '' }]);
                      } else if (['SHORT_ANSWER', 'LONG_ANSWER', 'FILE_UPLOAD'].includes(e.target.value)) {
                        setNewQOptions([]);
                      }
                    }}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="MCQ_SINGLE">MCQ - Single Answer</option>
                    <option value="MCQ_MULTI">MCQ - Multiple Answers</option>
                    <option value="TRUE_FALSE">True / False</option>
                    <option value="SHORT_ANSWER">Short Answer</option>
                    <option value="LONG_ANSWER">Long Answer</option>
                    <option value="FILE_UPLOAD">File Upload</option>
                  </select>
                </div>
                <div>
                  <Label>Points</Label>
                  <Input type="number" value={newQ.points} onChange={(e) => setNewQ({ ...newQ, points: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Question Text *</Label>
                <textarea
                  value={newQ.text}
                  onChange={(e) => setNewQ({ ...newQ, text: e.target.value })}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Enter your question..."
                />
              </div>
              <div>
                <Label>Explanation (shown after grading)</Label>
                <Input value={newQ.explanation} onChange={(e) => setNewQ({ ...newQ, explanation: e.target.value })} placeholder="Why this is the correct answer..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tags (comma-separated)</Label>
                  <Input value={newQ.tags} onChange={(e) => setNewQ({ ...newQ, tags: e.target.value })} placeholder="python, loops, basics" />
                </div>
                <div>
                  <Label>Image URL (optional)</Label>
                  <Input value={newQ.imageUrl} onChange={(e) => setNewQ({ ...newQ, imageUrl: e.target.value })} placeholder="https://... or upload to Content Library first" />
                </div>
              </div>

              {newQ.imageUrl && (
                <div className="rounded-lg border p-2">
                  <img src={newQ.imageUrl} alt="Question image preview" className="max-h-32 rounded object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}

              {/* Options for MCQ / True-False */}
              {['MCQ_SINGLE', 'MCQ_MULTI', 'TRUE_FALSE'].includes(newQ.type) && (
                <div className="space-y-2">
                  <Label>Options</Label>
                  {newQOptions.map((opt, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <input
                          type={newQ.type === 'MCQ_MULTI' ? 'checkbox' : 'radio'}
                          name="correct-option"
                          checked={opt.correct}
                          onChange={() => {
                            if (newQ.type === 'MCQ_MULTI') {
                              setNewQOptions(newQOptions.map((o, j) => j === i ? { ...o, correct: !o.correct } : o));
                            } else {
                              setNewQOptions(newQOptions.map((o, j) => ({ ...o, correct: j === i })));
                            }
                          }}
                          className="shrink-0"
                        />
                        <Input
                          value={opt.text}
                          onChange={(e) => setNewQOptions(newQOptions.map((o, j) => j === i ? { ...o, text: e.target.value } : o))}
                          placeholder={`Option ${i + 1}`}
                          className="flex-1"
                          disabled={newQ.type === 'TRUE_FALSE'}
                        />
                        <Input
                          value={opt.imageUrl}
                          onChange={(e) => setNewQOptions(newQOptions.map((o, j) => j === i ? { ...o, imageUrl: e.target.value } : o))}
                          placeholder="Image URL (optional)"
                          className="w-48"
                          disabled={newQ.type === 'TRUE_FALSE'}
                        />
                        {newQ.type !== 'TRUE_FALSE' && newQOptions.length > 2 && (
                          <button onClick={() => setNewQOptions(newQOptions.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {opt.imageUrl && (
                        <img src={opt.imageUrl} alt={`Option ${i + 1}`} className="ml-6 max-h-16 rounded object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      )}
                    </div>
                  ))}
                  {newQ.type !== 'TRUE_FALSE' && (
                    <button onClick={() => setNewQOptions([...newQOptions, { text: '', correct: false, imageUrl: '' }])} className="text-sm text-blue-600 hover:underline">
                      + Add Option
                    </button>
                  )}
                  <p className="text-xs text-gray-400">
                    {newQ.type === 'MCQ_SINGLE' ? 'Select the one correct answer' :
                     newQ.type === 'MCQ_MULTI' ? 'Check all correct answers' :
                     'Select the correct answer'}
                  </p>
                </div>
              )}

              {addingQuestion && <p className="text-sm text-blue-600">Adding question...</p>}
              {questionError && <p className="text-sm text-red-600">{questionError}</p>}

              <div className="flex gap-2">
                <Button onClick={handleAddQuestion} disabled={addingQuestion || !newQ.text.trim()}>
                  <Plus className="mr-1 h-4 w-4" /> Add Question
                </Button>
                <Button variant="outline" onClick={() => { setShowAddQuestion(false); setQuestionError(null); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Existing Questions List */}
          {assessment.questions.length === 0 ? (
            <p className="py-4 text-center text-gray-400">
              {assessment.status === 'DRAFT' ? 'No questions yet. Click "Add Question" above.' : 'No questions in this assessment.'}
            </p>
          ) : (
            <div className="space-y-3">
              {assessment.questions.map((q: any, i: number) => (
                <div key={q.id} className="rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <GripVertical className="h-4 w-4 text-gray-300 shrink-0" />
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{q.question_text}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">{q.type.replace('_', ' ')} | {Number(q.points)} pts</span>
                          {q.tags?.length > 0 && q.tags.map((tag: string) => (
                            <span key={tag} className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {assessment.status === 'DRAFT' && (
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          onClick={async () => {
                            if (!accessToken || i === 0) return;
                            const ids = assessment.questions.map((qq: any) => qq.id);
                            [ids[i], ids[i - 1]] = [ids[i - 1], ids[i]];
                            await api.put(`/api/v1/admin/assessments/${id}/questions/reorder`, { questionIds: ids }, accessToken);
                            const detail = await api.get<AssessmentDetail>(`/api/v1/admin/assessments/${id}`, accessToken);
                            setAssessment(detail);
                          }}
                          className={`p-1 rounded ${i === 0 ? 'text-gray-200' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                          title="Move up"
                          disabled={i === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!accessToken || i === assessment.questions.length - 1) return;
                            const ids = assessment.questions.map((qq: any) => qq.id);
                            [ids[i], ids[i + 1]] = [ids[i + 1], ids[i]];
                            await api.put(`/api/v1/admin/assessments/${id}/questions/reorder`, { questionIds: ids }, accessToken);
                            const detail = await api.get<AssessmentDetail>(`/api/v1/admin/assessments/${id}`, accessToken);
                            setAssessment(detail);
                          }}
                          className={`p-1 rounded ${i === assessment.questions.length - 1 ? 'text-gray-200' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                          title="Move down"
                          disabled={i === assessment.questions.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (editingQuestionId === q.id) {
                              setEditingQuestionId(null);
                            } else {
                              setEditingQuestionId(q.id);
                              setEditOptions((q.question_options ?? []).map((o: any) => ({
                                id: o.id, text: o.option_text, correct: o.is_correct,
                              })));
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                          title="Edit question"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteQuestionId(q.id);
                            setDeleteQuestionText(q.question_text);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                          title="Delete question"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Image preview */}
                  {q.image_url && (
                    <div className="mt-2 ml-9">
                      <img src={q.image_url} alt="Question" className="max-h-24 rounded border object-contain" />
                    </div>
                  )}

                  {/* Inline Edit Form */}
                  {editingQuestionId === q.id && assessment.status === 'DRAFT' && (
                    <div className="mt-3 ml-9 space-y-3 rounded-lg border border-blue-200 bg-white p-3">
                      <div>
                        <Label className="text-xs">Question Text</Label>
                        <textarea
                          defaultValue={q.question_text}
                          id={`edit-text-${q.id}`}
                          rows={2}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Points</Label>
                          <Input type="number" defaultValue={Number(q.points)} id={`edit-pts-${q.id}`} />
                        </div>
                        <div>
                          <Label className="text-xs">Image URL</Label>
                          <Input defaultValue={q.image_url ?? ''} id={`edit-img-${q.id}`} placeholder="https://..." />
                        </div>
                        <div>
                          <Label className="text-xs">Tags</Label>
                          <Input defaultValue={(q.tags ?? []).join(', ')} id={`edit-tags-${q.id}`} />
                        </div>
                      </div>

                      {/* Options editor for MCQ/T-F */}
                      {['MCQ_SINGLE', 'MCQ_MULTI', 'TRUE_FALSE'].includes(q.type) && editOptions.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs">Options</Label>
                          {editOptions.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <input
                                type={q.type === 'MCQ_MULTI' ? 'checkbox' : 'radio'}
                                name={`edit-correct-${q.id}`}
                                checked={opt.correct}
                                onChange={() => {
                                  if (q.type === 'MCQ_MULTI') {
                                    setEditOptions(editOptions.map((o, j) => j === oi ? { ...o, correct: !o.correct } : o));
                                  } else {
                                    setEditOptions(editOptions.map((o, j) => ({ ...o, correct: j === oi })));
                                  }
                                }}
                                className="shrink-0"
                              />
                              <Input
                                value={opt.text}
                                onChange={(e) => setEditOptions(editOptions.map((o, j) => j === oi ? { ...o, text: e.target.value } : o))}
                                className="flex-1"
                                disabled={q.type === 'TRUE_FALSE'}
                              />
                              {opt.correct && <span className="text-xs text-green-600 shrink-0">Correct</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!accessToken) return;
                            const text = (document.getElementById(`edit-text-${q.id}`) as HTMLTextAreaElement)?.value;
                            const pts = (document.getElementById(`edit-pts-${q.id}`) as HTMLInputElement)?.value;
                            const img = (document.getElementById(`edit-img-${q.id}`) as HTMLInputElement)?.value;
                            const tags = (document.getElementById(`edit-tags-${q.id}`) as HTMLInputElement)?.value;
                            const body: Record<string, unknown> = {
                              question_text: text,
                              points: parseFloat(pts) || Number(q.points),
                              image_url: img.trim() || null,
                              tags: tags.split(',').map((t: string) => t.trim()).filter(Boolean),
                            };
                            if (['MCQ_SINGLE', 'MCQ_MULTI', 'TRUE_FALSE'].includes(q.type) && editOptions.length > 0) {
                              body.options = editOptions.map((o) => ({
                                option_text: o.text, is_correct: o.correct,
                              }));
                            }
                            await api.patch(
                              `/api/v1/admin/assessments/${id}/questions/${q.id}`,
                              body,
                              accessToken,
                            );
                            const detail = await api.get<AssessmentDetail>(`/api/v1/admin/assessments/${id}`, accessToken);
                            setAssessment(detail);
                            setEditingQuestionId(null);
                          }}
                        >
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingQuestionId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Import Questions Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowImportModal(false); setImportResult(null); setImportCsv(''); }}>
          <div className="w-full max-w-2xl max-h-[85vh] overflow-auto rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Import Questions</h3>

            <div className="flex gap-2 mb-4">
              <div className="flex-1 rounded-lg border-2 border-blue-200 bg-blue-50 p-4 cursor-pointer">
                <p className="font-medium text-blue-700">📄 CSV Upload</p>
                <p className="text-xs text-blue-600 mt-1">Upload a CSV file with questions</p>
              </div>
              <div className="flex-1 rounded-lg border-2 border-gray-200 bg-gray-50 p-4 cursor-not-allowed opacity-60">
                <p className="font-medium text-gray-500">📋 PDF / DOCX</p>
                <p className="text-xs text-gray-400 mt-1">Coming soon — AI-powered parsing</p>
              </div>
            </div>

            {/* CSV Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Upload CSV File</Label>
                <button
                  onClick={() => {
                    const template = 'type,question_text,option_a,option_b,option_c,option_d,correct_options,points,explanation,tags\nMCQ_SINGLE,What is 2+2?,3,4,5,6,B,10,Basic math,math;arithmetic\nMCQ_MULTI,"Select prime numbers",2,4,7,9,A;C,10,"2 and 7 are prime",math;prime\nTRUE_FALSE,The earth is round,True,False,,,A,5,Basic geography,geography\nSHORT_ANSWER,Define gravity,,,,,,10,Force of attraction,physics\nLONG_ANSWER,Explain photosynthesis,,,,,,20,,biology';
                    const blob = new Blob([template], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'question_template.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Download Template
                </button>
              </div>

              <div
                onClick={() => csvInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 cursor-pointer hover:border-gray-400"
              >
                <p className="text-sm text-gray-600">Click to select CSV file</p>
                <p className="text-xs text-gray-400 mt-1">or paste CSV content below</p>
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setImportCsv(ev.target?.result as string ?? '');
                      reader.readAsText(file);
                    }
                  }}
                />
              </div>

              <div>
                <Label className="text-xs text-gray-500">Or paste CSV content:</Label>
                <textarea
                  value={importCsv}
                  onChange={(e) => setImportCsv(e.target.value)}
                  rows={6}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs font-mono"
                  placeholder="type,question_text,option_a,option_b,option_c,option_d,correct_options,points,explanation,tags&#10;MCQ_SINGLE,What is 2+2?,3,4,5,6,B,10,Basic math,math"
                />
              </div>

              <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
                <p className="font-medium mb-1">CSV Format Guide:</p>
                <ul className="list-disc ml-4 space-y-0.5">
                  <li><strong>type:</strong> MCQ_SINGLE, MCQ_MULTI, TRUE_FALSE, SHORT_ANSWER, LONG_ANSWER, FILE_UPLOAD</li>
                  <li><strong>correct_options:</strong> A, B, C, D (use ; for multiple: A;C)</li>
                  <li><strong>tags:</strong> semicolon-separated (math;algebra)</li>
                  <li>Leave option columns empty for SHORT/LONG/FILE_UPLOAD questions</li>
                </ul>
              </div>

              {importResult && (
                <div className={`rounded-lg p-3 text-sm ${importResult.errors.length > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                  <p className="font-medium">{importResult.imported} question(s) imported successfully</p>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-red-600">{importResult.errors.length} error(s):</p>
                      {importResult.errors.map((err, i) => (
                        <p key={i} className="text-xs text-red-500">Row {err.row}: {err.message}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowImportModal(false); setImportResult(null); setImportCsv(''); }}>
                {importResult ? 'Done' : 'Cancel'}
              </Button>
              {!importResult && (
                <Button
                  disabled={importing || !importCsv.trim()}
                  onClick={async () => {
                    if (!accessToken) return;
                    setImporting(true);
                    try {
                      const result = await api.post<{ imported: number; errors: { row: number; message: string }[] }>(
                        `/api/v1/admin/assessments/${id}/import-csv`,
                        { csv: importCsv },
                        accessToken,
                      );
                      setImportResult(result);
                      const detail = await api.get<AssessmentDetail>(`/api/v1/admin/assessments/${id}`, accessToken);
                      setAssessment(detail);
                    } catch (err) {
                      setImportResult({ imported: 0, errors: [{ row: 0, message: err instanceof Error ? err.message : 'Import failed' }] });
                    }
                    setImporting(false);
                  }}
                >
                  {importing ? 'Importing...' : 'Import Questions'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Publish Modal */}
      {showPublishModal && assessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowPublishModal(false)}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-green-700 mb-2">Publish Assessment</h3>
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 mb-4 space-y-2 text-sm">
              <p><strong>{assessment.title}</strong></p>
              <p className="text-gray-600">{assessment.questions.length} questions | {Number(assessment.total_points)} total points</p>
              <div className="border-t border-green-200 pt-2 mt-2 text-gray-600">
                <p>After publishing:</p>
                <ul className="list-disc ml-4 mt-1 space-y-1">
                  <li>Questions will be <strong>locked</strong> (no edit/add/delete)</li>
                  <li>Assessment becomes <strong>visible to learners</strong></li>
                  <li>Status changes to <strong>ACTIVE</strong></li>
                </ul>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPublishModal(false)}>Cancel</Button>
              <Button onClick={handlePublish} disabled={publishing}>
                {publishing ? 'Publishing...' : 'Publish'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Question Modal */}
      {deleteQuestionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteQuestionId(null)}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-red-600 mb-2">Delete Question</h3>
            <p className="text-sm text-gray-600 mb-2">Are you sure you want to delete this question?</p>
            <div className="rounded-lg bg-gray-50 p-3 mb-4">
              <p className="text-sm font-medium line-clamp-3">{deleteQuestionText}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteQuestionId(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!accessToken) return;
                  await api.delete(`/api/v1/admin/assessments/${id}/questions/${deleteQuestionId}`, accessToken);
                  const detail = await api.get<AssessmentDetail>(`/api/v1/admin/assessments/${id}`, accessToken);
                  setAssessment(detail);
                  setDeleteQuestionId(null);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Question Bank Modal */}
      {showBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowBank(false)}>
          <div className="w-full max-w-2xl max-h-[80vh] overflow-auto rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Question Bank</h3>
            <div className="mb-4">
              <Input
                placeholder="Type to search questions by text or tags..."
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                autoFocus
              />
              <p className="mt-1 text-xs text-gray-400">Results update as you type</p>
            </div>

            {bankLoading ? (
              <p className="text-center text-gray-400 py-8">Searching...</p>
            ) : bankQuestions.length === 0 ? (
              <p className="text-center text-gray-400 py-8">
                {bankSearch ? 'No questions found for "' + bankSearch + '"' : 'No questions in the bank yet'}
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-auto">
                {bankQuestions.map((bq: any) => (
                  <div key={bq.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium line-clamp-2">{bq.question_text}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">{bq.type.replace('_', ' ')} | {Number(bq.points)} pts</span>
                        <span className="text-xs text-gray-400">from: {bq.source_assessment}</span>
                        {bq.tags?.map((t: string) => (
                          <span key={t} className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">{t}</span>
                        ))}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 ml-3"
                      onClick={async () => {
                        if (!accessToken) return;
                        await api.post(
                          `/api/v1/admin/assessments/${id}/copy-from-bank`,
                          { questionId: bq.id },
                          accessToken,
                        );
                        const detail = await api.get<AssessmentDetail>(`/api/v1/admin/assessments/${id}`, accessToken);
                        setAssessment(detail);
                        setShowBank(false);
                      }}
                    >
                      <Plus className="mr-1 h-3 w-3" /> Add
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => setShowBank(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
