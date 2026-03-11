import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const clips = [
  { id: "clip-001", title: "Clip 001" },
  { id: "clip-002", title: "Clip 002" },
];

export default function ClipsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Clips
        </h1>
        <p className="text-sm text-muted-foreground">
          Initial feed route setup.
        </p>
      </div>

      <div className="grid gap-4">
        {clips.map((clip) => (
          <Card key={clip.id}>
            <CardHeader>
              <CardTitle className="text-lg">{clip.title}</CardTitle>
              <CardDescription>{clip.id}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={`/clips/${clip.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Open clip
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
