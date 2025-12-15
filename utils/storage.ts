import { NoteContent, SavedNote } from '../types';

const STORAGE_KEY = 'rednote_ops_saved_v1';

export const getSavedNotes = (): SavedNote[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load notes from storage", e);
    return [];
  }
};

/**
 * Saves a note to local storage with robust quota management.
 * Strategy:
 * 1. Try saving normally.
 * 2. If quota exceeded, remove images from existing notes (oldest first).
 * 3. If still exceeded, delete existing notes (oldest first).
 * 4. If still exceeded, save new note without image.
 */
export const saveNoteToStorage = (note: NoteContent, coverImageBase64?: string): boolean => {
  try {
    const notes = getSavedNotes();
    
    // Check for duplicates based on title
    if (notes.some(n => n.title === note.title)) return true;

    const newNote: SavedNote = {
      ...note,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      createdAt: Date.now(),
      coverImageBase64
    };

    // Helper to attempt write
    const tryWrite = (data: SavedNote[]): boolean => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            return false;
        }
    };

    // 1. Happy path: Save everything
    if (tryWrite([newNote, ...notes])) return true;

    // 2. Quota exceeded: Start cleaning up space.
    // Clone notes to manipulate
    const notesCopy = [...notes]; // [newest, ..., oldest]

    // 2a. Remove images from older notes (iterate backwards/oldest first)
    for (let i = notesCopy.length - 1; i >= 0; i--) {
        if (notesCopy[i].coverImageBase64) {
            // Remove the image property to free up space
            notesCopy[i] = { ...notesCopy[i], coverImageBase64: undefined };
            // Try saving the NEW note (full quality) with the optimized history
            if (tryWrite([newNote, ...notesCopy])) return true;
        }
    }

    // 2b. If removing images wasn't enough, start deleting older notes entirely
    // Loop until we have space or no notes left
    while (notesCopy.length > 0) {
        notesCopy.pop(); // Remove the last (oldest) item
        if (tryWrite([newNote, ...notesCopy])) return true;
    }

    // 3. Last Resort: Save the new note without its image
    // At this point notesCopy is empty (all history deleted), so we are just trying to save the new text.
    const newNoteTextOnly = { ...newNote, coverImageBase64: undefined };
    if (tryWrite([newNoteTextOnly])) return true;

    // Truly out of space (e.g., localStorage disabled or full with other site data)
    return false;

  } catch (e) {
    console.error("Storage critical failure", e);
    return false;
  }
};

export const deleteNotesFromStorage = (ids: string[]): SavedNote[] => {
  try {
    const notes = getSavedNotes();
    const filtered = notes.filter(n => !ids.includes(n.id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  } catch (e) {
    console.error("Delete failed", e);
    return [];
  }
};

export const clearAllNotes = () => {
    localStorage.removeItem(STORAGE_KEY);
};