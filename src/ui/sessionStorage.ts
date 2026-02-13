import type { Message } from "./components/MessageList";
import type { ModelType } from "./components/HeaderBar";

export interface SavedSession {
  id: string;
  title: string;
  model: ModelType;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export type OfficeHost = "powerpoint" | "word" | "excel";

const MAX_SESSIONS_PER_HOST = 50;

function hashString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function normalizeScopeKey(scopeKey: string): string {
  const trimmed = scopeKey.trim();
  if (!trimmed) return "unsaved";
  return trimmed.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
}

function deriveScopeKeyFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const normalized = `${parsed.origin}${parsed.pathname}`.toLowerCase();
    return `doc_${hashString(normalized)}`;
  } catch {
    return `doc_${hashString(url.toLowerCase())}`;
  }
}

function getStorageKey(host: OfficeHost, scopeKey: string): string {
  return `copilot-sessions-${host}-${normalizeScopeKey(scopeKey)}`;
}

function getLegacyStorageKey(host: OfficeHost): string {
  return `copilot-sessions-${host}`;
}

function getDocumentUrlFromFileProperties(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      Office.context.document.getFilePropertiesAsync((result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          resolve(result.value?.url || null);
          return;
        }
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}

export async function getDocumentScopeKey(host: OfficeHost): Promise<string> {
  try {
    const directUrl = Office.context.document.url;
    if (directUrl) {
      return deriveScopeKeyFromUrl(directUrl);
    }

    const filePropertiesUrl = await getDocumentUrlFromFileProperties();
    if (filePropertiesUrl) {
      return deriveScopeKeyFromUrl(filePropertiesUrl);
    }
  } catch {
    // ignored on purpose, we return a safe fallback below.
  }

  // Unsaved files don't expose a stable URL. Keep isolated by host to avoid cross-app leakage.
  return `unsaved-${host}`;
}

export function getSavedSessions(host: OfficeHost, scopeKey: string): SavedSession[] {
  try {
    const scopedStored = localStorage.getItem(getStorageKey(host, scopeKey));
    if (scopedStored) {
      return JSON.parse(scopedStored);
    }

    // Backward compatibility for users upgrading from host-level session storage.
    const legacyStored = localStorage.getItem(getLegacyStorageKey(host));
    return legacyStored ? JSON.parse(legacyStored) : [];
  } catch {
    return [];
  }
}

export function saveSession(
  host: OfficeHost,
  scopeKey: string,
  session: SavedSession
): void {
  try {
    const sessions = getSavedSessions(host, scopeKey);
    
    // Check if session already exists (update it)
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      // Add new session at the beginning
      sessions.unshift(session);
    }
    
    // Keep only the last MAX_SESSIONS_PER_HOST
    const trimmed = sessions.slice(0, MAX_SESSIONS_PER_HOST);
    
    localStorage.setItem(getStorageKey(host, scopeKey), JSON.stringify(trimmed));
  } catch (e) {
    console.error("Failed to save session:", e);
  }
}

export function deleteSession(host: OfficeHost, scopeKey: string, sessionId: string): void {
  try {
    const sessions = getSavedSessions(host, scopeKey);
    const filtered = sessions.filter(s => s.id !== sessionId);
    localStorage.setItem(getStorageKey(host, scopeKey), JSON.stringify(filtered));
  } catch (e) {
    console.error("Failed to delete session:", e);
  }
}

export function generateSessionTitle(messages: Message[]): string {
  // Find first user message to use as title
  const firstUserMessage = messages.find(m => m.sender === "user");
  if (firstUserMessage?.text) {
    // Truncate to reasonable length
    const text = firstUserMessage.text.trim();
    if (text.length <= 50) return text;
    return text.substring(0, 47) + "...";
  }
  return "New conversation";
}

export function getHostFromOfficeHost(host: typeof Office.HostType[keyof typeof Office.HostType]): OfficeHost {
  switch (host) {
    case Office.HostType.PowerPoint:
      return "powerpoint";
    case Office.HostType.Word:
      return "word";
    case Office.HostType.Excel:
      return "excel";
    default:
      return "word";
  }
}
