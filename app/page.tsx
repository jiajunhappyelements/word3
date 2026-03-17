'use client';

import React, { useState, useEffect } from 'react';
import { FlaskConical, Gamepad2, Key } from 'lucide-react';
import LearnTab from '@/components/LearnTab';
import GameTab from '@/components/GameTab';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'learn' | 'game'>('learn');
  const [hasKey, setHasKey] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkKey = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio && aistudio.hasSelectedApiKey) {
        const has = await aistudio.hasSelectedApiKey();
        setHasKey(has);
      } else {
        // Fallback if not in AI Studio environment
        setHasKey(true);
      }
      setIsChecking(false);
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && aistudio.openSelectKey) {
      await aistudio.openSelectKey();
      // Assume success to mitigate race condition
      setHasKey(true);
    }
  };

  if (isChecking) return null;

  if (!hasKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-green-50 p-4 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md text-center border-4 border-green-200">
          <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Key className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">需要绑定 API Key</h2>
          <p className="text-gray-600 mb-6">
            为了使用高质量的 AI 图像生成模型 (gemini-3.1-flash-image-preview)，请先选择您的付费 API Key。
          </p>
          <button
            onClick={handleSelectKey}
            className="bg-blue-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-600 transition shadow-md active:scale-95"
          >
            选择 API Key
          </button>
          <p className="mt-6 text-xs text-gray-400">
            请确保您的 Key 属于已绑定结算的 Google Cloud 项目。<br />
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
              了解计费详情
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex flex-col items-center justify-start min-h-screen p-2 pb-safe bg-green-50 font-sans">
      {/* Top Navigation Bar */}
      <div className="w-full max-w-3xl flex bg-white rounded-xl shadow-sm mb-3 overflow-hidden border border-green-100 shrink-0 mt-4">
        <button
          onClick={() => setActiveTab('learn')}
          className={`flex-1 p-3 text-center text-lg flex items-center justify-center gap-2 font-bold transition-all border-b-4 ${
            activeTab === 'learn'
              ? 'text-green-600 border-green-400 bg-green-50'
              : 'text-gray-500 border-transparent hover:bg-gray-50'
          }`}
        >
          <FlaskConical className="w-5 h-5" /> 单词闪卡 (Flashcards)
        </button>
        <button
          onClick={() => setActiveTab('game')}
          className={`flex-1 p-3 text-center text-lg flex items-center justify-center gap-2 font-bold transition-all border-b-4 ${
            activeTab === 'game'
              ? 'text-green-600 border-green-400 bg-green-50'
              : 'text-gray-500 border-transparent hover:bg-gray-50'
          }`}
        >
          <Gamepad2 className="w-5 h-5" /> 拼写大闯关 (Game)
        </button>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-lg border-4 border-green-200 flex flex-col flex-grow overflow-hidden relative max-h-[85vh]">
        {activeTab === 'learn' ? <LearnTab /> : <GameTab />}
      </div>
    </main>
  );
}
