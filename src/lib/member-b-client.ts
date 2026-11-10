"use client";

export const APPLICATION_DATA_CHANGED_EVENT = "recallradar:data-changed";
export const MEMBER_B_DATA_CHANGED_EVENT = APPLICATION_DATA_CHANGED_EVENT;

export function notifyApplicationDataChanged() {
  window.dispatchEvent(new Event(APPLICATION_DATA_CHANGED_EVENT));
}

export const notifyMemberBDataChanged = notifyApplicationDataChanged;

export function safeActionError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("Authentication required")) {
    return "Sign in is required to access these records.";
  }
  if (message.includes("Insufficient role permissions")) {
    return "Only an Admin can create, update, or delete these records.";
  }
  if (message.includes("not found")) {
    return "The selected record no longer exists. Refresh the list and try again.";
  }
  if (/^[A-Za-z][A-Za-z0-9 ,.'()-]{0,180}\.$/.test(message)) {
    return message;
  }
  return fallback;
}

export function dateInputValue(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}
