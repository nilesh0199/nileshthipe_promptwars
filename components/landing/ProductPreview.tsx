export function ProductPreview() {
  return (
    <div
      aria-hidden="true"
      className="hidden sm:block w-full max-w-sm mx-auto relative select-none pointer-events-none"
    >
      <div className="relative rounded-2xl border border-[#dbd4c7] bg-[#ffffff] p-5 shadow-xs space-y-4">
        {/* Document Header representation */}
        <div className="flex items-center justify-between pb-2.5 border-b border-[#f3ede2]">
          <div className="h-2.5 w-24 rounded-full bg-[#dbd4c7]" />
          <div className="h-2 w-12 rounded-full bg-[#ebd1a4]" />
        </div>

        {/* 5 rounded grey bars representing text lines, two with amber highlight */}
        <div className="space-y-2.5">
          {/* Bar 1 */}
          <div className="h-2.5 w-11/12 rounded-full bg-[#e6e0d5]" />

          {/* Bar 2: Highlighted clean pill (no border-l arc) */}
          <div className="h-3 w-4/5 rounded-full bg-[#fbeedb] flex items-center px-2">
            <div className="h-1.5 w-full rounded-full bg-[#d99b4d]" />
          </div>

          {/* Bar 3 */}
          <div className="h-2.5 w-5/6 rounded-full bg-[#e6e0d5]" />

          {/* Bar 4: Highlighted clean pill (no border-l arc) */}
          <div className="h-3 w-3/4 rounded-full bg-[#fbeedb] flex items-center px-2">
            <div className="h-1.5 w-full rounded-full bg-[#d99b4d]" />
          </div>

          {/* Bar 5 */}
          <div className="h-2.5 w-1/2 rounded-full bg-[#e6e0d5]" />
        </div>

        {/* 3 Finding cards with chips and grey bars */}
        <div className="pt-3 border-t border-[#f3ede2] grid grid-cols-1 gap-2.5">
          {/* Finding 1: Assumption */}
          <div className="rounded-xl border border-[#ebd1a4] bg-[#fdf7ee]/80 p-2.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold tracking-wide text-[#b46b19] bg-[#ffffff] px-2 py-0.5 rounded-md border border-[#ebd1a4]">
                Assumption
              </span>
            </div>
            <div className="h-2 w-4/5 rounded-full bg-[#dbd4c7]" />
            <div className="h-2 w-3/5 rounded-full bg-[#e6e0d5]" />
          </div>

          {/* Finding 2: Overlooked */}
          <div className="rounded-xl border border-[#dbd4c7] bg-[#ffffff] p-2.5 space-y-1.5 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold tracking-wide text-[#18263e] bg-[#f3ede2] px-2 py-0.5 rounded-md">
                Overlooked
              </span>
            </div>
            <div className="h-2 w-5/6 rounded-full bg-[#dbd4c7]" />
            <div className="h-2 w-2/3 rounded-full bg-[#e6e0d5]" />
          </div>

          {/* Finding 3: Question */}
          <div className="rounded-xl border border-[#dbd4c7] bg-[#ffffff] p-2.5 space-y-1.5 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold tracking-wide text-[#4e5e77] bg-[#f3ede2] px-2 py-0.5 rounded-md">
                Question
              </span>
            </div>
            <div className="h-2 w-3/4 rounded-full bg-[#dbd4c7]" />
            <div className="h-2 w-1/2 rounded-full bg-[#e6e0d5]" />
          </div>
        </div>
      </div>
    </div>
  );
}
