interface StoryProgressDotsProps {
  totalDots: number;
  currentIndex: number;
  onDotClick: (index: number) => void;
}

const StoryProgressDots = ({
  totalDots,
  currentIndex,
  onDotClick,
}: StoryProgressDotsProps) => {
  return (
    <div className="flex gap-1 w-full">
      {Array.from({ length: totalDots }).map((_, index) => (
        <button
          key={index}
          onClick={(e) => {
            e.stopPropagation();
            onDotClick(index);
          }}
          className={`
            h-1 flex-1 rounded-full transition-all duration-300
            ${
              index === currentIndex
                ? "bg-white"
                : index < currentIndex
                  ? "bg-white/60"
                  : "bg-white/30"
            }
          `}
          aria-label={`Go to slide ${index + 1}`}
          aria-current={index === currentIndex ? "true" : "false"}
        />
      ))}
    </div>
  );
};

export default StoryProgressDots;
