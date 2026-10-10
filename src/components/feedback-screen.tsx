"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { getConcept } from "@/data/track";
import { useProgress } from "@/hooks/use-progress";
import { markPracticed } from "@/lib/progress";
import { buildTip, emptyTranscriptCopy } from "@/lib/score";
import { readSession, saveSession, type FeedbackSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Lightbulb } from "lucide-react";
import { cn } from "cn";

function subscribeNoop() {
  return () => {};
}

export function FeedbackScreen() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const conceptId = Number(params.id);
  const concept = getConcept(conceptId);
  const progress = useProgress();
  const [override, setOverride] = useState<FeedbackSession | null>(null);
  const [modelNote, setModelNote] = useState<string | null>(null);
  const isClient = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const stored = isClient ? readSession(conceptId) : undefined;
  const session = override?.conceptId === conceptId ? override : stored;

  useEffect(() => {
    if (!concept || !session || session.fromModel) return;
    let cancelled = false;
    (async () => {
      try {
        const probe = await fetch("/api/tutor");
        if (!probe.ok) return;
        const status = (await probe.json()) as { configured?: boolean };
        if (!status.configured || cancelled) return;
        setModelNote("模型在看这次复述…");
        const response = await fetch("/api/tutor", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind: "feedback", conceptId: concept.id, userText: session.userText }),
          signal: AbortSignal.timeout(8000),
        });
        const data = (await response.json()) as { ok?: boolean; covered?: number[]; tip?: string };
        if (cancelled || !data.ok || !data.covered) {
          if (!cancelled) setModelNote("模型没接上，这次用的是要点对照。");
          return;
        }
        const covered = [...new Set([...session.covered, ...data.covered])].sort((a, b) => a - b);
        const tip = data.tip || buildTip(concept, session.userText, covered);
        const nextSession: FeedbackSession = { ...session, covered, tip, fromModel: true };
        saveSession(nextSession);
        setOverride(nextSession);
        const mastery = covered.length >= 4 ? "solid" : covered.length >= 2 ? "explain" : "learning";
        progress.commit(markPracticed(progress.store, concept.id, mastery));
        setModelNote("模型也看过一遍。");
      } catch {
        if (!cancelled) setModelNote(null);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only enhance the session that was just saved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concept?.id, session?.conceptId, session?.fromModel]);

  if (!concept) {
    return (
      <Cream>
        <p className="px-5 pt-16 text-lg font-semibold">没有这个概念</p>
        <Button className="mx-5 mt-4 h-11 rounded-full" onClick={() => router.push("/")}>
          回到地图
        </Button>
      </Cream>
    );
  }

  if (session === undefined || !progress.ready) {
    return (
      <Cream>
        <p className="px-5 pt-16 text-sm text-stone-500" aria-busy="true">
          正在整理这次反馈…
        </p>
      </Cream>
    );
  }

  if (!session) {
    return (
      <Cream>
        <Header id={concept.id} onBack={() => router.push("/")} />
        <div className="px-5 pt-8">
          <h1 className="text-2xl font-semibold">{concept.title}</h1>
          <p className="mt-3 text-sm leading-7 text-stone-600">还没有这次的讲稿。先跟小练把这个概念讲一遍。</p>
          <Button
            className="mt-6 h-12 w-full rounded-full bg-[#187a45] text-white hover:bg-[#14683b]"
            onClick={() => router.push(`/call/${concept.id}?n=${Date.now()}`)}
          >
            开始通话
          </Button>
        </div>
      </Cream>
    );
  }

  const label = session.covered.length >= 4 ? "讲透" : session.covered.length >= 2 ? "能讲" : "听过";
  const spoke = session.userText.trim().length > 0;
  const nextId = concept.id < 100 ? concept.id + 1 : null;

  return (
    <Cream>
      <Header id={concept.id} onBack={() => router.push("/")} />
      <div className="px-4 pt-3 pb-10">
        <article className="rounded-[28px] bg-white px-5 py-5 shadow-[0_10px_30px_rgba(60,40,10,0.05)]">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{concept.title}</h1>
            <span className="mt-1 shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600">{label}</span>
          </div>
          <div className="mt-4 flex gap-2 text-sm leading-6 text-stone-600">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <p>
              <span className="font-medium text-stone-800">下次可以</span>
              <span className="mt-1 block">{session.tip}</span>
            </p>
          </div>
        </article>

        <div className="mt-6 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">要点覆盖</h2>
          <span className="text-sm text-stone-400">
            {session.covered.length}/{concept.points.length}
          </span>
        </div>
        <ol className="mt-3 space-y-3 rounded-[24px] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(60,40,10,0.04)]">
          {concept.points.map((point, index) => {
            const hit = session.covered.includes(index);
            return (
              <li key={point.text} className="flex gap-3 text-sm leading-6 text-stone-700">
                <span
                  className={cn(
                    "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs",
                    hit ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-400",
                  )}
                >
                  {index + 1}
                </span>
                <span className={hit ? "text-stone-800" : "text-stone-500"}>{point.text}</span>
              </li>
            );
          })}
        </ol>
        {modelNote ? <p className="mt-2 text-xs text-stone-400">{modelNote}</p> : null}

        <div className="mt-6 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">你的讲稿</h2>
          <span className="text-xs text-stone-400">整理自你刚才说的话</span>
        </div>
        <div className="mt-3 rounded-[24px] bg-white px-4 py-4 text-sm leading-7 text-stone-600 shadow-[0_8px_24px_rgba(60,40,10,0.04)]">
          {spoke ? session.userText : emptyTranscriptCopy()}
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            className="h-12 flex-1 rounded-full text-base"
            onClick={() => router.push(`/call/${concept.id}?n=${Date.now()}`)}
          >
            再讲一遍
          </Button>
          <Button
            className="h-12 flex-[1.35] rounded-full bg-[#187a45] text-base text-white hover:bg-[#14683b]"
            onClick={() => router.push(nextId ? `/call/${nextId}?n=${Date.now()}` : "/")}
          >
            {nextId ? "下一个" : "回到地图"}
          </Button>
        </div>
      </div>
    </Cream>
  );
}

function Cream({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#f3f0e8] text-stone-900">
      <div className="mx-auto min-h-dvh w-full max-w-[440px]">{children}</div>
    </div>
  );
}

function Header({ id, onBack }: { id: number; onBack: () => void }) {
  return (
    <div className="flex items-center px-2 pt-3">
      <button type="button" aria-label="返回" onClick={onBack} className="grid size-10 place-items-center rounded-full">
        <ChevronLeft className="size-5" />
      </button>
      <p className="flex-1 pr-10 text-center text-sm text-stone-500">第 {id} 个 · 反馈</p>
    </div>
  );
}
