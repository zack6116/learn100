import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#f3f0e8] px-6 text-center text-stone-900">
      <p className="text-lg font-semibold">这页不在地图上</p>
      <p className="mt-2 text-sm text-stone-500">回到 100 个概念里继续。</p>
      <Link href="/" className="mt-5 rounded-full bg-[#187a45] px-5 py-2 text-sm text-white">
        回到 Learn100
      </Link>
    </div>
  );
}
