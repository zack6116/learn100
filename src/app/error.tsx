"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#f3f0e8] px-6 text-center text-stone-900">
      <p className="text-lg font-semibold">这一页没能打开</p>
      <p className="mt-2 text-sm text-stone-500">进度还在浏览器里。可以再试一次。</p>
      <button type="button" onClick={reset} className="mt-5 rounded-full bg-[#187a45] px-5 py-2 text-sm text-white">
        再试一次
      </button>
    </div>
  );
}
