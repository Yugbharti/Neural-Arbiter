export interface ArgumentNode {
  id: string;
  type: string; // "Premise", "Evidence", "Rebuttal"
  speaker: string;
  
  // ── NEW: Added to match the Graph.tsx mapping ──
  claim?: string;      // Maps to 'content' in your UI
  fallacy?: string;    // Maps to 'type' (the badge) in your UI
  strength?: string;   // Maps to 'strength' in your UI
  
  // Keeping your original content field
  content: string;     
}

export interface TranscriptEntry {
  speaker: string;
  text: string;
}

// ── NEW: Interface for the structured Final Verdict from Claude ──
export interface FinalVerdictData {
  analysis: string;
  confidence: number;
  bias: string;
  conclusion: string;
}

export interface DebateState {
  topic: string;
  current_speaker: string;
  transcript: TranscriptEntry[];
  argument_nodes: ArgumentNode[];
  credibility_scores: {
    "Agent A": number[];
    "Agent B": number[];
  };
  web_context: string[];
  rounds_completed: number;
  latest_bias: string | null;
  
  // Flag to tell the UI when to show the chat input box
  is_human_turn?: boolean; 
  
  // The new final verdict object that triggers the dashboard modal
  final_verdict?: FinalVerdictData | null; 
}