export async function generateTextData(word: string, hint: string) {
  const res = await fetch('/api/generate/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, hint }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to fetch text data');
  }
  return res.json() as Promise<{ syllables: string[]; trivia: string }>;
}

export async function generateAudio(word: string) {
  const res = await fetch('/api/generate/audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to fetch audio data');
  }
  const data = await res.json();
  return data.audioBase64 as string;
}

export async function generateImage(word: string, hint: string) {
  const res = await fetch('/api/generate/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, hint }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to fetch image data');
  }
  const data = await res.json();
  return data.imageBase64 as string;
}
