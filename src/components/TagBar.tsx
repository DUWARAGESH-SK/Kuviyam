import React from 'react';

interface TagBarProps {
    tags: { name: string; count: number }[];
    selectedTag: string | null;
    onTagSelect: (tag: string | null) => void;
    onShowAll: () => void;
}

export const TagBar: React.FC<TagBarProps> = ({
    tags,
    selectedTag,
    onTagSelect,
    onShowAll,
}) => {
    return (
        <div className="flex gap-3 mb-10 items-center overflow-x-hidden relative">
            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar flex-1 items-center">
                {/* All Button */}
                <button
                    onClick={() => onTagSelect(null)}
                    className={`flex items-center gap-2 px-6 py-3 font-bold rounded-2xl shadow-md whitespace-nowrap transition-all ${!selectedTag
                            ? 'bg-primary text-slate-900 border-none scale-105'
                            : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary/30'
                        }`}
                >
                    <span className="material-symbols-rounded text-lg">apps</span>
                    All
                </button>

                {/* Dynamic Tags */}
                {tags.map(({ name }) => (
                    <button
                        key={name}
                        onClick={() => onTagSelect(name === selectedTag ? null : name)}
                        className={`flex items-center gap-2 px-6 py-3 font-bold rounded-2xl shadow-md whitespace-nowrap transition-all ${selectedTag === name
                                ? 'bg-primary text-slate-900 border-none scale-105'
                                : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary/30'
                            }`}
                    >
                        <span className="material-symbols-rounded text-lg">tag</span>
                        {name}
                    </button>
                ))}
            </div>

            {/* Show All Modal Trigger */}
            <button
                onClick={onShowAll}
                className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-primary transition-colors ml-2"
                title="View all tags"
            >
                <span className="material-symbols-rounded">more_horiz</span>
            </button>
        </div>
    );
};
