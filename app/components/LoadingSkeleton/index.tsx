type LoadingSkeletonProps = {
  title?: string;
};

const LoadingSkeleton = ({ title = "Loading" }: LoadingSkeletonProps) => (
  <div className="w-full border-2 border-dashed border-line bg-paper-muted p-6">
    <p className="font-mono text-xs font-semibold uppercase tracking-wide text-accent">
      {title}
    </p>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-24 animate-pulse border border-dashed border-line-muted bg-surface"
        />
      ))}
    </div>
  </div>
);

export default LoadingSkeleton;
