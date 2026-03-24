'use client';

import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Volume2, Delete, RefreshCw } from 'lucide-react';
import { allWords, WordObj } from '@/lib/words';
import { getStoredMistakes, addMistake, removeMistake, getWordCache, setWordCache } from '@/lib/cache';
import { generateAudio } from '@/lib/ai';
import { playPCMBase64 } from '@/lib/audio';

export default function GameTab() {
  const [unit, setUnit] = useState<string>('all');
  const [gameWords, setGameWords] = useState<WordObj[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [userInput, setUserInput] = useState<string>('');
  const [wrongWords, setWrongWords] = useState<WordObj[]>([]);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [mistakeCount, setMistakeCount] = useState<number>(0);
  const [message, setMessage] = useState<string>('');
  const [shake, setShake] = useState<boolean>(false);
  const [boxStates, setBoxStates] = useState<('default' | 'error' | 'success')[]>([]);

  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);

  // Initialize and shuffle
  const initGame = useCallback(() => {
    // Only use bold words for the spelling game
    const boldWords = allWords.filter(w => w.isBold);

    let filtered: WordObj[] = [];
    if (unit === 'mistakes') {
      const mistakes = getStoredMistakes();
      if (mistakes.length === 0) {
        alert('错题本是空的！先去复习其他单元吧！');
        setUnit('all');
        return;
      }
      filtered = boldWords.filter((w) => mistakes.includes(w.word));
    } else if (unit === 'all') {
      filtered = [...boldWords];
    } else {
      filtered = boldWords.filter((w) => w.unit === unit);
    }

    // Shuffle
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    setGameWords(shuffled);
    setCurrentLevel(0);
    setScore(0);
    setWrongWords([]);
    setIsGameOver(false);
    setUserInput('');
    setMessage('');
    setMistakeCount(getStoredMistakes().length);
  }, [unit]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const currentWordObj = gameWords[currentLevel];

  // Load Audio for current word
  useEffect(() => {
    if (!currentWordObj) return;
    let isMounted = true;

    const loadAudio = async () => {
      if (isMounted) setIsLoadingAudio(true);
      if (isMounted) setAudioBase64(null);
      try {
        let cached = await getWordCache(currentWordObj.word);
        if (cached?.audioBase64) {
          if (isMounted) setAudioBase64(cached.audioBase64);
        } else {
          const base64 = await generateAudio(currentWordObj.word);
          if (isMounted) setAudioBase64(base64);
          await setWordCache(currentWordObj.word, { ...cached, audioBase64: base64 });
        }
      } catch (err) {
        console.error('Failed to load audio for game:', err);
      } finally {
        if (isMounted) setIsLoadingAudio(false);
      }
    };

    loadAudio();
    setUserInput('');
    setMessage('');
    setBoxStates(new Array(currentWordObj.word.length).fill('default'));

    return () => {
      isMounted = false;
    };
  }, [currentWordObj]);

  const playAudio = useCallback(() => {
    if (audioBase64) {
      playPCMBase64(audioBase64);
    }
  }, [audioBase64]);

  // Auto-play audio when loaded
  useEffect(() => {
    if (audioBase64 && !isGameOver) {
      playAudio();
    }
  }, [audioBase64, isGameOver, playAudio]);

  const handleVirtualKey = (key: string) => {
    if (isGameOver || !currentWordObj) return;

    const targetLen = currentWordObj.word.length;

    if (key === 'BACKSPACE') {
      setUserInput((prev) => prev.slice(0, -1));
    } else if (key === 'ENTER') {
      checkAnswer();
    } else {
      if (userInput.length < targetLen) {
        setUserInput((prev) => prev + key.toLowerCase());
      } else {
        triggerShake();
      }
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const nextLevel = () => {
    if (currentLevel + 1 >= gameWords.length) {
      setIsGameOver(true);
    } else {
      setCurrentLevel((prev) => prev + 1);
    }
  };

  const checkAnswer = () => {
    if (!currentWordObj) return;
    const target = currentWordObj.word.toLowerCase();
    const userVal = userInput.toLowerCase();

    if (userVal.length < target.length) {
      triggerShake();
      return;
    }

    if (userVal === target) {
      setScore((prev) => prev + 10);
      setBoxStates(new Array(target.length).fill('success'));
      if (unit === 'mistakes') {
        removeMistake(currentWordObj.word);
        setMessage('已掌握! 移出错题本 🌟');
        setMistakeCount(getStoredMistakes().length);
      }
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setTimeout(nextLevel, 1000);
    } else {
      triggerShake();
      if (!wrongWords.find((w) => w.word === currentWordObj.word)) {
        setWrongWords((prev) => [...prev, currentWordObj]);
      }
      addMistake(currentWordObj.word);
      setMistakeCount(getStoredMistakes().length);
    }
  };

  const skipWord = () => {
    if (!currentWordObj) return;
    setUserInput(currentWordObj.word);
    setBoxStates(new Array(currentWordObj.word.length).fill('error'));
    setMessage(`正确答案: ${currentWordObj.word}`);
    if (!wrongWords.find((w) => w.word === currentWordObj.word)) {
      setWrongWords((prev) => [...prev, currentWordObj]);
    }
    addMistake(currentWordObj.word);
    setMistakeCount(getStoredMistakes().length);
    setTimeout(nextLevel, 2000);
  };

  const giveHint = () => {
    if (!currentWordObj) return;
    const hintLen = Math.max(1, Math.floor(currentWordObj.word.length / 3));
    setUserInput(currentWordObj.word.substring(0, hintLen));
    setScore((prev) => Math.max(0, prev - 2));
  };

  // Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver) return;
      if (e.key === 'Enter') handleVirtualKey('ENTER');
      else if (e.key === 'Backspace') handleVirtualKey('BACKSPACE');
      else if (e.key === "'" || e.key === '’') handleVirtualKey("'");
      else if (e.key.length === 1 && /^[a-zA-Z ]$/.test(e.key)) handleVirtualKey(e.key);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGameOver, userInput, currentWordObj]);

  if (isGameOver) {
    return (
      <div className="text-center p-4 flex flex-col h-full justify-center">
        <h2 className="text-3xl font-bold text-green-600 mb-4">闯关完成! 🎉</h2>
        <p className="text-2xl mb-6">
          最终得分: <span className="text-orange-500 font-bold">{score}</span>
        </p>
        {wrongWords.length > 0 && (
          <div className="text-left bg-red-50 p-4 rounded-xl mb-4 shadow-inner">
            <h3 className="font-bold text-red-600 mb-2">需要复习:</h3>
            <ul className="list-disc pl-5 text-gray-700 h-32 overflow-y-auto">
              {wrongWords.map((w, i) => (
                <li key={i}>
                  [{w.unit}] {w.word} - {w.hint}
                </li>
              ))}
            </ul>
          </div>
        )}
        {unit === 'mistakes' && wrongWords.length === 0 && (
          <div className="mb-4 text-green-600 font-bold bg-green-50 p-4 rounded-xl border border-green-200">
            错题本已清空！🌟
          </div>
        )}
        <button
          onClick={initGame}
          className="bg-blue-500 text-white w-full py-3 rounded-xl font-bold shadow-lg text-lg active:scale-95 transition"
        >
          再玩一次
        </button>
      </div>
    );
  }

  if (!currentWordObj) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="overflow-y-auto px-4 pb-2 flex-grow">
        {/* Unit Selector */}
        <div className="mb-4 mt-4">
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full p-3 text-lg border-2 border-green-300 rounded-xl text-green-700 font-bold bg-green-50 focus:outline-none focus:border-green-500 shadow-sm"
          >
            <option value="all">📚 复习全部单元 (Review All)</option>
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
          {mistakeCount > 0 && (
            <div className="mt-1 text-sm text-red-500 font-bold text-right">
              错题本待消灭: <span>{mistakeCount}</span>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="flex justify-between items-center mb-4 px-2">
          <div className="text-2xl font-bold text-orange-500">
            ⭐ <span>{score}</span>
          </div>
          <div className="text-gray-500 text-lg font-medium">
            <span>{currentLevel + 1}</span> / <span>{gameWords.length}</span>
          </div>
        </div>

        {/* Game Play Area */}
        <div className={`mb-2 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
          <div className="mb-4 relative">
            <button
              onClick={playAudio}
              disabled={isLoadingAudio || !audioBase64}
              className="w-20 h-20 rounded-full bg-blue-100 text-blue-500 text-3xl hover:bg-blue-200 focus:outline-none transition shadow-md flex items-center justify-center mx-auto active:scale-95 disabled:opacity-50"
            >
              {isLoadingAudio ? <RefreshCw className="w-8 h-8 animate-spin" /> : <Volume2 className="w-8 h-8" />}
            </button>
            <div className="mt-4 text-xl md:text-2xl font-bold text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100 min-h-[4rem] flex items-center justify-center shadow-inner">
              <span>{currentWordObj.hint}</span>
            </div>
          </div>

          {/* Input Boxes */}
          <div className="flex flex-wrap justify-center items-end min-h-[4rem] mb-2 px-1 py-2">
            {Array.from({ length: currentWordObj.word.length }).map((_, i) => {
              const char = userInput[i] || '';
              const isActive = i === userInput.length;
              const state = boxStates[i] || 'default';

              let borderColor = 'border-gray-300';
              let textColor = 'text-gray-700';
              let bgColor = 'bg-transparent';
              let transform = '';

              if (isActive) {
                borderColor = 'border-green-400';
                bgColor = 'bg-green-50';
                transform = 'scale-110';
              } else if (char) {
                borderColor = 'border-gray-400';
              }

              if (state === 'error') {
                borderColor = 'border-red-500';
                textColor = 'text-red-500';
              } else if (state === 'success') {
                borderColor = 'border-green-500';
                textColor = 'text-green-500';
              }

              return (
                <div
                  key={i}
                  className={`w-10 h-14 border-b-4 flex items-center justify-center text-2xl font-bold mx-1 transition-all duration-200 ${borderColor} ${textColor} ${bgColor} ${transform}`}
                >
                  {char}
                </div>
              );
            })}
          </div>

          <div className="h-8 mb-2 font-bold text-red-500 text-lg text-center">{message}</div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-3 px-2">
            <button
              onClick={giveHint}
              className="py-2 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 text-base shadow-sm active:translate-y-1"
            >
              提示
            </button>
            <button
              onClick={() => setUserInput('')}
              className="py-2 rounded-xl bg-gray-100 text-red-500 font-bold hover:bg-red-50 text-base shadow-sm active:translate-y-1"
            >
              清空
            </button>
            <button
              onClick={skipWord}
              className="py-2 rounded-xl bg-orange-400 text-white font-bold shadow-md hover:bg-orange-500 active:translate-y-1 text-base"
            >
              跳过 ⏩
            </button>
          </div>
        </div>
      </div>

      {/* Virtual Keyboard */}
      <div className="mt-auto pt-3 pb-2 bg-gray-50 rounded-t-2xl border-t-2 border-gray-100">
        <div className="flex justify-center gap-1 mb-2 px-1">
          {['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'].map((k) => (
            <button key={k} onClick={() => handleVirtualKey(k)} className="keyboard-key w-full h-12 uppercase">
              {k}
            </button>
          ))}
        </div>
        <div className="flex justify-center gap-1 mb-2 px-4">
          {['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', "'"].map((k) => (
            <button key={k} onClick={() => handleVirtualKey(k)} className="keyboard-key w-full h-12 uppercase">
              {k}
            </button>
          ))}
        </div>
        <div className="flex justify-center gap-1 mb-2 px-8">
          {['z', 'x', 'c', 'v', 'b', 'n', 'm'].map((k) => (
            <button key={k} onClick={() => handleVirtualKey(k)} className="keyboard-key w-full h-12 uppercase">
              {k}
            </button>
          ))}
        </div>
        <div className="flex justify-center gap-3 mb-1 px-2 mt-2">
          <button
            onClick={() => handleVirtualKey('BACKSPACE')}
            className="keyboard-key bg-red-100 border-red-300 text-red-500 w-1/4 h-14 text-xl flex items-center justify-center"
          >
            <Delete />
          </button>
          <button
            onClick={() => handleVirtualKey(' ')}
            className="keyboard-key bg-white border-gray-300 w-1/2 h-14 text-lg"
          >
            Space
          </button>
          <button
            onClick={() => handleVirtualKey('ENTER')}
            className="keyboard-key bg-green-100 border-green-300 text-green-600 w-1/4 h-14 text-xl"
          >
            GO
          </button>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .keyboard-key {
            background-color: #e5e7eb;
            border-bottom: 4px solid #9ca3af;
            border-radius: 12px;
            font-weight: bold;
            color: #374151;
            transition: all 0.1s;
            user-select: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: monospace; 
            font-size: 1.25rem;
            touch-action: manipulation;
        }
        .keyboard-key:active { transform: translateY(2px); border-bottom-width: 2px; background-color: #d1d5db; }
      `}} />
    </div>
  );
}
