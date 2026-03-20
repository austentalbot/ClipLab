"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { SoundboardEditor } from "@/components/soundboards/soundboard-editor";
import { createSoundboard } from "@/lib/soundboards/api";

export default function NewSoundboardPage() {
  const router = useRouter();

  const handleSave = useCallback(
    async (payload: {
      name: string;
      entries: { clipId: string; position: number }[];
    }) => {
      await createSoundboard(payload);
      router.replace("/soundboards");
    },
    [router]
  );

  return (
    <SoundboardEditor
      cancelHref="/soundboards"
      onSubmit={handleSave}
      pageDescription="Choose clips, set the order, and save a reusable sequence."
      pageTitle="New soundboard"
      submitLabel="Save soundboard"
      submittingLabel="Saving..."
    />
  );
}
