import { get, set, del } from 'idb-keyval';

export interface WordAIData {
  syllables?: string[];
  trivia?: string;
  audioBase64?: string;
  imageBase64?: string;
}

const CACHE_PREFIX = 'word_ai_data_';

export const getWordCache = async (word: string): Promise<WordAIData | undefined> => {
  try {
    return await get<WordAIData>(`${CACHE_PREFIX}${word}`);
  } catch (error) {
    console.error('Failed to get cache for word:', word, error);
    return undefined;
  }
};

export const setWordCache = async (word: string, data: WordAIData): Promise<void> => {
  try {
    await set(`${CACHE_PREFIX}${word}`, data);
  } catch (error) {
    console.error('Failed to set cache for word:', word, error);
  }
};

export const clearWordCache = async (word: string): Promise<void> => {
  try {
    await del(`${CACHE_PREFIX}${word}`);
  } catch (error) {
    console.error('Failed to clear cache for word:', word, error);
  }
};

// LocalStorage for mistakes
const MISTAKES_KEY = 'spelling_game_mistakes';

export const getStoredMistakes = (): string[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(MISTAKES_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const addMistake = (word: string) => {
  const mistakes = getStoredMistakes();
  if (!mistakes.includes(word)) {
    mistakes.push(word);
    localStorage.setItem(MISTAKES_KEY, JSON.stringify(mistakes));
  }
};

export const removeMistake = (word: string) => {
  let mistakes = getStoredMistakes();
  mistakes = mistakes.filter((w) => w !== word);
  localStorage.setItem(MISTAKES_KEY, JSON.stringify(mistakes));
};
