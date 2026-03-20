"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  SoundboardEditor,
  soundboardEditorItemFromClip,
  type SoundboardEditorItem,
} from "@/components/soundboards/soundboard-editor";
import { Card, CardContent } from "@/components/ui/card";
import { getClips } from "@/lib/clips/api";
import type { Clip } from "@/lib/clips/types";
import { getSoundboardById, updateSoundboardApi } from "@/lib/soundboards/api";
import type { Soundboard } from "@/lib/soundboards/types";

type EditSoundboardPageProps = {
  params: {
    id: string;
  };
};

function buildInitialItems(
  soundboard: Soundboard,
  clips: Clip[]
): SoundboardEditorItem[] {
  const clipMap = new Map(clips.map((clip) => [clip.id, clip]));

  return [...soundboard.entries]
    .sort((a, b) => a.position - b.position)
    .map((entry) => {
      const clip = clipMap.get(entry.clipId);
      if (!clip) {
        return {
          clipId: entry.clipId,
          durationMs: null,
          title: "Clip unavailable",
          unavailable: true,
        };
      }

      return soundboardEditorItemFromClip(clip);
    });
}

export default function EditSoundboardPage({
  params,
}: EditSoundboardPageProps) {
  const router = useRouter();
  const [soundboard, setSoundboard] = useState<Soundboard | null>(null);
  const [initialItems, setInitialItems] = useState<SoundboardEditorItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const [loadedSoundboard, clips] = await Promise.all([
          getSoundboardById(params.id),
          getClips(),
        ]);

        if (isCancelled) {
          return;
        }

        setSoundboard(loadedSoundboard);
        setInitialItems(buildInitialItems(loadedSoundboard, clips));
      } catch (nextError) {
        if (isCancelled) {
          return;
        }

        setError(
          nextError instanceof Error
            ? nextError.message
            : "Failed to load soundboard"
        );
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isCancelled = true;
    };
  }, [params.id]);

  const handleSubmit = useCallback(
    async (payload: {
      name: string;
      entries: { clipId: string; position: number }[];
    }) => {
      const updated = await updateSoundboardApi(params.id, payload);
      router.replace(`/soundboards/${updated.id}`);
      router.refresh();
    },
    [params.id, router]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <Card>
          <CardContent className="space-y-4 py-6">
            <div className="h-12 w-full animate-pulse rounded bg-muted" />
            <div className="h-10 w-40 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !soundboard) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-sm text-destructive">
            {error ?? "Soundboard could not be loaded"}
          </p>
          <Link
            href="/soundboards"
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            Back to soundboards
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <SoundboardEditor
      key={soundboard.id}
      cancelHref={`/soundboards/${soundboard.id}`}
      initialItems={initialItems}
      initialName={soundboard.name}
      onSubmit={handleSubmit}
      pageDescription="Update the sequence, keep missing clips visible, and save changes."
      pageTitle={`Edit ${soundboard.name}`}
      submitLabel="Save changes"
      submittingLabel="Saving..."
    />
  );
}
