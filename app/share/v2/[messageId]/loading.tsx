export default function LoadingPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .shimmer-line {
          background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 37%, #e5e7eb 63%);
          background-size: 800px 100%;
          animation: shimmer 1.4s ease-in-out infinite;
          border-radius: 8px;
        }
        .shimmer-box {
          background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 37%, #e5e7eb 63%);
          background-size: 800px 100%;
          animation: shimmer 1.4s ease-in-out infinite;
          border-radius: 12px;
        }
        .shimmer-circle {
          background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 37%, #e5e7eb 63%);
          background-size: 800px 100%;
          animation: shimmer 1.4s ease-in-out infinite;
          border-radius: 50%;
        }
      `}} />

      <div className="flex h-full w-full">
        {/* Code viewer skeleton */}
        <div className="flex flex-1 flex-col bg-white">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="shimmer-box" style={{ width: 70, height: 28 }} />
              <div className="shimmer-box" style={{ width: 70, height: 28 }} />
            </div>
            <div className="flex items-center gap-2">
              <div className="shimmer-box" style={{ width: 32, height: 32 }} />
              <div className="shimmer-box" style={{ width: 32, height: 32 }} />
              <div className="shimmer-box" style={{ width: 80, height: 32 }} />
            </div>
          </div>

          {/* Browser toolbar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50/80">
            <div className="flex items-center gap-1.5">
              <div className="shimmer-circle" style={{ width: 12, height: 12 }} />
              <div className="shimmer-circle" style={{ width: 12, height: 12 }} />
              <div className="shimmer-circle" style={{ width: 12, height: 12 }} />
            </div>
            <div className="shimmer-line flex-1" style={{ height: 24 }} />
            <div className="shimmer-circle" style={{ width: 24, height: 24 }} />
          </div>

          {/* Preview area skeleton */}
          <div className="flex-1 p-8 flex flex-col items-center gap-6">
            {/* Hero block */}
            <div className="shimmer-box w-full max-w-2xl" style={{ height: 200 }} />
            {/* Content cards */}
            <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
              <div className="shimmer-box" style={{ height: 120 }} />
              <div className="shimmer-box" style={{ height: 120 }} />
              <div className="shimmer-box" style={{ height: 120 }} />
            </div>
            {/* Text lines */}
            <div className="flex flex-col gap-2.5 w-full max-w-2xl">
              {[90, 75, 80, 60, 70].map((w, i) => (
                <div key={i} className="shimmer-line" style={{ width: `${w}%`, height: 10, animationDelay: `${i * 60}ms` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
