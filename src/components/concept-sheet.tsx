"use client";

import { useRouter } from "next/navigation";
import type { Concept } from "@/data/types";
import { conceptProgress, pillLabel, type Store } from "@/lib/progress";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Phone, Star } from "lucide-react";

export function ConceptSheet({
  concept,
  store,
  onOpenChange,
}: {
  concept: Concept | null;
  store: Store;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const progress = concept ? conceptProgress(store, concept.id) : null;

  return (
    <Sheet open={concept !== null} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-w-[440px] rounded-t-3xl px-5 pb-8">
        {concept && progress ? (
          <>
            <SheetHeader className="px-0">
              <SheetDescription>第 {concept.id} 个</SheetDescription>
              <SheetTitle className="text-2xl font-semibold text-stone-900">{concept.title}</SheetTitle>
            </SheetHeader>
            <div className="mb-3 flex items-center gap-2">
              {concept.starter ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  <Star className="size-3 fill-emerald-600 text-emerald-600" />
                  入门 20
                </span>
              ) : null}
              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600">{pillLabel(progress)}</span>
            </div>
            <p className="text-[15px] leading-7 text-stone-600">{concept.definition}</p>
            <Button
              className="mt-5 h-12 w-full rounded-full bg-[#187a45] text-base text-white hover:bg-[#14683b]"
              onClick={() => router.push(`/call/${concept.id}?n=${Date.now()}`)}
            >
              <Phone data-icon="inline-start" />
              开始通话
            </Button>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
