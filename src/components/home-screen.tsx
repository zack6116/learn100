"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { chapters, concepts, conceptsInChapter, starterConcepts, TRACK_NAME } from "@/data/track";
import type { Concept } from "@/data/types";
import { useProgress } from "@/hooks/use-progress";
import { conceptProgress, isLit, mapLabel, pillLabel, todayKey } from "@/lib/progress";
import { ConceptSheet } from "@/components/concept-sheet";
import { Logo } from "@/components/logo";
import { SettingsSheet } from "@/components/settings-sheet";
import { Button } from "@/components/ui/button";
import { Phone, Settings, Star } from "lucide-react";
import { cn } from "cn";

const CELL: Record<string, string> = {
  new: "border border-stone-200 bg-white text-stone-500",
  learning: "border border-emerald-200 bg-emerald-100 text-emerald-800",
  explain: "border border-emerald-500 bg-emerald-500 text-white",
  solid: "border border-emerald-800 bg-emerald-800 text-white",
};

export function HomeScreen() {
  const router = useRouter();
  const { ready, store, error } = useProgress();
  const [hideError, setHideError] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selected, setSelected] = useState<Concept | null>(null);

  const snapshot = useMemo(() => {
    const day = ready ? todayKey() : "";
    let lit = 0;
    let starterLit = 0;
    let today = 0;
    for (const concept of concepts) {
      const progress = conceptProgress(store, concept.id);
      if (isLit(progress.mastery)) {
        lit += 1;
        if (concept.starter) starterLit += 1;
      }
      if (progress.days.includes(day)) today += 1;
    }
    const next =
      starterConcepts.find((concept) => conceptProgress(store, concept.id).mastery !== "solid") ??
      concepts.find((concept) => conceptProgress(store, concept.id).mastery !== "solid") ??
      null;
    return { lit, starterLit, today, next };
  }, [ready, store]);

  return (
    <div className="min-h-dvh bg-[#f3f0e8] text-stone-900">
      <div className="mx-auto w-full max-w-[440px] px-4 pb-16">
        <header className="sticky top-0 z-10 flex items-center justify-between bg-[#f3f0e8]/95 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="text-[17px] font-semibold tracking-tight">Learn100</span>
          </div>
          <Button variant="ghost" size="icon" aria-label="设置" onClick={() => setSettingsOpen(true)}>
            <Settings />
          </Button>
        </header>

        {error && !hideError ? (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl bg-amber-50 px-3 py-3 text-sm text-amber-900">
            <p>{error}</p>
            <button type="button" className="shrink-0 text-amber-700 underline" onClick={() => setHideError(true)}>
              知道了
            </button>
          </div>
        ) : null}

        <>
            <p className="text-sm text-stone-500">
              {TRACK_NAME} · {concepts.length} 个概念
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <h1 className="text-[34px] font-semibold tracking-tight">已点亮</h1>
              <span className="text-[52px] leading-none font-semibold tracking-tight">{snapshot.lit}</span>
              <span className="text-2xl text-stone-400">/ {concepts.length}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-stone-500">
              <p>
                今天学了 {snapshot.today} 个 · 每天 {store.dailyGoal} 个
              </p>
              <p>入门 20: {snapshot.starterLit}/20</p>
            </div>

            {snapshot.next ? (
              <article className="mt-5 rounded-[28px] bg-white px-5 py-5 shadow-[0_10px_30px_rgba(60,40,10,0.06)]">
                <div className="flex items-center gap-2">
                  {snapshot.next.starter ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      <Star className="size-3 fill-emerald-600 text-emerald-600" />
                      入门 20
                    </span>
                  ) : (
                    <span className="text-xs text-stone-400">全部地图</span>
                  )}
                  <span className="text-sm text-stone-500">下一个 · 第 {snapshot.next.id} 个</span>
                  <span className="ml-auto rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600">
                    {pillLabel(conceptProgress(store, snapshot.next.id))}
                  </span>
                </div>
                <h2 className="mt-3 text-[28px] leading-tight font-semibold tracking-tight">{snapshot.next.title}</h2>
                <p className="mt-2 text-[15px] leading-7 text-stone-500">{snapshot.next.definition}</p>
                <Button
                  className="mt-4 h-12 w-full rounded-full bg-[#187a45] text-base text-white hover:bg-[#14683b]"
                  onClick={() => router.push(`/call/${snapshot.next?.id}?n=${Date.now()}`)}
                >
                  <Phone data-icon="inline-start" />
                  开始通话
                </Button>
              </article>
            ) : (
              <article className="mt-5 rounded-[28px] bg-white px-5 py-6 shadow-[0_10px_30px_rgba(60,40,10,0.06)]">
                <h2 className="text-2xl font-semibold">100 个概念都点亮了</h2>
                <p className="mt-2 text-[15px] leading-7 text-stone-500">
                  这个领域算入门了。可以点开任意一格再讲一遍，也可以等下一条领域。
                </p>
              </article>
            )}

            <section className="mt-8">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-semibold">入门 20</h2>
                <p className="text-xs text-stone-400">先学这些，能看懂大部分建议</p>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {starterConcepts.map((concept) => {
                  const current = concept.id === snapshot.next?.id;
                  return (
                    <button
                      key={concept.id}
                      type="button"
                      onClick={() => setSelected(concept)}
                      className={cn(
                        "shrink-0 rounded-full border bg-white px-3 py-1.5 text-sm",
                        current ? "border-emerald-600 text-emerald-700" : "border-stone-200 text-stone-700",
                      )}
                    >
                      {concept.id} {concept.title}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="mt-8">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-semibold">全部地图</h2>
                <p className="text-xs text-stone-400">点任意一格</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-stone-500">
                <Legend swatch="border border-stone-200 bg-white" label="未学" />
                <Legend swatch="bg-emerald-100" label="在练" />
                <Legend swatch="bg-emerald-500" label="能讲" />
                <Legend swatch="bg-emerald-800" label="讲透" />
                <span className="inline-flex items-center gap-1.5">
                  <span className="relative size-3.5 rounded-[4px] border border-stone-200 bg-white">
                    <span className="absolute -top-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-orange-500" />
                  </span>
                  入门 20
                </span>
              </div>

              <div className="mt-5 space-y-5">
                {chapters.map((chapter, index) => {
                  const items = conceptsInChapter(index);
                  const done = items.filter((concept) => isLit(conceptProgress(store, concept.id).mastery)).length;
                  return (
                    <div key={chapter.title}>
                      <div className="mb-2 flex items-baseline justify-between gap-3">
                        <p className="min-w-0 text-sm">
                          <span className="font-semibold">{chapter.title}</span>{" "}
                          <span className="text-stone-400">{chapter.blurb}</span>
                        </p>
                        <span className="shrink-0 text-xs text-stone-400">
                          {done}/{items.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-10 gap-1.5">
                        {items.map((concept) => {
                          const progress = conceptProgress(store, concept.id);
                          const mastery = mapLabel(progress);
                          return (
                            <button
                              key={concept.id}
                              type="button"
                              onClick={() => setSelected(concept)}
                              aria-label={`${concept.id} ${concept.title} ${pillLabel(progress)}`}
                              className={cn(
                                "relative aspect-square rounded-[9px] text-[12px] font-medium tabular-nums",
                                CELL[mastery],
                                snapshot.next?.id === concept.id && "ring-2 ring-emerald-700 ring-offset-2 ring-offset-[#f3f0e8]",
                              )}
                            >
                              {concept.id}
                              {concept.starter ? (
                                <span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-orange-500" />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-8 text-center text-xs leading-5 text-stone-400">
                搞懂这 100 个，就算这个领域入门了。概念用来理解，不替代医生或教练。
              </p>
            </section>
        </>
      </div>

      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      <ConceptSheet concept={selected} store={store} onOpenChange={(open) => { if (!open) setSelected(null); }} />
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-3.5 rounded-[4px]", swatch)} />
      {label}
    </span>
  );
}
