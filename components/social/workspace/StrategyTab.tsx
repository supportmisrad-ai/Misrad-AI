'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Calendar,
  Hash,
  Zap,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  MapPin,
  Building2,
  Crown,
  BarChart3,
  Gift,
  Loader2,
  FileText,
  X
} from 'lucide-react';
import { Client } from '@/types/social';
import type { MarketingStrategy, ClientProfile } from '@/lib/ai/marketing-strategy-generator';
import { getClientStrategiesAction, getMarketingStrategyAction, createMarketingStrategyAction } from '@/app/actions/marketing-strategy';

// Types
interface StrategyTabProps {
  client: Client;
  orgSlug: string;
}

type Step = 'welcome' | 'business-size' | 'target-audience' | 'goals' | 'competitors' | 'budget' | 'location' | 'dna-review' | 'generating' | 'results';

interface QuestionnaireData {
  businessSize: ClientProfile['businessSize'];
  targetAudience: string;
  goals: string[];
  competitors: string[];
  budget: string;
  targetLocations: string[];
  contentLanguages: ClientProfile['contentLanguages'];
  religiousConsiderations: boolean;
}

const LOCATIONS = ['תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'נתניה', 'פתח תקווה', 'רמת גן', 'גבעתיים', 'ראשון לציון', 'רעננה', 'הרצליה', 'מודיעין', 'אשדוד', 'חולון', 'בת ים'];

const GOALS_OPTIONS = [
  { id: 'awareness', label: 'הגברת מודעות למותג', icon: Lightbulb },
  { id: 'leads', label: 'הגדלת לידים ופניות', icon: Users },
  { id: 'sales', label: 'הגדלת מכירות', icon: TrendingUp },
  { id: 'engagement', label: 'חיזוק Engagement עם קהל קיים', icon: Zap },
  { id: 'authority', label: 'בניית סמכות בתחום', icon: Crown },
  { id: 'community', label: 'בניית קהילה', icon: Users },
];

const BUSINESS_SIZES = [
  { id: 'solo', label: 'עצמאי/ית', desc: 'עוסק מורשה, עצמאי, או עסק של אדם אחד', icon: Building2 },
  { id: 'small', label: 'עסק קטן', desc: '2-10 עובדים', icon: Building2 },
  { id: 'medium', label: 'עסק בינוני', desc: '11-50 עובדים', icon: Building2 },
  { id: 'large', label: 'חברה גדולה', desc: '50+ עובדים', icon: Building2 },
];

export default function StrategyTab({ client, orgSlug }: StrategyTabProps) {
  // State
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData>({
    businessSize: 'small',
    targetAudience: '',
    goals: [],
    competitors: [],
    budget: '',
    targetLocations: [],
    contentLanguages: ['hebrew'],
    religiousConsiderations: true,
  });
  const [strategy, setStrategy] = useState<MarketingStrategy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedStrategies, setSavedStrategies] = useState<{ id: string; created_at: string; version: number }[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'pillars' | 'calendar' | 'hashtags' | 'kpis' | 'campaigns'>('overview');

  // Load existing strategies on mount
  useEffect(() => {
    loadSavedStrategies();
  }, [client.id]);

  const loadSavedStrategies = async () => {
    try {
      const result = await getClientStrategiesAction({ orgSlug, clientId: client.id });
      if (result.success && result.strategies) {
        setSavedStrategies(result.strategies);
        if (result.strategies.length > 0 && result.strategies[0].is_active) {
          // Load the active strategy
          const strategyResult = await getMarketingStrategyAction({ 
            orgSlug, 
            clientId: client.id, 
            strategyId: result.strategies[0].id 
          });
          if (strategyResult.success && strategyResult.strategy) {
            setStrategy(strategyResult.strategy);
            setCurrentStep('results');
          }
        }
      }
    } catch (err) {
      console.error('Failed to load strategies:', err);
    }
  };

  // Navigation
  const nextStep = () => {
    const steps: Step[] = ['welcome', 'business-size', 'target-audience', 'goals', 'competitors', 'budget', 'location', 'dna-review', 'generating', 'results'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: Step[] = ['welcome', 'business-size', 'target-audience', 'goals', 'competitors', 'budget', 'location', 'dna-review', 'generating', 'results'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  // Generate Strategy
  const generateStrategy = async () => {
    setIsLoading(true);
    setError(null);
    setCurrentStep('generating');

    try {
      const clientProfile: ClientProfile = {
        name: client.companyName || client.name,
        industry: client.dna?.strategy?.uniqueValue || 'כללי',
        targetAudience: questionnaire.targetAudience,
        goals: questionnaire.goals.map(g => GOALS_OPTIONS.find(opt => opt.id === g)?.label || g),
        competitors: questionnaire.competitors.filter(c => c.trim()),
        budget: questionnaire.budget,
        currentChallenges: [],
        uniqueValue: client.dna?.strategy?.uniqueValue,
        brandVoice: client.brandVoice,
        businessSize: questionnaire.businessSize,
        targetLocations: questionnaire.targetLocations,
        contentLanguages: questionnaire.contentLanguages,
        religiousConsiderations: questionnaire.religiousConsiderations,
      };

      const result = await createMarketingStrategyAction({
        orgSlug,
        clientId: client.id,
        profile: clientProfile,
      });

      if (!result.success) {
        throw new Error(result.error || 'שגיאה ביצירת האסטרטגיה');
      }

      if (result.strategy) {
        setStrategy(result.strategy);
        setCurrentStep('results');
        // Reload saved strategies
        await loadSavedStrategies();
      } else {
        throw new Error('לא התקבלה אסטרטגיה מהשרת');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת האסטרטגיה');
      setCurrentStep('dna-review');
    } finally {
      setIsLoading(false);
    }
  };

  // Render Steps
  const renderWelcome = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-8">
      <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl">
        <Sparkles className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-4xl font-black text-slate-900 mb-4">
        אסטרטגיית שיווק AI
      </h2>
      <p className="text-xl text-slate-600 max-w-2xl mb-8 leading-relaxed">
        ניצור אסטרטגיית שיווק מותאמת אישית ל-<strong>{client.companyName}</strong> על בסיס נתוני ה-DNA והמידע שתספק.
        <br />
        <span className="text-purple-600 font-bold">מותאם לשוק הישראלי • כולל לוח שנה עברי • WhatsApp כלול</span>
      </p>
      <button
        onClick={nextStep}
        className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-12 py-5 rounded-2xl font-black text-xl shadow-xl hover:scale-105 transition-transform flex items-center gap-3"
      >
        התחל שאלון <ChevronLeft className="w-6 h-6" />
      </button>
    </div>
  );

  const renderBusinessSize = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h3 className="text-3xl font-black text-slate-900 mb-2">גודל העסק</h3>
        <p className="text-slate-600">בחר את גודל העסק המתאים - זה ישפיע על אופי האסטרטגיה</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BUSINESS_SIZES.map((size) => {
          const Icon = size.icon;
          const isSelected = questionnaire.businessSize === size.id;
          return (
            <button
              key={size.id}
              onClick={() => setQuestionnaire({ ...questionnaire, businessSize: size.id as ClientProfile['businessSize'] })}
              className={`p-6 rounded-3xl border-2 text-right transition-all ${
                isSelected
                  ? 'border-purple-600 bg-purple-50 shadow-lg'
                  : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isSelected ? 'bg-purple-600' : 'bg-slate-200'}`}>
                  <Icon className={`w-7 h-7 ${isSelected ? 'text-white' : 'text-slate-600'}`} />
                </div>
                <div className="text-right">
                  <h4 className={`font-black text-lg ${isSelected ? 'text-purple-900' : 'text-slate-900'}`}>{size.label}</h4>
                  <p className={`text-sm ${isSelected ? 'text-purple-700' : 'text-slate-500'}`}>{size.desc}</p>
                </div>
                {isSelected && <CheckCircle className="w-6 h-6 text-purple-600 mr-auto" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderTargetAudience = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h3 className="text-3xl font-black text-slate-900 mb-2">קהל יעד</h3>
        <p className="text-slate-600">תאר את קהל היעד העיקרי שלך</p>
      </div>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">תיאור קהל יעד</label>
          <textarea
            value={questionnaire.targetAudience}
            onChange={(e) => setQuestionnaire({ ...questionnaire, targetAudience: e.target.value })}
            placeholder="למשל: נשים בגילאי 25-45 מתל אביב וגבעתיים, שמחפשות פתרונות X..."
            className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:outline-none min-h-[120px] text-right"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3">אזורי פעילות</label>
          <div className="flex flex-wrap gap-2">
            {LOCATIONS.map((loc) => {
              const isSelected = questionnaire.targetLocations.includes(loc);
              return (
                <button
                  key={loc}
                  onClick={() => {
                    const newLocs = isSelected
                      ? questionnaire.targetLocations.filter((l) => l !== loc)
                      : [...questionnaire.targetLocations, loc];
                    setQuestionnaire({ ...questionnaire, targetLocations: newLocs });
                  }}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                    isSelected
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {isSelected && <CheckCircle className="w-4 h-4 inline ml-1" />}
                  {loc}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const renderGoals = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h3 className="text-3xl font-black text-slate-900 mb-2">מטרות עסקיות</h3>
        <p className="text-slate-600">בחר עד 3 מטרות עיקריות</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {GOALS_OPTIONS.map((goal) => {
          const Icon = goal.icon;
          const isSelected = questionnaire.goals.includes(goal.id);
          const canSelect = isSelected || questionnaire.goals.length < 3;
          return (
            <button
              key={goal.id}
              onClick={() => {
                if (!canSelect && !isSelected) return;
                const newGoals = isSelected
                  ? questionnaire.goals.filter((g) => g !== goal.id)
                  : [...questionnaire.goals, goal.id];
                setQuestionnaire({ ...questionnaire, goals: newGoals });
              }}
              disabled={!canSelect && !isSelected}
              className={`p-5 rounded-2xl border-2 text-right transition-all ${
                isSelected
                  ? 'border-purple-600 bg-purple-50'
                  : canSelect
                  ? 'border-slate-200 hover:border-purple-300'
                  : 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isSelected ? 'bg-purple-600' : 'bg-slate-200'}`}>
                  <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-slate-600'}`} />
                </div>
                <span className={`font-black text-lg ${isSelected ? 'text-purple-900' : 'text-slate-900'}`}>{goal.label}</span>
                {isSelected && <CheckCircle className="w-5 h-5 text-purple-600 mr-auto" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderCompetitors = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h3 className="text-3xl font-black text-slate-900 mb-2">מתחרים</h3>
        <p className="text-slate-600">הוסף עד 3 מתחרים עיקריים (אופציונלי)</p>
      </div>
      <div className="space-y-4">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex items-center gap-3">
            <Target className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={questionnaire.competitors[index] || ''}
              onChange={(e) => {
                const newCompetitors = [...questionnaire.competitors];
                newCompetitors[index] = e.target.value;
                setQuestionnaire({ ...questionnaire, competitors: newCompetitors });
              }}
              placeholder={`מתחרה ${index + 1}...`}
              className="flex-1 p-4 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:outline-none"
            />
          </div>
        ))}
      </div>
    </div>
  );

  const renderBudget = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h3 className="text-3xl font-black text-slate-900 mb-2">תקציב שיווק</h3>
        <p className="text-slate-600">מה התקציב החודשי המשוער לשיווק?</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['עד 1,000 ₪', '1,000-3,000 ₪', '3,000-10,000 ₪', '10,000+ ₪'].map((budget) => {
          const isSelected = questionnaire.budget === budget;
          return (
            <button
              key={budget}
              onClick={() => setQuestionnaire({ ...questionnaire, budget })}
              className={`p-4 rounded-2xl border-2 text-center transition-all ${
                isSelected
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-slate-200 hover:border-purple-300'
              }`}
            >
              <span className={`font-black ${isSelected ? 'text-purple-900' : 'text-slate-900'}`}>{budget}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={questionnaire.religiousConsiderations}
            onChange={(e) => setQuestionnaire({ ...questionnaire, religiousConsiderations: e.target.checked })}
            className="w-5 h-5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
          />
          <span className="text-slate-700 font-bold">התחשב בשבת וחגים (מערכת מושבתת אוטומטית)</span>
        </label>
      </div>
    </div>
  );

  const renderLocation = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h3 className="text-3xl font-black text-slate-900 mb-2">שפות תוכן</h3>
        <p className="text-slate-600">בחר את השפות שבהן התוכן יופק</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[
          { id: 'hebrew', label: 'עברית', desc: 'שפה ראשית לרוב הקהלים בישראל' },
          { id: 'english', label: 'English', desc: 'לקהלים בינלאומיים ותיירים' },
          { id: 'arabic', label: 'العربية', desc: 'לקהל ערבי בישראל' },
          { id: 'russian', label: 'Русский', desc: 'לקהל רוסי בישראל' },
        ].map((lang) => {
          const currentLangs = questionnaire.contentLanguages || ['hebrew'];
          const isSelected = currentLangs.includes(lang.id as any);
          return (
            <button
              key={lang.id}
              onClick={() => {
                const currentLangs = questionnaire.contentLanguages || ['hebrew'];
                const newLangs = isSelected
                  ? currentLangs.filter((l) => l !== lang.id)
                  : [...currentLangs, lang.id as any];
                setQuestionnaire({ ...questionnaire, contentLanguages: newLangs });
              }}
              className={`p-5 rounded-2xl border-2 text-right transition-all ${
                isSelected
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-slate-200 hover:border-purple-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`font-black text-lg ${isSelected ? 'text-purple-900' : 'text-slate-900'}`}>{lang.label}</h4>
                  <p className={`text-sm ${isSelected ? 'text-purple-700' : 'text-slate-500'}`}>{lang.desc}</p>
                </div>
                {isSelected && <CheckCircle className="w-6 h-6 text-purple-600" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderDnaReview = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h3 className="text-3xl font-black text-slate-900 mb-2">סקירת DNA</h3>
        <p className="text-slate-600">נתוני ה-DNA הקיימים ישולבו באסטרטגיה</p>
      </div>
      <div className="bg-white rounded-3xl border-2 border-slate-200 p-8 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">קהל יעד</label>
            <p className="font-bold text-slate-800 mt-1">{client.dna?.strategy?.targetAudience || 'לא הוזן'}</p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">כאבי לקוח</label>
            <p className="font-bold text-slate-800 mt-1">{client.dna?.strategy?.painPoints || 'לא הוזן'}</p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">ערך ייחודי</label>
            <p className="font-bold text-slate-800 mt-1">{client.dna?.strategy?.uniqueValue || 'לא הוזן'}</p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">טון דיבור</label>
            <p className="font-bold text-slate-800 mt-1">{client.brandVoice || 'לא הוזן'}</p>
          </div>
        </div>
        {client.dna?.vocabulary?.loved?.length > 0 && (
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">מילים אהובות</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {client.dna.vocabulary.loved.map((word: string) => (
                <span key={word} className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm font-bold">
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}
        {client.dna?.vocabulary?.forbidden?.length > 0 && (
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">מילים אסורות</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {client.dna.vocabulary.forbidden.map((word: string) => (
                <span key={word} className="px-3 py-1 bg-red-100 text-red-800 rounded-lg text-sm font-bold">
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span className="font-bold">{error}</span>
        </div>
      )}
    </div>
  );

  const renderGenerating = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px]">
      <div className="relative">
        <div className="w-24 h-24 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        <Sparkles className="w-8 h-8 text-purple-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
      </div>
      <h3 className="text-2xl font-black text-slate-900 mt-8">מייצר אסטרטגיה מותאמת...</h3>
      <p className="text-slate-600 mt-2">ה-AI מנתח את נתוני הלקוח ויוצר תוכנית שיווקית מלאה</p>
      <div className="flex items-center gap-2 mt-6 text-sm text-slate-500">
        <Clock className="w-4 h-4" />
        <span>נשארו כ-30 שניות</span>
      </div>
    </div>
  );

  const renderResults = () => {
    if (!strategy) return null;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-black mb-2">{client.companyName}</h2>
              <p className="text-purple-100">אסטרטגיית שיווק AI מותאמת אישית</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep('welcome')}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                צור חדשה
              </button>
              {savedStrategies.length > 0 && (
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl font-bold">
                  גרסה {savedStrategies[0].version}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-slate-200">
          {[
            { id: 'overview', label: 'סקירה', icon: FileText },
            { id: 'pillars', label: 'עמודי תוכן', icon: Target },
            { id: 'calendar', label: 'לוח שנה', icon: Calendar },
            { id: 'hashtags', label: 'האשטאגים', icon: Hash },
            { id: 'kpis', label: 'KPIs', icon: BarChart3 },
            { id: 'campaigns', label: 'קמפיינים', icon: Gift },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id as any;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-3xl border-2 border-slate-200 p-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <FileText className="w-6 h-6 text-purple-600" />
                סקירת אסטרטגיה
              </h3>
              <div className="prose prose-lg max-w-none text-slate-700 leading-relaxed whitespace-pre-line">
                {strategy.overview}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                {strategy.competitiveAdvantage.map((adv, i) => (
                  <div key={i} className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="w-5 h-5 text-purple-600" />
                      <span className="font-black text-purple-900">יתרון {i + 1}</span>
                    </div>
                    <p className="text-purple-800 font-bold text-sm">{adv}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'pillars' && (
            <div className="space-y-6">
              <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <Target className="w-6 h-6 text-purple-600" />
                עמודי תוכן ראשיים
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {strategy.contentPillars.map((pillar, i) => (
                  <div key={i} className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-3xl p-6 border border-purple-100">
                    <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center mb-4">
                      <span className="text-white font-black text-xl">{i + 1}</span>
                    </div>
                    <h4 className="text-xl font-black text-slate-900 mb-2">{pillar.title}</h4>
                    <p className="text-slate-600 mb-4">{pillar.description}</p>
                    <div className="space-y-2">
                      {pillar.topics.map((topic, j) => (
                        <div key={j} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-purple-600" />
                          <span className="text-slate-700 font-bold">{topic}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="space-y-6">
              <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <Calendar className="w-6 h-6 text-purple-600" />
                תוכנית תוכן חודשית
              </h3>
              <div className="space-y-6">
                {strategy.monthlyCalendar.map((week) => (
                  <div key={week.week} className="bg-slate-50 rounded-3xl p-6">
                    <h4 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                      <span className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white">
                        {week.week}
                      </span>
                      שבוע {week.week}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {week.posts.map((post, i) => (
                        <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold">
                              {post.platform}
                            </span>
                            {post.timing && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {post.timing}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-800 font-bold text-sm">{post.topic}</p>
                          <p className="text-slate-500 text-xs mt-1">{post.contentType}</p>
                          {post.hebrewDate && (
                            <p className="text-amber-600 text-xs mt-1 font-bold">{post.hebrewDate}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'hashtags' && (
            <div className="space-y-6">
              <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <Hash className="w-6 h-6 text-purple-600" />
                האשטאגים המומלצים
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-black text-lg text-slate-900 mb-3">עיקריים (Primary)</h4>
                  <div className="flex flex-wrap gap-2">
                    {strategy.hashtags.primary.map((tag, i) => (
                      <span key={i} className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-sm">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-black text-lg text-slate-900 mb-3">משניים (Secondary)</h4>
                  <div className="flex flex-wrap gap-2">
                    {strategy.hashtags.secondary.map((tag, i) => (
                      <span key={i} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold text-sm">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'kpis' && (
            <div className="space-y-6">
              <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-purple-600" />
                מדדי הצלחה (KPIs)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {strategy.kpis.map((kpi, i) => (
                  <div key={i} className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-100">
                    <div className="text-purple-600 font-black text-sm mb-1">{kpi.metric}</div>
                    <div className="text-2xl font-black text-slate-900">{kpi.target}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'campaigns' && (
            <div className="space-y-6">
              <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <Gift className="w-6 h-6 text-purple-600" />
                רעיונות לקמפיינים מיוחדים
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {strategy.specialCampaigns?.map((campaign, i) => (
                  <div key={i} className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className="w-5 h-5 text-amber-600" />
                      <h4 className="font-black text-lg text-slate-900">{campaign.name}</h4>
                    </div>
                    <p className="text-amber-700 font-bold text-sm mb-2">{campaign.timing}</p>
                    <p className="text-slate-700 text-sm">{campaign.idea}</p>
                  </div>
                )) || (
                  <p className="text-slate-500 text-center py-8">אין קמפיינים מיוחדים מוגדרים</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Best Posting Times Summary */}
        <div className="bg-white rounded-3xl border-2 border-slate-200 p-6">
          <h4 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600" />
            זמני פרסום מיטביים לשוק הישראלי
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {strategy.bestPostingTimes.map((time, i) => (
              <div key={i} className="bg-slate-50 rounded-2xl p-4">
                <div className="font-black text-slate-900 capitalize mb-2">{time.platform}</div>
                <div className="text-sm text-slate-600">
                  <div className="font-bold">ימים: {time.days.join(', ')}</div>
                  <div className="font-bold">שעות: {time.hours.join(', ')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Main Render
  const renderContent = () => {
    switch (currentStep) {
      case 'welcome':
        return renderWelcome();
      case 'business-size':
        return renderBusinessSize();
      case 'target-audience':
        return renderTargetAudience();
      case 'goals':
        return renderGoals();
      case 'competitors':
        return renderCompetitors();
      case 'budget':
        return renderBudget();
      case 'location':
        return renderLocation();
      case 'dna-review':
        return renderDnaReview();
      case 'generating':
        return renderGenerating();
      case 'results':
        return renderResults();
      default:
        return renderWelcome();
    }
  };

  const showNavigation = !['welcome', 'generating', 'results'].includes(currentStep);

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      {/* Progress Bar for Questionnaire */}
      {showNavigation && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-slate-500">התקדמות בשאלון</span>
            <span className="text-sm font-black text-purple-600">
              {['business-size', 'target-audience', 'goals', 'competitors', 'budget', 'location', 'dna-review'].indexOf(currentStep) + 1} / 7
            </span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all"
              style={{
                width: `${((['business-size', 'target-audience', 'goals', 'competitors', 'budget', 'location', 'dna-review'].indexOf(currentStep) + 1) / 7) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm"
        >
          {renderContent()}

          {/* Navigation Buttons */}
          {showNavigation && (
            <div className="p-6 border-t border-slate-200 flex justify-between">
              <button
                onClick={prevStep}
                className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-2"
              >
                <ChevronRight className="w-5 h-5" />
                חזור
              </button>
              {currentStep === 'dna-review' ? (
                <button
                  onClick={generateStrategy}
                  disabled={isLoading}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-black shadow-lg hover:scale-105 transition-transform flex items-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      מייצר...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      הפק אסטרטגיה
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={nextStep}
                  className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center gap-2"
                >
                  המשך
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
