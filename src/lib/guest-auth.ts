export type LoggedInGuest = {
  id: string;
  name: string;
};

const guestStorageKey = "wedding-app:guest";

export function normalizeGuestName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s/g, "");
}

export function saveLoggedInGuest(guest: LoggedInGuest) {
  localStorage.setItem(guestStorageKey, JSON.stringify(guest));
}

export function getLoggedInGuest(): LoggedInGuest | null {
  const storedGuest = localStorage.getItem(guestStorageKey);

  if (!storedGuest) {
    return null;
  }

  try {
    const parsedGuest = JSON.parse(storedGuest) as Partial<LoggedInGuest>;

    if (
      typeof parsedGuest.id === "string" &&
      typeof parsedGuest.name === "string"
    ) {
      return {
        id: parsedGuest.id,
        name: parsedGuest.name,
      };
    }
  } catch {
    localStorage.removeItem(guestStorageKey);
  }

  return null;
}

export function clearLoggedInGuest() {
  localStorage.removeItem(guestStorageKey);
}
