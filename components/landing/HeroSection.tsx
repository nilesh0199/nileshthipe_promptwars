export function HeroSection() {
  return (
    <section aria-labelledby="hero-title" className="text-center space-y-4 max-w-2xl mx-auto">
      <h1
        id="hero-title"
        className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#18263e] leading-tight"
      >
        See what you might be missing.
      </h1>
      <p className="text-sm sm:text-base font-medium text-[#b46b19]">
        We help you think. We don&apos;t decide for you.
      </p>
      <p className="text-base sm:text-lg text-[#4e5e77] leading-relaxed max-w-xl mx-auto">
        Describe a decision and your reasoning; Second Look shows the assumptions,
        blind spots and open questions in your thinking, in your own words.
      </p>
    </section>
  );
}
