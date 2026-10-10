import { Suspense } from "react";
import { FeedbackScreen } from "@/components/feedback-screen";

export function generateStaticParams() {
  return Array.from({ length: 100 }, (_, index) => ({ id: String(index + 1) }));
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#f3f0e8] px-5 pt-16 text-sm text-stone-500">正在整理这次反馈…</div>}>
      <FeedbackScreen />
    </Suspense>
  );
}
