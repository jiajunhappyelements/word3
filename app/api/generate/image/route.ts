import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

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
    const prompt = `A cute, colorful, cartoon-style illustration for a 3rd-grade student learning the English word '${word}' (meaning: ${hint}). Clean background, highly engaging, no text in the image.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: prompt,
      config: {
        imageConfig: {
          aspectRatio: '16:9',
          imageSize: '512px',
        },
      },
    });

    let base64Image = '';
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.data) {
        base64Image = part.inlineData.data;
        break;
      }
    }

    if (!base64Image) throw new Error('No image generated');
    
    return NextResponse.json({ imageBase64: base64Image });
  } catch (error: any) {
    console.error('Image generation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate image' }, { status: 500 });
  }
}
