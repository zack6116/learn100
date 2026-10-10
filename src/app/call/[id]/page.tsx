import { Suspense } from "react";
import { CallScreen } from "@/components/call-screen";

export function generateStaticParams() {
  return Array.from({ length: 100 }, (_, index) => ({ id: String(index + 1) }));
}

export default function CallPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-[#07140f] text-sm text-white/70">正在接通小练…</div>
      }
    >
      <CallScreen />
    </Suspense>
  );
}
