const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export interface GeneratedQuestion {
  id: string;
  title: string;
  description: string;
  category?: string;
  triggered_by_question_id?: string;
  created_at?: string;
}

export async function generateFollowUpQuestions(
  userId: string,
  userResponse: string,
  triggeredByQuestionId: string,
  userProfile?: Record<string, unknown>
): Promise<GeneratedQuestion[]> {
  try {
    console.log('[QuestionGen] Requesting follow-up questions for:', triggeredByQuestionId);

    const response = await fetch(`${BACKEND_URL}/api/scenario-questions/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        userResponse,
        triggeredByQuestionId,
        userProfile,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate questions: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[QuestionGen] Generated', data.questions?.length || 0, 'questions');
    return data.questions || [];
  } catch (error) {
    console.error('[QuestionGen] Error generating questions:', error);
    return [];
  }
}

export async function getCachedQuestions(
  userId: string,
  limit: number = 10
): Promise<GeneratedQuestion[]> {
  try {
    console.log('[QuestionGen] Fetching cached questions for user');

    const response = await fetch(
      `${BACKEND_URL}/api/scenario-questions/cached?userId=${userId}&limit=${limit}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch cached questions: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[QuestionGen] Retrieved', data.questions?.length || 0, 'cached questions');
    return data.questions || [];
  } catch (error) {
    console.error('[QuestionGen] Error fetching cached questions:', error);
    return [];
  }
}
