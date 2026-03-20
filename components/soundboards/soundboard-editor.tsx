"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import type { Clip } from "@/lib/clips/types";
import { getClipFileUrl } from "@/lib/clips/urls";
import {
  SoundboardPlayer,
  type SoundboardResolvedClip,
} from "@/components/soundboards/soundboard-player";
import {
  SequenceList,
  type SequenceListItem,
} from "@/components/soundboards/sequence-list";
import { ClipPicker } from "@/components/soundboards/clip-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SoundboardEditorItem = SequenceListItem & {
  clip?: Clip;
};

type SoundboardEditorProps = {
  cancelHref: string;
  emptyPreviewMessage?: string;
  initialItems?: SoundboardEditorItem[];
  initialName?: string;
  onSubmit: (payload: {
    name: string;
    entries: { clipId: string; position: number }[];
  }) => Promise<void>;
  pageDescription: string;
  pageTitle: string;
  submitLabel: string;
  submittingLabel: string;
};

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from === to) {
    return items;
  }

  const nextItems = [...items];
  const [moved] = nextItems.splice(from, 1);
  nextItems.splice(to, 0, moved);
  return nextItems;
}

function makeSequenceItem(clip: Clip): SoundboardEditorItem {
  return {
    clipId: clip.id,
    clip,
    durationMs: clip.durationMs,
    title: clip.title,
  };
}

export function SoundboardEditor({
  cancelHref,
  emptyPreviewMessage = "Listen to the sequence exactly as this soundboard will play it.",
  initialItems = [],
  initialName = "",
  onSubmit,
  pageDescription,
  pageTitle,
  submitLabel,
  submittingLabel,
}: SoundboardEditorProps) {
  const [name, setName] = useState(initialName);
  const [items, setItems] = useState<SoundboardEditorItem[]>(initialItems);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = useMemo(() => {
    return name.trim().length > 0 && items.length > 0 && !isSaving;
  }, [isSaving, items.length, name]);

  const previewClips = useMemo<SoundboardResolvedClip[]>(() => {
    return items
      .filter((item): item is SoundboardEditorItem & { clip: Clip } => {
        return !item.unavailable && Boolean(item.clip);
      })
      .map((item) => ({
        id: item.clip!.id,
        title: item.clip!.title,
        durationMs: item.clip!.durationMs,
        filters: item.clip!.filters,
        src: getClipFileUrl(item.clip!.filename),
      }));
  }, [items]);

  const sequenceItems = useMemo<SequenceListItem[]>(() => {
    return items.map(({ clipId, durationMs, title, unavailable }) => ({
      clipId,
      durationMs,
      title,
      unavailable,
    }));
  }, [items]);

  const handleSelectClip = useCallback((clip: Clip) => {
    setItems((current) => [...current, makeSequenceItem(clip)]);
  }, []);

  const handleReorder = useCallback((from: number, to: number) => {
    setItems((current) => moveItem(current, from, to));
  }, []);

  const handleRemove = useCallback((index: number) => {
    setItems((current) => current.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(async () => {
    if (!canSave) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSubmit({
        name: name.trim(),
        entries: items.map((item, index) => ({
          clipId: item.clipId,
          position: index,
        })),
      });
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Failed to save soundboard"
      );
    } finally {
      setIsSaving(false);
    }
  }, [canSave, items, name, onSubmit]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {pageTitle}
        </h1>
        <p className="text-sm text-muted-foreground">{pageDescription}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="soundboard-name"
              className="text-sm font-medium text-foreground"
            >
              Soundboard name
            </label>
            <input
              id="soundboard-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Weekend set"
              disabled={isSaving}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? submittingLabel : submitLabel}
            </button>
            <Link
              href={cancelHref}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Cancel
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <ClipPicker onSelect={handleSelectClip} />
        <SequenceList
          clips={sequenceItems}
          onRemove={handleRemove}
          onReorder={handleReorder}
        />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Preview
        </h2>
        <p className="text-sm text-muted-foreground">{emptyPreviewMessage}</p>
      </div>

      <SoundboardPlayer clips={previewClips} />
    </div>
  );
}

export function soundboardEditorItemFromClip(clip: Clip): SoundboardEditorItem {
  return makeSequenceItem(clip);
}

export type { SoundboardEditorItem };
