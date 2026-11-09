import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Trophy,
  BookOpen,
} from 'lucide-react';
import { learningApi, ILearningModuleItem } from '../../api/featureApis';

export const LearningCenterPage: React.FC = () => {
  const [modules, setModules] = useState<ILearningModuleItem[]>([]);
  const [userProgress, setUserProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Active quiz modal state
  const [activeModule, setActiveModule] = useState<ILearningModuleItem | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    setLoading(true);
    try {
      const res = await learningApi.getModules();
      if (res.success) {
        setModules(res.modules || []);
        setUserProgress(res.userProgress);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = (mod: ILearningModuleItem) => {
    setActiveModule(mod);
    setSelectedAnswers({});
    setQuizResult(null);
  };

  const handleSubmitQuiz = async () => {
    if (!activeModule) return;
    setSubmitting(true);

    try {
      const res = await learningApi.submitQuiz(activeModule.id, selectedAnswers);
      if (res.success) {
        setQuizResult(res);
        // Refresh modules to update completed status & badges
        loadModules();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600/10 via-teal-500/5 to-transparent border border-emerald-500/20 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                Cybersecurity Learning Center
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  Interactive Lab
                </span>
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sharpen your threat detection skills, pass defensive challenges, and earn certified security badges
              </p>
            </div>
          </div>

          {/* Gamification Progress Pill */}
          {userProgress && (
            <div className="flex items-center gap-4 bg-white dark:bg-cyber-surface px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-cyber-border shadow-sm">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold">Total Points</div>
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100 font-mono">
                    {userProgress.totalPoints} PTS
                  </div>
                </div>
              </div>

              <div className="h-8 w-[1px] bg-gray-200 dark:bg-cyber-border" />

              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-500" />
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold">Badges</div>
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {userProgress.badges.length} Earned
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Badges Showcase Bar */}
      {userProgress?.badges?.length > 0 && (
        <div className="bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-2xl p-4 shadow-sm">
          <div className="text-xs uppercase font-bold tracking-wider text-gray-400 dark:text-gray-500 mb-2">
            Your Earned Badges
          </div>
          <div className="flex flex-wrap gap-2">
            {userProgress.badges.map((b: string, i: number) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{b}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Learning Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modules.map((mod) => (
          <div
            key={mod.id}
            className="bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition-all"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl">{mod.badgeIcon}</span>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-cyber-card text-gray-600 dark:text-gray-300">
                    {mod.difficulty}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono">
                    +{mod.points} PTS
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  {mod.title}
                  {mod.isCompleted && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 inline-block" />
                  )}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  {mod.description}
                </p>
              </div>

              {/* Lesson bullet points */}
              <div className="space-y-1.5 pt-1">
                {mod.lessons.map((lesson, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                    <span>{lesson}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-cyber-border flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Badge: <strong>{mod.badgeName}</strong>
              </span>

              <button
                onClick={() => handleStartQuiz(mod)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  mod.isCompleted
                    ? 'bg-gray-100 dark:bg-cyber-card hover:bg-gray-200 dark:hover:bg-cyber-border text-gray-700 dark:text-gray-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                }`}
              >
                <span>{mod.isCompleted ? 'Review Challenge' : 'Start Challenge'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Quiz Modal */}
      {activeModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-cyber-border">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{activeModule.badgeIcon}</span>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                    {activeModule.title}
                  </h3>
                  <div className="text-xs text-gray-400">
                    Answer all scenario questions to claim {activeModule.points} points
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveModule(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2"
              >
                ✕
              </button>
            </div>

            {/* Questions list */}
            <div className="space-y-6">
              {activeModule.questions.map((q, qIndex) => {
                const result = quizResult?.results?.find((r: any) => r.questionId === q.id);

                return (
                  <div
                    key={q.id}
                    className="p-4 rounded-2xl bg-gray-50 dark:bg-cyber-card border border-gray-100 dark:border-cyber-border space-y-3"
                  >
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Question {qIndex + 1}
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-relaxed">
                      {q.scenario}
                    </div>

                    <div className="space-y-2 pt-1">
                      {q.options.map((opt, optIndex) => {
                        const isSelected = selectedAnswers[q.id] === optIndex;
                        const isCorrectAnswer = result && result.correctIndex === optIndex;
                        const isWrongChoice = result && isSelected && !result.isCorrect;

                        return (
                          <label
                            key={optIndex}
                            className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                              isCorrectAnswer
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-semibold'
                                : isWrongChoice
                                ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-800 dark:text-rose-300'
                                : isSelected
                                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500/60 text-gray-900 dark:text-gray-100 font-semibold'
                                : 'bg-white dark:bg-cyber-surface border-gray-200 dark:border-cyber-border text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-cyber-border/80'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${q.id}`}
                              checked={isSelected}
                              disabled={Boolean(quizResult)}
                              onChange={() => setSelectedAnswers({ ...selectedAnswers, [q.id]: optIndex })}
                              className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Show explanation after quiz submission */}
                    {result && (
                      <div
                        className={`p-3 rounded-xl text-xs space-y-1 ${
                          result.isCorrect
                            ? 'bg-emerald-100/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                            : 'bg-rose-100/50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5">
                          {result.isCorrect ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Correct!</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-rose-600" />
                              <span>Incorrect</span>
                            </>
                          )}
                        </div>
                        <p>{result.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quiz Result Summary */}
            {quizResult && (
              <div
                className={`p-4 rounded-2xl text-center space-y-2 border ${
                  quizResult.passed
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-900/60 text-amber-800 dark:text-amber-200'
                }`}
              >
                <div className="text-base font-bold">
                  {quizResult.passed ? '🎉 Challenge Passed!' : '⚠️ Needs Another Try'}
                </div>
                <div className="text-xs">
                  Score: <strong>{quizResult.score}</strong>
                  {quizResult.pointsAwarded > 0 && ` • Awarded +${quizResult.pointsAwarded} PTS`}
                  {quizResult.badgeEarned && ` • Badge Earned: ${quizResult.badgeEarned}!`}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-cyber-border">
              <button
                type="button"
                onClick={() => setActiveModule(null)}
                className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-cyber-card hover:bg-gray-200 dark:hover:bg-cyber-border text-gray-700 dark:text-gray-300 font-semibold text-xs transition-colors"
              >
                Close
              </button>

              {!quizResult ? (
                <button
                  type="button"
                  onClick={handleSubmitQuiz}
                  disabled={
                    submitting ||
                    Object.keys(selectedAnswers).length < activeModule.questions.length
                  }
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow-sm"
                >
                  {submitting ? 'Checking...' : 'Submit Answers'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAnswers({});
                    setQuizResult(null);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-sm"
                >
                  Retry Challenge
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

