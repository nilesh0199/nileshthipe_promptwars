export function DemoStrip() {
  return (
    <section aria-label="Grounded reflection preview" className="w-full max-w-2xl mx-auto">
      <div className="rounded-lg border border-[#dbd4c7] bg-[#ffffff] p-5 sm:p-6 shadow-xs space-y-4 text-left">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#6c7c94] block mb-2">
            In your words
          </span>
          <blockquote className="font-serif text-base sm:text-lg text-[#18263e] leading-snug">
            &ldquo;I&apos;m taking it because{" "}
            <mark className="bg-[#fdf7ee] text-[#18263e] px-1 py-0.5 rounded-xs underline decoration-[#b46b19] decoration-2 underline-offset-4 font-medium not-italic">
              the stipend is good
            </mark>{" "}
            and it&apos;s close to home.&rdquo;
          </blockquote>
        </div>

        <div className="rounded-md border border-[#ebd1a4] bg-[#fdf7ee] p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#ffffff] text-[#b46b19] border border-[#ebd1a4]">
              Example finding
            </span>
          </div>
          <p className="font-serif text-sm sm:text-base text-[#18263e] leading-snug">
            &ldquo;You may be assuming the stipend outweighs the cost of the schedule.&rdquo;
          </p>
        </div>

        <p className="text-xs text-[#6c7c94] pt-1 border-t border-[#f4efe6]">
          Every finding points back to your own words.
        </p>
      </div>
    </section>
  );
}
