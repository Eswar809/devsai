export default function Loading() {
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
        .shimmer-circle {
          background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 37%, #e5e7eb 63%);
          background-size: 800px 100%;
          animation: shimmer 1.4s ease-in-out infinite;
          border-radius: 50%;
        }
        .shimmer-box {
          background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 37%, #e5e7eb 63%);
          background-size: 800px 100%;
          animation: shimmer 1.4s ease-in-out infinite;
          border-radius: 12px;
        }
      `}} />

      <div className="h-dvh">
        <div className="flex h-full">
          {/* Chat Panel Skeleton */}
          <div className="flex w-full shrink-0 flex-col overflow-hidden lg:w-[30%]">
            {/* Header skeleton */}
            <div className="flex items-center gap-4 px-4 py-4">
              <div className="shimmer-circle" style={{ width: 28, height: 28 }} />
              <div className="shimmer-line" style={{ width: 160, height: 14 }} />
            </div>

            {/* Chat messages skeleton */}
            <div className="relative grow overflow-hidden">
              <div className="mx-auto flex w-full max-w-prose flex-col gap-8 py-8 pl-4 pr-2">
                {/* User message shimmer */}
                <div className="flex justify-end">
                  <div className="shimmer-box" style={{ width: '65%', height: 48 }} />
                </div>

                {/* Assistant response shimmer – text lines */}
                <div className="flex flex-col gap-3">
                  <div className="shimmer-line" style={{ width: '90%', height: 12 }} />
                  <div className="shimmer-line" style={{ width: '75%', height: 12 }} />
                  <div className="shimmer-line" style={{ width: '80%', height: 12 }} />
                  <div className="shimmer-line" style={{ width: '45%', height: 12 }} />
                </div>

                {/* File pill shimmer */}
                <div className="flex items-center gap-2">
                  <div className="shimmer-box" style={{ width: 120, height: 32 }} />
                  <div className="shimmer-box" style={{ width: 100, height: 32 }} />
                </div>

                {/* Version button shimmer */}
                <div className="shimmer-box" style={{ width: 200, height: 40 }} />

                {/* Another user message */}
                <div className="flex justify-end">
                  <div className="shimmer-box" style={{ width: '50%', height: 40 }} />
                </div>

                {/* Another assistant block */}
                <div className="flex flex-col gap-3">
                  <div className="shimmer-line" style={{ width: '85%', height: 12 }} />
                  <div className="shimmer-line" style={{ width: '60%', height: 12 }} />
                  <div className="shimmer-line" style={{ width: '70%', height: 12 }} />
                </div>
              </div>
            </div>

            {/* Chat input skeleton */}
            <div className="px-4 pb-4 pt-2">
              <div className="shimmer-box" style={{ width: '100%', height: 48 }} />
            </div>
          </div>

          {/* Code Viewer Skeleton */}
          <div className="hidden lg:flex flex-col flex-1 border-l border-gray-200 bg-white">
            {/* Code viewer header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="shimmer-box" style={{ width: 70, height: 28 }} />
                <div className="shimmer-box" style={{ width: 70, height: 28 }} />
              </div>
              <div className="shimmer-circle" style={{ width: 24, height: 24 }} />
            </div>

            {/* Code lines */}
            <div className="flex-1 p-6 flex flex-col gap-2.5">
              {[88, 72, 95, 60, 80, 55, 90, 65, 75, 50, 85, 70, 92, 48, 78, 62].map((w, i) => (
                <div
                  key={i}
                  className="shimmer-line"
                  style={{ width: `${w}%`, height: 10, animationDelay: `${i * 60}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
