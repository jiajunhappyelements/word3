import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

export async function POST(request: Request) {
  try {
    const { word, hint } = await request.json();
    if (!word || !hint) {
      return NextResponse.json({ error: 'Missing word or hint' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set on the server' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `请将三年级英语单词 '${word}' (中文意思: ${hint}) 拆分为音节，并为小学生提供一句简短、有趣、生动的记忆口诀或背景知识（不要太长，适合儿童阅读）。`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            syllables: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'The syllables of the word, e.g., ["ap", "ple"]',
            },
            trivia: {
              type: Type.STRING,
              description: 'A short, fun fact or mnemonic in Chinese for kids.',
            },
          },
          required: ['syllables', 'trivia'],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error('No text generated');
    
    return NextResponse.json(JSON.parse(text));
  } catch (error: any) {
    console.error('Text generation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate text' }, { status: 500 });
  }
}
