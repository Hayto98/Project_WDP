import type { PaperResult } from "../data/searchSample";

const KEY = "wdp.search.session.v1";

export type SearchScope = "all" | "title" | "author";
export type SearchSortKey = "relevance" | "year" | "citations";
export type SearchCondOp = "AND" | "OR" | "NOT";

export interface SearchCondition {
  id: number;
  op: SearchCondOp;
  term: string;
}

export interface SearchSessionState {
  query: string;
  submitted: string;
  scope: SearchScope;
  conditions: SearchCondition[];
  sources: string[];
  types: string[];
  yearFrom: number;
  yearTo: number;
  sort: SearchSortKey;
  page: number;
  hasSearched: boolean;
  remoteResults: PaperResult[];
  totalResults: number;
  savedIds: string[];
  selectedCollectionId: string;
  scrollY: number;
  condId: number;
}

export function loadSearchSession(): SearchSessionState | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SearchSessionState;
    if (!data || typeof data !== "object") return null;
    return data;
  } catch {
    return null;
  }
}

export function saveSearchSession(state: SearchSessionState) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Quota / private mode — ignore.
  }
}
