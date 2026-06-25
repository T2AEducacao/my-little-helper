import { EmptyState } from "@/components/php/EmptyState";
import { PageHeader } from "@/components/php/PageHeader";

interface Props {
  title: string;
  description: string;
  empty: { title: string; description: string };
}

export function PlaceholderPage({ title, description, empty }: Props) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader title={title} description={description} />
      <EmptyState title={empty.title} description={empty.description} />
    </div>
  );
}
