import React, { useState, useMemo } from 'react';

interface TagModalProps {
    isOpen: boolean;
    onClose: () => void;
    tags: { name: string; count: number; lastUsed: number }[];
    selectedTag: string | null;
    onTagSelect: (tag: string | null) => void;
}

type SortOption = 'most-used' | 'alphabetical' | 'recent';

export const TagModal: React.FC<TagModalProps> = ({
    isOpen,
    onClose,
    tags,
    selectedTag,
    onTagSelect,
}) => {
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('most-used');

    const filteredTags = useMemo(() => {
        let result = [...tags];

        if (search) {
            result = result.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
        }

        switch (sortBy) {
            case 'most-used':
                result.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
                break;
            case 'alphabetical':
                result.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'recent':
                result.sort((a, b) => b.lastUsed - a.lastUsed);
                break;
        }

        return result;
    }, [tags, search, sortBy]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white dark:bg-background-dark animate-slide-up font-display">
            {/* Header */}
            <header className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors px-0 cursor-pointer"
                    >
                        <span className="material-symbols-rounded">close</span>
                    </button>
                    <h2 className="text-2xl font-extrabold text-[#1E293B] dark:text-white tracking-tight">Browse Tags</h2>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 pb-32">
                {/* Search & Sort */}
                <div className="flex flex-col gap-6 mb-8">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-4 flex items-center text-slate-400">
                            <span className="material-symbols-rounded">search</span>
                        </div>
                        <input
                            className="w-full h-14 pl-12 pr-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-2 focus:ring-primary/50 text-slate-600 dark:text-slate-200"
                            placeholder="Search tags..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {(['most-used', 'alphabetical', 'recent'] as SortOption[]).map(option => (
                            <button
                                key={option}
                                onClick={() => setSortBy(option)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${sortBy === option
                                        ? 'bg-primary text-slate-900 shadow-md'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                    }`}
                            >
                                {option.replace('-', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tags Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {filteredTags.map(tag => (
                        <button
                            key={tag.name}
                            onClick={() => {
                                onTagSelect(tag.name === selectedTag ? null : tag.name);
                                onClose();
                            }}
                            className={`p-4 rounded-3xl border flex flex-col gap-2 transition-all group ${selectedTag === tag.name
                                    ? 'bg-primary border-transparent shadow-xl ring-2 ring-primary ring-offset-4 dark:ring-offset-slate-900'
                                    : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-primary/50 hover:shadow-lg'
                                }`}
                        >
                            <div className="flex justify-between items-start">
                                <span className={`material-symbols-rounded text-2xl ${selectedTag === tag.name ? 'text-slate-900' : 'text-primary'
                                    }`}>tag</span>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${selectedTag === tag.name ? 'text-slate-700' : 'text-slate-400'
                                    }`}>
                                    {tag.count} notes
                                </span>
                            </div>
                            <span className={`font-bold text-lg truncate ${selectedTag === tag.name ? 'text-slate-900' : 'text-slate-800 dark:text-white'
                                }`}>
                                {tag.name}
                            </span>
                        </button>
                    ))}

                    {filteredTags.length === 0 && (
                        <div className="col-span-2 py-20 flex flex-col items-center justify-center text-slate-400 opacity-50">
                            <span className="material-symbols-rounded text-6xl mb-4">label_off</span>
                            <p className="font-bold tracking-wide">No tags found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
