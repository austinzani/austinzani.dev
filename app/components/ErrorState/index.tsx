type ErrorStateProps = {
  title?: string;
  message: string;
};

const ErrorState = ({ title = "Something went wrong", message }: ErrorStateProps) => (
  <div className="w-full border-2 border-dashed border-line bg-paper-muted p-6">
    <p className="font-mono text-xs font-semibold uppercase tracking-wide text-accent">
      Error
    </p>
    <h2 className="mt-2 font-display text-4xl italic">{title}</h2>
    <p className="mt-2 text-ink-muted">{message}</p>
  </div>
);

export default ErrorState;
