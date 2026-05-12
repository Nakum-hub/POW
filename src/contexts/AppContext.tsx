import { createContext, useContext, useState, ReactNode } from 'react';
import {
  Repository,
  SkillWithEvidence,
  AnalysisResults,
} from '../types';

interface AppContextType {
  repos: Repository[];
  setRepos: (repos: Repository[]) => void;
  skills: SkillWithEvidence[];
  setSkills: (skills: SkillWithEvidence[]) => void;
  analysisResults: AnalysisResults | null;
  setAnalysisResults: (results: AnalysisResults | null) => void;
  selectedSkill: SkillWithEvidence | null;
  setSelectedSkill: (skill: SkillWithEvidence | null) => void;
  selectedRepo: Repository | null;
  setSelectedRepo: (repo: Repository | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  analysisProgress: number;
  setAnalysisProgress: (progress: number) => void;
  analysisStage: string;
  setAnalysisStage: (stage: string) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (analyzing: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [skills, setSkills] = useState<SkillWithEvidence[]>([]);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillWithEvidence | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStage, setAnalysisStage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const value = {
    repos,
    setRepos,
    skills,
    setSkills,
    analysisResults,
    setAnalysisResults,
    selectedSkill,
    setSelectedSkill,
    selectedRepo,
    setSelectedRepo,
    sidebarOpen,
    setSidebarOpen,
    analysisProgress,
    setAnalysisProgress,
    analysisStage,
    setAnalysisStage,
    isAnalyzing,
    setIsAnalyzing,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
