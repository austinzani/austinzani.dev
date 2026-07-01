type EmptyStateProps = {
  title: string;
  message: string;
};

const EmptyState = ({ title, message }: EmptyStateProps) => (
  <div className="w-full border-2 border-dashed border-line bg-paper-muted p-6">
    <h2 className="font-display text-4xl italic">{title}</h2>
    <p className="mt-2 text-ink-muted">{message}</p>
  </div>
);

export default EmptyState;
