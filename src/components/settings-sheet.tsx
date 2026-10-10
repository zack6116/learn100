"use client";

import { useEffect, useState } from "react";
import { fields, TRACK_ID, TRACK_NAME } from "@/data/track";
import { useProgress } from "@/hooks/use-progress";
import { resetTrack } from "@/lib/progress";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const GOALS = [1, 2, 3, 5];

type TutorStatus = {
  configured: boolean;
  provider: string;
  reason: string;
};

export function SettingsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { store, commit } = useProgress();
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [tutor, setTutor] = useState<TutorStatus | null>(null);
  const [tutorError, setTutorError] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/tutor")
      .then((response) => {
        if (!response.ok) throw new Error("status");
        return response.json() as Promise<TutorStatus>;
      })
      .then((status) => {
        if (!cancelled) {
          setTutor(status);
          setTutorError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setTutorError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[88dvh] max-w-[440px] overflow-y-auto rounded-t-3xl px-5 pb-8">
        <SheetHeader className="px-0">
          <SheetTitle className="text-lg">设置</SheetTitle>
          <SheetDescription>进度只存在这台浏览器里。</SheetDescription>
        </SheetHeader>

        <section className="space-y-2">
          <h3 className="text-sm font-medium text-stone-800">学习领域</h3>
          <div className="grid grid-cols-2 gap-2">
            {fields.map((field) => {
              const active = field.id === TRACK_ID;
              return (
                <button
                  key={field.id}
                  type="button"
                  onClick={() => {
                    if (field.ready) {
                      setNotice(`正在学${TRACK_NAME}。`);
                      return;
                    }
                    setNotice(`「${field.name}」还在整理 100 个概念。现在先把${TRACK_NAME}学完。`);
                  }}
                  className={`rounded-2xl border px-3 py-3 text-left text-sm ${
                    active
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-stone-200 bg-white text-stone-700"
                  }`}
                >
                  <span className="block font-medium">{field.name}</span>
                  <span className="mt-0.5 block text-xs text-stone-500">{field.ready ? "当前" : "即将推出"}</span>
                </button>
              );
            })}
          </div>
          {notice ? <p className="text-sm text-stone-600">{notice}</p> : null}
        </section>

        <section className="mt-5 space-y-2">
          <h3 className="text-sm font-medium text-stone-800">每天几个</h3>
          <div className="grid grid-cols-4 gap-2">
            {GOALS.map((goal) => (
              <button
                key={goal}
                type="button"
                onClick={() => commit({ ...store, dailyGoal: goal })}
                className={`h-10 rounded-full text-sm font-medium ${
                  store.dailyGoal === goal ? "bg-[#187a45] text-white" : "bg-stone-100 text-stone-700"
                }`}
              >
                {goal}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5 space-y-2">
          <h3 className="text-sm font-medium text-stone-800">朗读</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => commit({ ...store, voice: true })}
              className={`h-10 rounded-full text-sm ${store.voice ? "bg-[#187a45] text-white" : "bg-stone-100 text-stone-700"}`}
            >
              浏览器朗读
            </button>
            <button
              type="button"
              onClick={() => commit({ ...store, voice: false })}
              className={`h-10 rounded-full text-sm ${!store.voice ? "bg-[#187a45] text-white" : "bg-stone-100 text-stone-700"}`}
            >
              只看文字
            </button>
          </div>
          <p className="text-xs leading-5 text-stone-500">没有声音也能学完：讲解会逐句出现，复述可以打字。</p>
        </section>

        <section className="mt-5 space-y-2">
          <h3 className="text-sm font-medium text-stone-800">小练</h3>
          {tutorError ? (
            <p className="rounded-2xl bg-rose-50 px-3 py-3 text-sm text-rose-700">模型状态没读到。本地小练仍然可用。</p>
          ) : (
            <p className="rounded-2xl bg-stone-50 px-3 py-3 text-sm leading-6 text-stone-600">
              {tutor?.reason ?? "正在看有没有接上模型…"}
            </p>
          )}
          <p className="text-xs leading-5 text-stone-500">
            想换上豆包或别的模型，在环境变量里填密钥即可，不用改界面。见项目里的 .env.example。
          </p>
        </section>

        <section className="mt-5">
          <Button
            variant="secondary"
            className="h-11 w-full rounded-full"
            onClick={() => {
              if (!confirmReset) {
                setConfirmReset(true);
                return;
              }
              commit(resetTrack(store));
              setConfirmReset(false);
              setNotice("这条领域的进度已清空。");
            }}
          >
            {confirmReset ? "确认清空进度" : "重置健身和营养的进度"}
          </Button>
        </section>

        <p className="mt-4 text-xs leading-5 text-stone-400">这些概念用来入门，不替代医生、营养师或教练。</p>
      </SheetContent>
    </Sheet>
  );
}
