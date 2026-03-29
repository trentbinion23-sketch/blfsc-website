type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="card-surface p-8 text-center">
      <p className="eyebrow">Nothing here yet</p>
      <h3 className="mt-4 text-3xl leading-none">{title}</h3>
      <p className="mx-auto mt-4 max-w-xl text-base leading-7">{description}</p>
    </div>
  );
}
