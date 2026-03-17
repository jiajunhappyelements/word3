'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Volume2, RefreshCw, ChevronLeft, ChevronRight, Lightbulb, Image as ImageIcon } from 'lucide-react';
import { allWords, WordObj } from '@/lib/words';
import { getWordCache, setWordCache, clearWordCache, WordAIData, getStoredMistakes } from '@/lib/cache';
import { generateTextData, generateAudio, generateImage } from '@/lib/ai';
import { playPCMBase64 } from '@/lib/audio';

export default function LearnTab() {
  const [unit, setUnit] = useState<string>('all');
  const [learnWords, setLearnWords] = useState<WordObj[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const [aiData, setAiData] = useState<WordAIData>({});
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  // Initialize word list based on unit
  useEffect(() => {
    let filtered: WordObj[] = [];
    if (unit === 'mistakes') {
      const mistakes = getStoredMistakes();
      if (mistakes.length === 0) {
        alert('错题本是空的！先去游戏模式挑战积累一些吧！');
        setUnit('all');
        return;
      }
      filtered = allWords.filter((w) => mistakes.includes(w.word));
    } else if (unit === 'all') {
      filtered = [...allWords];
    } else {
      filtered = allWords.filter((w) => w.unit === unit);
    }
    setLearnWords(filtered);
    setCurrentIndex(0);
  }, [unit]);

  const currentWordObj = learnWords[currentIndex];

  // Load AI Data for current word
  useEffect(() => {
    if (!currentWordObj) return;
    let isMounted = true;

    const loadWordData = async (wordObj: WordObj, forceRefresh = false) => {
      if (forceRefresh) {
        await clearWordCache(wordObj.word);
        if (isMounted) setAiData({});
      }

      let cached = (await getWordCache(wordObj.word)) || {};
      if (isMounted) setAiData(cached);

      // Fetch missing parts independently
      if (!cached.syllables || !cached.trivia) {
        if (isMounted) setIsLoadingText(true);
        try {
          const textData = await generateTextData(wordObj.word, wordObj.hint);
          cached = { ...cached, ...textData };
          await setWordCache(wordObj.word, cached);
          if (isMounted) setAiData((prev) => ({ ...prev, ...textData }));
        } catch (err) {
          console.error('Text generation failed:', err);
        } finally {
          if (isMounted) setIsLoadingText(false);
        }
      }

      if (!isMounted) return;

      if (!cached.audioBase64) {
        if (isMounted) setIsLoadingAudio(true);
        try {
          const audioBase64 = await generateAudio(wordObj.word);
          cached = { ...cached, audioBase64 };
          await setWordCache(wordObj.word, cached);
          if (isMounted) setAiData((prev) => ({ ...prev, audioBase64 }));
        } catch (err) {
          console.error('Audio generation failed:', err);
        } finally {
          if (isMounted) setIsLoadingAudio(false);
        }
      }

      if (!isMounted) return;

      if (!cached.imageBase64) {
        if (isMounted) setIsLoadingImage(true);
        try {
          const imageBase64 = await generateImage(wordObj.word, wordObj.hint);
          cached = { ...cached, imageBase64 };
          await setWordCache(wordObj.word, cached);
          if (isMounted) setAiData((prev) => ({ ...prev, imageBase64 }));
        } catch (err) {
          console.error('Image generation failed:', err);
        } finally {
          if (isMounted) setIsLoadingImage(false);
        }
      }
    };

    loadWordData(currentWordObj);

    return () => {
      isMounted = false;
    };
  }, [currentWordObj]);

  const playAudio = () => {
    if (aiData.audioBase64) {
      playPCMBase64(aiData.audioBase64);
    }
  };

  const handleRefresh = async () => {
    if (!currentWordObj) return;
    
    // Manual refresh logic
    await clearWordCache(currentWordObj.word);
    setAiData({});
    
    let cached = {};
    
    setIsLoadingText(true);
    try {
      const textData = await generateTextData(currentWordObj.word, currentWordObj.hint);
      cached = { ...cached, ...textData };
      await setWordCache(currentWordObj.word, cached);
      setAiData((prev) => ({ ...prev, ...textData }));
    } catch (err) {
      console.error('Text generation failed:', err);
    } finally {
      setIsLoadingText(false);
    }

    setIsLoadingAudio(true);
    try {
      const audioBase64 = await generateAudio(currentWordObj.word);
      cached = { ...cached, audioBase64 };
      await setWordCache(currentWordObj.word, cached);
      setAiData((prev) => ({ ...prev, audioBase64 }));
    } catch (err) {
      console.error('Audio generation failed:', err);
    } finally {
      setIsLoadingAudio(false);
    }

    setIsLoadingImage(true);
    try {
      const imageBase64 = await generateImage(currentWordObj.word, currentWordObj.hint);
      cached = { ...cached, imageBase64 };
      await setWordCache(currentWordObj.word, cached);
      setAiData((prev) => ({ ...prev, imageBase64 }));
    } catch (err) {
      console.error('Image generation failed:', err);
    } finally {
      setIsLoadingImage(false);
    }
  };

  if (!currentWordObj) {
    return <div className="p-8 text-center text-gray-500">无单词数据</div>;
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4">
      {/* Unit Selector */}
      <div className="mb-4">
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="w-full p-3 text-lg border-2 border-blue-300 rounded-xl text-blue-700 font-bold bg-blue-50 focus:outline-none focus:border-blue-500 shadow-sm"
        >
          <option value="all">📚 学习全部单元 (Learn All)</option>
          <option value="mistakes" className="font-bold text-red-500">
            📂 我的错题本 (My Mistakes)
          </option>
          <option disabled>──────────</option>
          <option value="Unit 1">Unit 1: Amazing Animals</option>
          <option value="Unit 2">Unit 2: My Body</option>
          <option value="Unit 3">Unit 3: Yummy Food</option>
          <option value="Unit 4">Unit 4: Hobbies & Activities</option>
          <option value="Unit 5">Unit 5: Time & Routines</option>
          <option value="Unit 6">Unit 6: Days & Subjects</option>
        </select>
      </div>

      {/* Controls */}
      <div className="mb-6 flex justify-between items-center bg-green-50 p-2 rounded-lg">
        <button
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="w-12 h-12 bg-white rounded-full shadow text-green-600 font-bold hover:bg-green-100 disabled:opacity-50 flex items-center justify-center"
        >
          <ChevronLeft />
        </button>
        <div className="text-center">
          <span className="text-sm text-gray-500 block">
            {currentIndex + 1} / {learnWords.length}
          </span>
          <span className="text-xs text-green-600 font-bold">{currentWordObj.unit.toUpperCase()}</span>
        </div>
        <button
          onClick={() => setCurrentIndex((prev) => Math.min(learnWords.length - 1, prev + 1))}
          disabled={currentIndex === learnWords.length - 1}
          className="w-12 h-12 bg-white rounded-full shadow text-green-600 font-bold hover:bg-green-100 disabled:opacity-50 flex items-center justify-center"
        >
          <ChevronRight />
        </button>
      </div>

      {/* Flashcard */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-100 overflow-hidden mb-6 relative flex flex-col">
        {/* Top Controls */}
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <button
            onClick={handleRefresh}
            disabled={isLoadingImage || isLoadingText || isLoadingAudio}
            className="w-10 h-10 bg-white/80 backdrop-blur rounded-full shadow flex items-center justify-center text-gray-500 hover:text-blue-500 disabled:opacity-50"
            title="重新生成 AI 内容"
          >
            <RefreshCw className={`w-5 h-5 ${(isLoadingImage || isLoadingText || isLoadingAudio) ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={playAudio}
            disabled={isLoadingAudio || !aiData.audioBase64}
            className="w-10 h-10 bg-white/80 backdrop-blur rounded-full shadow flex items-center justify-center text-blue-500 hover:text-blue-600 disabled:opacity-50"
          >
            <Volume2 className="w-6 h-6" />
          </button>
        </div>

        {/* AI Image Area */}
        <div className="w-full h-48 sm:h-64 bg-gray-50 flex items-center justify-center relative border-b border-gray-100 shrink-0">
          {isLoadingImage ? (
            <div className="flex flex-col items-center text-gray-400">
              <ImageIcon className="w-12 h-12 mb-2 animate-pulse" />
              <span className="text-sm font-medium">AI 正在作画...</span>
            </div>
          ) : aiData.imageBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:image/jpeg;base64,${aiData.imageBase64}`}
              alt={currentWordObj.word}
              className="w-full h-full object-contain p-2"
            />
          ) : (
            <div className="text-gray-400">暂无图片</div>
          )}
        </div>

        {/* Word Info */}
        <div className="p-6 text-center">
          <div className="text-4xl md:text-5xl font-bold text-gray-800 mb-2 tracking-wide font-mono flex justify-center flex-wrap">
            {isLoadingText ? (
              <span className="animate-pulse text-gray-400">{currentWordObj.word}</span>
            ) : aiData.syllables ? (
              aiData.syllables.map((syl, i) => (
                <span
                  key={i}
                  className={`inline-block px-1 mx-0.5 rounded ${
                    i % 3 === 0
                      ? 'text-pink-600 bg-pink-100'
                      : i % 3 === 1
                      ? 'text-blue-600 bg-blue-100'
                      : 'text-amber-600 bg-amber-100'
                  }`}
                >
                  {syl}
                </span>
              ))
            ) : (
              <span>{currentWordObj.word}</span>
            )}
          </div>
          <div className="text-xl text-gray-500 font-medium">{currentWordObj.hint}</div>
        </div>
      </div>

      {/* AI Trivia */}
      <div className="bg-yellow-50 rounded-xl border-2 border-yellow-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-yellow-400 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
            <Lightbulb className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-yellow-800">AI 趣味记忆</h3>
        </div>
        <div className="text-gray-700 leading-relaxed">
          {isLoadingText ? (
            <span className="animate-pulse text-gray-400">AI 正在思考有趣的知识...</span>
          ) : aiData.trivia ? (
            aiData.trivia
          ) : (
            '暂无趣味知识'
          )}
        </div>
      </div>
    </div>
  );
}
