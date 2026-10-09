import { AnalysisResult, AppSettings } from "../types/grammarGuard.ts";

const SETTINGS_KEY = "grammarguard_settings_v1";
const HISTORY_KEY = "grammarguard_history_v1";

const DEFAULT_SETTINGS: AppSettings = {
  storeRawSourceCode: false, // Privacy default: raw source code is NOT persisted unless opted in
  enableGeminiExplanation: true,
  maxCandidates: 5,
  theme: "dark",
};

export class StorageService {
  public getSettings(): AppSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_SETTINGS;
  }

  public saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (err) {
      console.error("Failed to save settings to localStorage:", err);
    }
  }

  public getHistory(): AnalysisResult[] {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        return JSON.parse(raw) as AnalysisResult[];
      }
    } catch {
      // Fallback
    }
    return [];
  }

  public saveAnalysis(analysis: AnalysisResult): void {
    const settings = this.getSettings();
    const history = this.getHistory();

    // Enforce privacy constraint: strip raw source code if retention is disabled
    const recordToSave: AnalysisResult = {
      ...analysis,
      sourceCode: settings.storeRawSourceCode ? analysis.sourceCode : undefined,
    };

    // Prepend and limit to 50 items
    const updated = [recordToSave, ...history.filter((h) => h.id !== recordToSave.id)].slice(0, 50);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to save analysis history:", err);
    }
  }

  public deleteAnalysis(id: string): void {
    const history = this.getHistory().filter((h) => h.id !== id);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (err) {
      console.error("Failed to delete analysis item:", err);
    }
  }

  public clearAllHistory(): void {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  }
}

export const storageService = new StorageService();
