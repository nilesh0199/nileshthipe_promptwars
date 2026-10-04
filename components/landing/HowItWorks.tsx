export function HowItWorks() {
  const steps = [
    {
      number: "1",
      title: "Describe your decision",
      description: "Note what you are considering, why it appeals, and your known constraints.",
    },
    {
      number: "2",
      title: "See what's missing",
      description: "Review non-directive questions about assumptions and overlooked angles.",
    },
    {
      number: "3",
      title: "Choose what to investigate",
      description: "Triage findings into your personal inquiry checklist to explore on your terms.",
    },
  ];

  return (
    <section aria-labelledby="how-it-works-title" className="w-full max-w-2xl mx-auto space-y-4">
      <h2
        id="how-it-works-title"
        className="font-serif text-xl sm:text-2xl font-bold text-[#18263e] text-center"
      >
        How it works
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {steps.map((step) => (
          <div
            key={step.number}
            className="rounded-lg border border-[#dbd4c7] bg-[#ffffff] p-4 text-left space-y-2 shadow-2xs"
          >
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold bg-[#fdf7ee] text-[#b46b19] border border-[#ebd1a4]">
              {step.number}
            </span>
            <h3 className="text-sm font-semibold text-[#18263e]">{step.title}</h3>
            <p className="text-xs text-[#4e5e77] leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
