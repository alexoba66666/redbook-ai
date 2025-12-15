export interface NavItem {
  id: string;
  label: string;
  icon: any;
  path: string;
}

export interface NoteContent {
  title: string;
  content: string;
  tags: string[];
  images?: string[];
  imagePrompt?: string; // For AI generation
}

export interface SavedNote extends NoteContent {
  id: string;
  createdAt: number;
  coverImageBase64?: string;
}

export interface RewrittenVersion {
  id: number;
  style: string;
  title: string;
  content: string;
  tags: string[];
}

export interface AuditResult {
  hasSensitiveWords: boolean;
  score: number;
  highlightedText: string;
  issues: { word: string; reason: string; suggestion: string }[];
}

export enum WorkflowStep {
  INPUT = 0,
  FETCH = 1,
  REWRITE = 2,
  AUDIT = 3,
  DESIGN = 4,
  FINISH = 5
}

export interface DesignTemplate {
  id: string;
  name: string;
  bgClass: string;
  fontClass: string;
  layout: 'simple' | 'cover' | 'magazine';
}

export interface BatchResult {
  id: number;
  status: 'pending' | 'generating_text' | 'generating_image' | 'completed' | 'error';
  note: NoteContent;
  coverImageBase64?: string;
}