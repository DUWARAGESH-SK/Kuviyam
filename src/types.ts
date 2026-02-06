export interface Note {
    id: string;
    title: string;
    content: string;
    createdAt: number;
    updatedAt: number;
    tags: string[];
    url?: string;  // For contextual notes
    domain?: string; // For filtering by site
    pinned: boolean;
    color?: string;
    position?: { x: number; y: number }; // Legacy field
    folderIds?: string[];
}

export type NoteDraft = Omit<Note, 'id' | 'createdAt' | 'updatedAt'>;

export interface PanelLayout {
    x: number;
    y: number;
    width: number;
    height: number;
    isMinimized: boolean;
    isOpen: boolean;
}

export interface Folder {
    id: string;
    name: string;
    createdAt: number;
    itemCount: number;
    parentId?: string;
}
