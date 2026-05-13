"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NetworkRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/roadmap?view=map");
  }, [router]);
  return (
    <div className="flex items-center justify-center pt-24">
      <p className="text-sm text-slate-500">Redirecting to Roadmap...</p>
    </div>
  );
}
