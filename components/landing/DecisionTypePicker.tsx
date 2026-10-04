import { DECISION_TYPES, DecisionTypeId } from "@/lib/decisionTypes";

interface DecisionTypePickerProps {
  onSelectType: (typeId: DecisionTypeId) => void;
  onTryExample: () => void;
}

export function DecisionTypePicker({
  onSelectType,
  onTryExample,
}: DecisionTypePickerProps) {
  return (
    <section aria-labelledby="start-title" className="w-full max-w-2xl mx-auto space-y-6 pt-2">
      <div className="text-center space-y-1.5">
        <h2
          id="start-title"
          className="font-serif text-2xl sm:text-3xl font-bold text-[#18263e]"
        >
          What kind of decision is this?
        </h2>
        <p className="text-xs sm:text-sm text-[#4e5e77]">
          Select an area to tailor the reflection lenses, or try a complete example.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5" role="list">
        {DECISION_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelectType(t.id)}
            className="min-h-[56px] text-left p-4 rounded-lg border border-[#dbd4c7] bg-[#ffffff] hover:border-[#b46b19] hover:bg-[#fdf7ee]/40 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] shadow-2xs group cursor-pointer"
          >
            <span className="font-semibold text-sm sm:text-base text-[#18263e] group-hover:text-[#b46b19] transition-colors block">
              {t.label}
            </span>
            <span className="text-xs text-[#4e5e77] mt-1 block leading-normal">
              {t.shortDescription}
            </span>
          </button>
        ))}
      </div>

      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onTryExample}
          className="min-h-[44px] px-6 py-2.5 rounded-md font-medium text-sm text-[#18263e] border border-[#dbd4c7] hover:bg-[#f4efe6] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] cursor-pointer"
        >
          Try an example
        </button>
      </div>
    </section>
  );
}
