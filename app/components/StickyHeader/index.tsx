const StickyHeader = ({ title }: { title: string }) => {
    return (
      <div className="sticky top-14 z-10 my-4">
        <h1 className="text-3xl font-['Outfit'] font-medium pb-2 w-full pt-1 bg-white dark:bg-black relative">
          {title}
        </h1>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-white dark:from-black to-transparent" 
             style={{ transform: 'translateY(100%)' }} />
      </div>
    );
  };
  
  export default StickyHeader;