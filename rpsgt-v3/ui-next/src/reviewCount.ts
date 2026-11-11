interface RPSGTSavedReview {
  review?: { missedIds?: unknown; flaggedIds?: unknown };
}
interface StorageWindow extends Window {
  RPSGTStorage?: { load: () => RPSGTSavedReview };
}

/**
 * Read-only adapter for the existing versioned RPSGT V3 state.
 * Do not write to, migrate, or fork the learner's practice history.
 */
export function readMissedQuestionsCount(): number | null {
  try {
    const storage = (window as StorageWindow).RPSGTStorage;
    const state = storage?.load()
      ?? JSON.parse(window.localStorage.getItem('spg_rpsgt_v3') || 'null') as RPSGTSavedReview | null;
    if (!state?.review || !Array.isArray(state.review.missedIds)) return null;
    return new Set(state.review.missedIds.map(String)).size;
  } catch { return null; }
}
