"use client";

import { useState, useEffect, useMemo } from "react";
import SubjectCard from "@/components/SubjectCard";
import DynamicModeToggle from "@/components/DynamicModeToggle";
import { FaSearch, FaTimes } from "react-icons/fa";
import { useQuizMode } from "@/contexts/QuizModeContext";
import { QuizMetadata } from "@/types/quiz";
import { parseQuizSeq } from "@/utils/quizSeq";

export default function Home() {
  const { isDynamicMode } = useQuizMode();
  const [subjects, setSubjects] = useState<QuizMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const listRes = await fetch("/api/quiz-slugs", { cache: "no-store" });
        if (!listRes.ok) {
          throw new Error("Failed to load quiz list");
        }
        const { slugs } = (await listRes.json()) as { slugs: string[] };
        const loadedSubjects = await Promise.all(
          slugs.map(async (slug) => {
            const response = await fetch(`/data/${slug}.json`, {
              cache: "no-store",
            });
            const parsed = await response.json();
            const data = Array.isArray(parsed) ? (parsed[1] || parsed[0]) : parsed;
            const seq = parseQuizSeq(data.seq);
            return {
              id: data.id,
              name: data.name,
              description: data.description,
              icon: data.icon,
              color: data.color,
              category: data.category,
              questions: data.questions,
              tags: data.tags,
              hardness: data.hardness ?? "easy",
              ...(seq !== undefined ? { seq } : {}),
            };
          })
        );
        setSubjects(loadedSubjects);
        setLoading(false);
      } catch (error) {
        console.error("Error loading subjects:", error);
        setLoading(false);
      }
    };

    loadSubjects();
  }, []);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(subjects.map((s) => s.category)));
    return cats.sort();
  }, [subjects]);

  // Filter subjects based on search and filters
  const filteredSubjects = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return subjects.filter((subject) => {
      const matchesSearch =
        searchQuery === "" ||
        subject.name.toLowerCase().includes(q) ||
        (subject.tags ?? []).some((tag) => tag.toLowerCase().includes(q));

      // Category filter
      const matchesCategory =
        selectedCategory === "all" || subject.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [subjects, searchQuery, selectedCategory]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
  };

  const hasActiveFilters = searchQuery !== "" || selectedCategory !== "all";

  return (
    <div className="animate-fade-in">
      <div className="mb-4 text-center">
        <h1 className="mt-4 mb-2 text-3xl font-bold tracking-wide font-display sm:text-4xl md:text-5xl">
          Train your mind through quizzes.
        </h1>
        <p className="mb-8 text-base text-stone-600 dark:text-stone-300 sm:text-lg md:text-xl">
          Choose a subject and test your knowledge!
        </p>

        <div className="flex flex-wrap justify-center gap-2 px-0">
          <div className="w-full min-w-0 sm:w-auto">
            <DynamicModeToggle />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      {!loading && (
        <div className="mb-4 space-y-4">
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <FaSearch
              className="absolute transform -translate-y-1/2 pointer-events-none text-stone-400 left-4 top-1/2"
              aria-hidden
            />
            <input
              type="text"
              placeholder="Search quizzes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded-lg border-2 border-stone-200 bg-white py-2.5 pl-12 text-sm text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-clay-500 dark:border-stone-700 dark:bg-stone-900 dark:text-white sm:py-3 sm:text-base ${searchQuery ? "pr-11" : "pr-4"
                }`}
            />
            {searchQuery !== "" && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute flex items-center justify-center transition-colors -translate-y-1/2 rounded-md text-stone-400 right-2 top-1/2 h-9 w-9 hover:bg-stone-100 hover:text-stone-700 focus:outline-none focus:ring-2 focus:ring-clay-500 dark:hover:bg-stone-700 dark:hover:text-stone-200"
                aria-label="Clear search"
              >
                <FaTimes className="text-lg" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex gap-6 px-4 -mx-4 overflow-x-auto border-b flex-nowrap border-stone-200 dark:border-stone-700 sm:mx-0 sm:px-0 sm:justify-center sm:overflow-visible">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`flex-shrink-0 border-b-2 px-1 pb-3 text-sm font-semibold transition-colors ${selectedCategory === "all"
                ? "border-clay-500 text-clay-600 dark:text-clay-400"
                : "border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
                }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex-shrink-0 border-b-2 px-1 pb-3 text-sm font-semibold transition-colors ${selectedCategory === category
                  ? "border-clay-500 text-clay-600 dark:text-clay-400"
                  : "border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
                  }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 border-b-2 rounded-full border-clay-500 animate-spin"></div>
            <p className="text-base text-stone-600 dark:text-stone-300 sm:text-lg">
              Loading quizzes...
            </p>
          </div>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <p className="mb-4 text-xl font-bold text-stone-600 dark:text-stone-300 sm:text-2xl">
              No quizzes found
            </p>
            <p className="mb-6 text-sm text-stone-500 dark:text-stone-400 sm:text-base">
              Try adjusting your filters or search
            </p>
            <button onClick={clearFilters} className="btn-primary">
              Clear Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.map((subject, index) => (
            <SubjectCard
              key={subject.id}
              subject={{
                ...subject,
                questions: subject.questions.length,
              }}
              index={index}
              onTagClick={(tag) => {
                setSelectedCategory("all");
                setSearchQuery(tag);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
