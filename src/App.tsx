import React, { useState, useEffect } from "react";
import { Header } from "./components/Header.tsx";
import { Sidebar, NavView } from "./components/Sidebar.tsx";
import { OverviewView } from "./components/OverviewView.tsx";
import { WorkspaceView } from "./components/WorkspaceView.tsx";
import { GrammarExplorerView } from "./components/GrammarExplorerView.tsx";
import { EvaluationLabView } from "./components/EvaluationLabView.tsx";
import { HistoryView } from "./components/HistoryView.tsx";
import { SettingsView } from "./components/SettingsView.tsx";
import { HelpModal } from "./components/HelpModal.tsx";
import { AnalysisResult, CandidateRepair, AppSettings } from "./types/grammarGuard.ts";
import { apiClient } from "./services/apiClient.ts";
import { storageService } from "./services/storageService.ts";

export default function App() {
  const [currentView, setCurrentView] = useState<NavView>("workspace");
  const [sourceCode, setSourceCode] = useState<string>("total = (price + tax");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [settings, setSettings] = useState<AppSettings>(() => storageService.getSettings());
  const [explanationMap, setExplanationMap] = useState<
    Record<string, { text: string; source: "gemini" | "rule_based" }>
  >({});
  const [explainingId, setExplainingId] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // Load history and trigger non-blocking initial analysis on mount
  useEffect(() => {
    const loaded = storageService.getHistory();
    setHistory(loaded);

    apiClient
      .analyzeCode(sourceCode)
      .then((res) => {
        setAnalysisResult({ ...res, sourceCode });
      })
      .catch((err) => {
        console.warn("Initial background analysis:", err);
      });
  }, []);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await apiClient.analyzeCode(sourceCode);
      const withSource = { ...result, sourceCode };
      setAnalysisResult(withSource);

      // Persist analysis record
      storageService.saveAnalysis(withSource);
      setHistory(storageService.getHistory());

      // If candidates exist and explanations are enabled, explain top candidate automatically
      if (
        result.candidates.length > 0 &&
        settings.enableGeminiExplanation &&
        !explanationMap[result.candidates[0].id]
      ) {
        explainCandidate(result.diagnostic, result.candidates[0]);
      }
    } catch (err: unknown) {
      console.error("Analysis request failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const explainCandidate = async (
    diagnostic: AnalysisResult["diagnostic"],
    candidate: CandidateRepair
  ) => {
    setExplainingId(candidate.id);
    try {
      const exp = await apiClient.requestExplanation(diagnostic, candidate);
      setExplanationMap((prev) => ({
        ...prev,
        [candidate.id]: { text: exp.explanation, source: exp.source },
      }));
    } catch (err) {
      console.error("Explanation request failed:", err);
    } finally {
      setExplainingId(null);
    }
  };

  const handleExplainCandidate = (candidate: CandidateRepair) => {
    if (analysisResult) {
      explainCandidate(analysisResult.diagnostic, candidate);
    }
  };

  const handleRestoreAnalysis = (item: AnalysisResult) => {
    if (item.sourceCode) {
      setSourceCode(item.sourceCode);
    } else if (item.diagnostic.sourceSnippet) {
      setSourceCode(item.diagnostic.sourceSnippet);
    }
    setAnalysisResult(item);
    setCurrentView("workspace");
  };

  const handleDeleteAnalysis = (id: string) => {
    storageService.deleteAnalysis(id);
    setHistory(storageService.getHistory());
  };

  const handleClearAllHistory = () => {
    storageService.clearAllHistory();
    setHistory([]);
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    storageService.saveSettings(newSettings);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0b0f19] text-slate-100">
      {/* Top Persistent Header */}
      <Header
        currentView={currentView}
        onAnalyze={() => {
          if (currentView !== "workspace") setCurrentView("workspace");
          handleAnalyze();
        }}
        isAnalyzing={isAnalyzing}
        settings={settings}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* Main Persistent Split Layout: Sidebar + View Container */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          historyCount={history.length}
        />

        <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0b0f19]">
          {currentView === "overview" && (
            <OverviewView
              onNavigate={setCurrentView}
              history={history}
              onLoadExampleInWorkspace={(code) => setSourceCode(code)}
            />
          )}

          {currentView === "workspace" && (
            <WorkspaceView
              sourceCode={sourceCode}
              setSourceCode={setSourceCode}
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
              analysisResult={analysisResult}
              onExplainCandidate={handleExplainCandidate}
              explanationMap={explanationMap}
              explainingId={explainingId}
            />
          )}

          {currentView === "grammar" && <GrammarExplorerView />}

          {currentView === "evaluation" && <EvaluationLabView />}

          {currentView === "history" && (
            <HistoryView
              history={history}
              onRestoreAnalysis={handleRestoreAnalysis}
              onDeleteAnalysis={handleDeleteAnalysis}
              onClearAll={handleClearAllHistory}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
            />
          )}

          {currentView === "settings" && (
            <SettingsView settings={settings} onUpdateSettings={handleUpdateSettings} />
          )}
        </main>
      </div>

      {/* Help Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
