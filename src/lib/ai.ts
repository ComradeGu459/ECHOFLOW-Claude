import { callAI } from './aiProvider';
import { SentenceExplanation } from '../types';

export async function explainSentence(sentence: string, fullContext?: string): Promise<SentenceExplanation> {
  const prompt = `
You are an expert English teacher. Break down the following sentence for a non-native speaker.

Sentence: "${sentence}"
${fullContext ? `Context: "${fullContext}"` : ''}

Provide a JSON object with:
1. "translation": A natural Chinese translation.
2. "grammarPoints": A breakdown of key grammar, idioms, or connecting words (max 3 points). Each point should be a concise string explaining the usage.
3. "authenticExpressions": 2 alternative authentic expressions (one casual, one formal). Each should be an object with "text" and "tag".
`;

  try {
    // 调用统一的 AI 适配器，并指派为 'explanation' 场景以便路由
    const result = await callAI(prompt, 'explanation');
    return result as SentenceExplanation;
  } catch (error) {
    console.error("AI API Explanation Error:", error);
    return {
      translation: "加载失败，请重试。",
      grammarPoints: ["API 调用出现问题"],
      authenticExpressions: []
    };
  }
}
