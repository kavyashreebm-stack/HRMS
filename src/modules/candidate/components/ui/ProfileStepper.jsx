import React from "react";

export default function ProfileStepper({
  sections = [],
  currentSection = 0,
  setCurrentSection = () => {},
  autoSave = "Saved",
  stepIcons = [],
  readOnly = true,
  isDirty = false,
  embedded = false,
  isStepDisabled = () => false,
  onStepDisabledClick = () => {},
}) {
  if (!sections.length) return null;

  return (
    /* FIX 1: Added 'bg-white' and 'relative z-10' to ensure 
       it doesn't become transparent or get overlapped.
    */
    <div className={`bg-white w-full relative z-10 ${embedded ? "" : ""}`}>
      
      {/* Container for the steps */}
      <div className="flex items-center justify-between px-4 md:px-10 py-4 max-w-7xl mx-auto overflow-x-auto no-scrollbar">
        {sections.map((section, index) => {
          const Icon = stepIcons[index];
          const isCurrent = index === currentSection;
          const isCompleted = index < currentSection;
          const disabled = isStepDisabled(index);

          return (
            <div
              key={index}
              tabIndex={disabled ? -1 : 0}
              onKeyDown={(e) => {
                if (disabled) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setCurrentSection(index);
                }
              }}
              className={`flex-1 min-w-[80px] text-center transition-all duration-300 rounded-lg py-1 outline-none ${
                disabled
                  ? "opacity-35 cursor-not-allowed select-none"
                  : "cursor-pointer hover:bg-gray-50 focus:bg-gray-50"
              } ${!readOnly && !disabled ? "opacity-90" : ""}`}
              onClick={() => {
                if (disabled) {
                  onStepDisabledClick(index);
                  return;
                }
                setCurrentSection(index);
              }}
            >
              <div className="flex flex-col items-center">
                <div
                  className={`text-xl md:text-2xl mb-1 ${
                    disabled
                      ? "text-gray-300"
                      : isCurrent
                      ? "text-red-600 scale-110 transition-transform"
                      : isCompleted
                      ? "text-black"
                      : "text-gray-400"
                  }`}
                >
                  {Icon && <Icon />}
                </div>

                <span
                  className={`text-[10px] md:text-xs leading-tight block px-1 ${
                    isCurrent
                      ? "text-red-600 font-bold"
                      : "text-gray-500 font-medium"
                  }`}
                >
                  {section}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Bar Area */}
      <div className="px-4 md:px-10 pb-3 max-w-7xl mx-auto">
        <div className="flex justify-between items-center text-[10px] md:text-xs mb-1.5">
          <div className="flex items-center gap-2">
             <span className="font-semibold text-gray-700">Profile Completion</span>
             <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold">
               {Math.round(((currentSection + 1) / sections.length) * 100)}%
             </span>
          </div>
          <div className="text-gray-400 italic">
            {autoSave === "Saving..." ? (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                Saving...
              </span>
            ) : (
              <span className="text-green-600">✓ Saved</span>
            )}
          </div>
        </div>

        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-red-600 h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${Math.round(((currentSection + 1) / sections.length) * 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}