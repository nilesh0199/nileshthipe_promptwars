export function WillNeverStrip() {
  const willItems = [
    "question your assumptions",
    "point out what's missing",
    "ask open questions",
    "ask before it guesses",
  ];

  const neverItems = [
    "recommend an option",
    "rank or score your choices",
    "tell you what to do",
    "save anything unless you choose to",
  ];

  return (
    <section aria-label="Product commitments" className="w-full max-w-2xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Second Look will */}
        <div className="rounded-lg border border-[#dbd4c7] bg-[#ffffff] p-5 text-left space-y-3 shadow-2xs">
          <h3 className="font-serif text-base font-bold text-[#18263e] pb-2 border-b border-[#f4efe6]">
            Second Look will
          </h3>
          <ul className="space-y-2 text-xs sm:text-sm text-[#4e5e77]">
            {willItems.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-[#b46b19] font-bold select-none">&bull;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Second Look never */}
        <div className="rounded-lg border border-[#dbd4c7] bg-[#ffffff] p-5 text-left space-y-3 shadow-2xs">
          <h3 className="font-serif text-base font-bold text-[#18263e] pb-2 border-b border-[#f4efe6]">
            Second Look never
          </h3>
          <ul className="space-y-2 text-xs sm:text-sm text-[#4e5e77]">
            {neverItems.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-[#18263e] font-bold select-none">&bull;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
