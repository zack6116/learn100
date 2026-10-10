import { cn } from "cn";

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-grid size-8 shrink-0 grid-cols-2 gap-[3px] rounded-[9px] bg-[#187a45] p-[6px]", className)}
      aria-hidden
    >
      <span className="rounded-[2px] bg-white" />
      <span className="rounded-[2px] bg-white" />
      <span className="rounded-[2px] bg-white" />
      <span className="rounded-[2px] bg-white" />
    </span>
  );
}
