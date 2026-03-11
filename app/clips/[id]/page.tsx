import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ClipDetailPageProps = {
  params: {
    id: string;
  };
};

export default function ClipDetailPage({ params }: ClipDetailPageProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Clip detail
        </h1>
        <p className="text-sm text-muted-foreground">{params.id}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clip</CardTitle>
          <CardDescription>Initial detail route setup.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-40 rounded-xl border border-border bg-muted/50" />
        </CardContent>
      </Card>
    </div>
  );
}
