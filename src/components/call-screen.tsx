"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getConcept, greetingLine, handoffLine } from "@/data/track";
import { useProgress } from "@/hooks/use-progress";
import { markPracticed, type Store } from "@/lib/progress";
import { answerQuestion, coveredIndexes, followUpFor, buildTip } from "@/lib/score";
import { saveSession } from "@/lib/session";
import {
  createRecognizer,
  pickChineseVoice,
  readRecognition,
  recognitionAvailable,
  revealDelay,
  speakText,
  speechSynthesisAvailable,
  stopSpeaking,
} from "@/lib/speech";
import { Textarea } from "@/components/ui/textarea";
import { Check, Pause, Phone, Play } from "lucide-react";
import { cn } from "cn";

type Phase = "listen" | "retell" | "followup" | "left";
type Line = { who: "tutor" | "me"; text: string };

const STAGES = [
  { id: "listen", label: "听" },
  { id: "retell", label: "讲" },
  { id: "followup", label: "追问" },
  { id: "feedback", label: "反馈" },
] as const;

export function CallScreen() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const id = Number(params.id);
  const nonce = search.get("n") ?? "0";
  return <CallSession key={`${id}-${nonce}`} conceptId={id} />;
}

function CallSession({ conceptId }: { conceptId: number }) {
  const router = useRouter();
  const concept = getConcept(conceptId);
  const progress = useProgress();
  const [phase, setPhase] = useState<Phase>("listen");
  const [lines, setLines] = useState<Line[]>([]);
  const [status, setStatus] = useState("小练在说");
  const [hint, setHint] = useState("随时可以打断它提问");
  const [paused, setPaused] = useState(false);
  const [asking, setAsking] = useState(false);
  const [draft, setDraft] = useState("");
  const [interim, setInterim] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [micNote, setMicNote] = useState<string | null>(null);
  const [voiceBroken, setVoiceBroken] = useState(false);

  const phaseRef = useRef<Phase>("listen");
  const pausedRef = useRef(false);
  const askingRef = useRef(false);
  const indexRef = useRef(0);
  const spokenRef = useRef(-1);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const voiceOnRef = useRef(true);
  const draftRef = useRef("");
  const retellRef = useRef("");
  const storeRef = useRef<Store>(progress.store);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<ReturnType<typeof createRecognizer>>(null);
  const wantRecRef = useRef(false);
  const lastFinalRef = useRef("");
  const heardMarked = useRef(false);
  const retellReadyAt = useRef(0);
  const followReadyAt = useRef(0);
  const actionRef = useRef<{
    submitQuestion: () => void;
    hangup: () => void;
    togglePause: () => void;
    onOrb: () => void;
    onDone: () => void;
  } | null>(null);

  useEffect(() => {
    storeRef.current = progress.store;
  }, [progress.store]);

  useEffect(() => {
    voiceOnRef.current = progress.store.voice;
  }, [progress.store.voice]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [lines, interim, draft]);

  useEffect(() => {
    if (!concept || !progress.ready) return;
    let cancelled = false;
    indexRef.current = 0;
    spokenRef.current = -1;
    phaseRef.current = "listen";
    pausedRef.current = false;
    askingRef.current = false;
    heardMarked.current = false;
    const script = [greetingLine(concept), ...concept.lines, handoffLine()];
    voiceOnRef.current = progress.store.voice;

    const keepAlive = window.setInterval(() => {
      if (window.speechSynthesis?.speaking) window.speechSynthesis.resume();
    }, 8000);
    const timer = window.setInterval(() => {
      if (!pausedRef.current) setElapsed((value) => value + 1);
    }, 1000);
    const onVoices = () => {
      voiceRef.current = pickChineseVoice();
    };
    onVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", onVoices);

    const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

    async function say(text: string) {
      if (!(voiceOnRef.current && speechSynthesisAvailable())) {
        await sleep(revealDelay(text));
        return;
      }
      await Promise.race([speakText(text, voiceRef.current), sleep(revealDelay(text) + 700)]);
      stopSpeaking();
    }

    async function run() {
      while (!cancelled && phaseRef.current === "listen" && indexRef.current < script.length) {
        if (pausedRef.current || askingRef.current) {
          await sleep(180);
          continue;
        }
        const index = indexRef.current;
        const text = script[index];
        if (spokenRef.current !== index) {
          spokenRef.current = index;
          setLines((prev) => [...prev, { who: "tutor", text }]);
        }
        setSpeaking(true);
        setStatus("小练在说");
        setHint("随时可以打断它提问");
        await say(text);
        setSpeaking(false);
        if (cancelled || pausedRef.current || askingRef.current || phaseRef.current !== "listen") continue;
        indexRef.current = index + 1;
      }
      if (!cancelled && phaseRef.current === "listen" && !askingRef.current && !pausedRef.current) {
        enterRetell();
      }
    }

    function enterRetell() {
      if (phaseRef.current !== "listen") return;
      phaseRef.current = "retell";
      setPhase("retell");
      askingRef.current = false;
      setAsking(false);
      stopSpeaking();
      setSpeaking(false);
      const handoff = handoffLine();
      setLines((prev) => (prev.some((line) => line.text === handoff) ? prev : [...prev, { who: "tutor", text: handoff }]));
      setStatus("轮到你讲");
      setHint("用自己的话讲一遍");
      retellReadyAt.current = Date.now() + 700;
      rememberHeard();
      startRec();
    }

    function rememberHeard() {
      if (heardMarked.current || !concept) return;
      heardMarked.current = true;
      const next = markPracticed(storeRef.current, concept.id, "learning");
      storeRef.current = next;
      progress.commit(next);
    }

    function startRec() {
      stopRec();
      lastFinalRef.current = "";
      const recognizer = createRecognizer();
      if (!recognizer) return;
      recRef.current = recognizer;
      wantRecRef.current = true;
      recognizer.onresult = (event) => {
        const { finalText, interim: heardInterim } = readRecognition(event);
        if (finalText && finalText !== lastFinalRef.current) {
          const addition = finalText.startsWith(lastFinalRef.current)
            ? finalText.slice(lastFinalRef.current.length)
            : finalText;
          lastFinalRef.current = finalText;
          const next = `${draftRef.current}${addition}`.replace(/\s+/g, "");
          draftRef.current = next;
          setDraft(next);
        }
        setInterim(heardInterim);
      };
      recognizer.onerror = (event) => {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setMicNote("麦克风被挡住了，直接打字讲就行。");
          wantRecRef.current = false;
        }
      };
      recognizer.onend = () => {
        if (!wantRecRef.current || pausedRef.current) return;
        window.setTimeout(() => {
          if (!wantRecRef.current || pausedRef.current) return;
          try {
            recognizer.start();
          } catch {
            /* already running */
          }
        }, 250);
      };
      try {
        recognizer.start();
      } catch {
        setMicNote("麦克风暂时开不了，直接打字讲就行。");
      }
    }

    function stopRec() {
      wantRecRef.current = false;
      setInterim("");
      const recognizer = recRef.current;
      recRef.current = null;
      if (!recognizer) return;
      recognizer.onend = null;
      try {
        recognizer.abort();
      } catch {
        /* already stopped */
      }
    }

    async function finishRetell() {
      if (!concept || phaseRef.current !== "retell") return;
      stopRec();
      const text = draftRef.current.trim();
      retellRef.current = text;
      draftRef.current = "";
      setDraft("");
      if (text) setLines((prev) => [...prev, { who: "me", text }]);
      const question = followUpFor(concept, text);
      phaseRef.current = "followup";
      followReadyAt.current = Date.now() + 60_000;
      setPhase("followup");
      setLines((prev) => [...prev, { who: "tutor", text: question }]);
      setStatus("小练在说");
      setHint("听完再补一句");
      setSpeaking(true);
      await say(question);
      setSpeaking(false);
      if (cancelled || phaseRef.current !== "followup") return;
      setStatus("轮到你讲");
      setHint("再补一句也行");
      followReadyAt.current = Date.now() + 700;
      startRec();
    }

    function finishFollow() {
      if (!concept) return;
      stopRec();
      stopSpeaking();
      const extra = draftRef.current.trim();
      const combined = [retellRef.current, extra].filter(Boolean).join("\n");
      const covered = coveredIndexes(concept, combined);
      const tip = buildTip(concept, combined, covered);
      const mastery = covered.length >= 4 ? "solid" : covered.length >= 2 ? "explain" : "learning";
      const next = markPracticed(storeRef.current, concept.id, mastery);
      storeRef.current = next;
      progress.commit(next);
      saveSession({ conceptId: concept.id, userText: combined, covered, tip, fromModel: false });
      phaseRef.current = "left";
      router.push(`/concept/${concept.id}/feedback`);
    }

    async function submitQuestion() {
      if (!concept) return;
      const question = draftRef.current.trim();
      if (!question) return;
      draftRef.current = "";
      setDraft("");
      stopRec();
      setLines((prev) => [...prev, { who: "me", text: question }]);
      setStatus("小练在说");
      setSpeaking(true);
      const modelText = await modelAnswer(concept.id, question);
      if (cancelled || phaseRef.current !== "listen") return;
      const answer = modelText ?? answerQuestion(concept, question);
      setLines((prev) => [...prev, { who: "tutor", text: answer }]);
      await say(answer);
      setSpeaking(false);
      if (cancelled || phaseRef.current !== "listen") return;
      askingRef.current = false;
      setAsking(false);
      setStatus("小练在说");
      setHint("随时可以打断它提问");
    }

    function hangup() {
      phaseRef.current = "left";
      stopSpeaking();
      stopRec();
      if (concept && spokenRef.current >= 0) {
        const next = markPracticed(storeRef.current, concept.id, "learning");
        storeRef.current = next;
        progress.commit(next);
      }
      router.push("/");
    }

    function togglePause() {
      const next = !pausedRef.current;
      pausedRef.current = next;
      setPaused(next);
      if (next) {
        stopSpeaking();
        setSpeaking(false);
        stopRec();
        setStatus("先想一想");
        setHint("想好了再继续");
        return;
      }
      if (phaseRef.current === "listen" && !askingRef.current) {
        setStatus("小练在说");
        setHint("随时可以打断它提问");
        return;
      }
      setStatus(askingRef.current ? "你想问什么？" : "轮到你讲");
      startRec();
    }

    function onOrb() {
      if (phaseRef.current !== "listen" || askingRef.current || pausedRef.current) return;
      askingRef.current = true;
      setAsking(true);
      stopSpeaking();
      setSpeaking(false);
      setStatus("你想问什么？");
      setHint("问完我会接着讲");
      startRec();
    }

    function onDone() {
      const now = Date.now();
      if (phaseRef.current === "listen") {
        enterRetell();
        return;
      }
      if (phaseRef.current === "retell") {
        if (now < retellReadyAt.current) return;
        void finishRetell();
        return;
      }
      if (phaseRef.current === "followup") {
        if (now < followReadyAt.current) return;
        finishFollow();
      }
    }

    const api = { enterRetell, submitQuestion, hangup, togglePause, onOrb, onDone, stopRec };
    actionRef.current = api;
    const startId = window.setTimeout(() => {
      if (cancelled) return;
      if (voiceOnRef.current && !speechSynthesisAvailable()) setVoiceBroken(true);
      if (!recognitionAvailable()) {
        setMicNote("这台浏览器听不了麦克风，用下面的输入框讲就行。");
      }
      void run();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(startId);
      window.clearInterval(keepAlive);
      window.clearInterval(timer);
      window.speechSynthesis?.removeEventListener("voiceschanged", onVoices);
      stopSpeaking();
      stopRec();
    };
    // The call session is keyed by concept and attempt, so it should start once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concept?.id, progress.ready]);

  if (!concept) {
    return (
      <Night>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="text-xl font-semibold">没有这个概念</p>
          <p className="mt-2 text-sm text-white/60">地图上是 1 到 100。</p>
          <button type="button" className="mt-6 rounded-full bg-white/10 px-5 py-2 text-sm" onClick={() => router.push("/")}>
            回到地图
          </button>
        </div>
      </Night>
    );
  }

  if (!progress.ready) {
    return (
      <Night>
        <div className="flex flex-1 items-center justify-center text-sm text-white/70" aria-busy="true">
          正在接通小练…
        </div>
      </Night>
    );
  }

  const showComposer = asking || phase === "retell" || phase === "followup";

  return (
    <Night>
      <div className="flex items-center justify-between px-5 pt-4 text-sm">
        <span className="tabular-nums text-white/80">{formatTime(elapsed)}</span>
        <span className="text-white/70">女声 · 小练</span>
      </div>

      <div className="px-5 pt-6 text-center">
        <p className="text-sm text-white/60">
          第 {concept.id} 个
          {concept.starter ? " · ★ 入门 20" : ""}
        </p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">{concept.title}</h1>
        <div className="mt-4 flex justify-center gap-2">
          {STAGES.map((stage) => {
            const active = stage.id === phase;
            return (
              <span
                key={stage.id}
                className={cn(
                  "rounded-full px-3 py-1 text-xs",
                  active ? "bg-[#1f9d57] text-white" : "bg-white/8 text-white/45",
                )}
              >
                {stage.label}
              </span>
            );
          })}
        </div>
      </div>

      <div className="relative mx-auto mt-8 grid size-48 place-items-center">
        <span className={cn("absolute size-44 rounded-full border border-white/10", speaking && "orb-ring")} />
        <span className={cn("absolute size-36 rounded-full border border-white/15", speaking && "orb-ring")} />
        <button
          type="button"
          onClick={() => actionRef.current?.onOrb()}
          aria-label="打断并提问"
          className="relative grid size-28 place-items-center rounded-full bg-[radial-gradient(circle_at_38%_32%,#7decc0,#1aa15f_58%,#0c6a40)] text-4xl font-semibold text-white shadow-[0_12px_40px_rgba(16,120,70,0.35)]"
        >
          练
        </button>
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm text-white">{status}</p>
        <p className="mt-1 text-xs text-white/45">{hint}</p>
      </div>

      {voiceBroken ? (
        <p className="mx-5 mt-3 rounded-2xl bg-white/8 px-3 py-2 text-center text-xs text-amber-100">
          这台设备读不了中文，讲解改成文字往下走。
        </p>
      ) : null}

      <div ref={scrollerRef} className="mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto px-5">
        <div className="mt-auto space-y-2 pb-2" aria-live="polite">
          {lines.map((line, index) => (
            <p key={`${line.who}-${index}`} className="text-[13px] leading-6 text-white/80">
              <span className={line.who === "tutor" ? "mr-1.5 text-emerald-300" : "mr-1.5 text-white/45"}>
                {line.who === "tutor" ? "小练" : "我"}
              </span>
              {line.text}
            </p>
          ))}
          {interim ? <p className="text-[13px] text-white/40">听到：{interim}</p> : null}
        </div>
      </div>

      <div className="mx-5 rounded-2xl bg-white/6 px-3.5 py-3">
        <p className="text-[11px] text-white/40">概念卡</p>
        <p className="mt-1 text-[13px] leading-6 text-white/85">{concept.definition}</p>
      </div>

      {showComposer ? (
        <div className="px-5 pt-3">
          <Textarea
            value={draft}
            placeholder={asking ? "想问小练什么？" : "用自己的话讲一遍，打字也行"}
            className="min-h-16 border-white/10 bg-white/6 text-sm text-white placeholder:text-white/35"
            onChange={(event) => {
              draftRef.current = event.target.value;
              setDraft(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (asking) actionRef.current?.submitQuestion();
                else actionRef.current?.onDone();
              }
            }}
          />
          {micNote ? <p className="mt-1.5 text-xs text-white/45">{micNote}</p> : null}
          {asking ? (
            <button
              type="button"
              className="mt-2 text-xs text-emerald-300"
              onClick={() => actionRef.current?.submitQuestion()}
            >
              发送这个问题
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-3 items-start px-6 pt-4">
        <RoundControl
          label={paused ? "继续" : "我想想"}
          onClick={() => actionRef.current?.togglePause()}
        >
          {paused ? <Play className="size-5" /> : <Pause className="size-5" />}
        </RoundControl>
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            aria-label="挂断"
            onClick={() => actionRef.current?.hangup()}
            className="grid size-[68px] place-items-center rounded-full bg-[#ef4456] text-white shadow-[0_8px_24px_rgba(239,68,86,0.35)]"
          >
            <Phone className="size-6 rotate-[135deg]" />
          </button>
          <span className="text-[11px] text-white/55">挂断</span>
        </div>
        <RoundControl label="我讲完了" onClick={() => actionRef.current?.onDone()}>
          <Check className="size-5" />
        </RoundControl>
      </div>
      <p className="px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-[11px] text-white/40">
        戴耳机音质最好 · 随时可以打断小练提问
      </p>
    </Night>
  );
}

function Night({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[radial-gradient(120%_70%_at_50%_12%,#14382a_0%,#07140f_52%,#050d0a_100%)] text-white">
      <div className="mx-auto flex h-dvh w-full max-w-[440px] flex-col">{children}</div>
    </div>
  );
}

function RoundControl({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        className="grid size-14 place-items-center rounded-full bg-white/10 text-white"
      >
        {children}
      </button>
      <span className="text-[11px] text-white/55">{label}</span>
    </div>
  );
}

function formatTime(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

async function modelAnswer(conceptId: number, question: string): Promise<string | null> {
  try {
    const response = await fetch("/api/tutor", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "answer", conceptId, question }),
      signal: AbortSignal.timeout(6000),
    });
    const data = (await response.json()) as { ok?: boolean; text?: string };
    if (data.ok && data.text) return data.text;
  } catch {
    /* local answer */
  }
  return null;
}
