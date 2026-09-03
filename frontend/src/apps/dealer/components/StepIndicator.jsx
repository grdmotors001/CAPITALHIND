export default function StepIndicator({ steps, currentStep }) {
  return (
    <div className="step-indicator">
      {steps.map((label, idx) => {
        const stepNum = idx + 1;
        const state =
          stepNum < currentStep ? 'done' : stepNum === currentStep ? 'active' : 'upcoming';
        return (
          <div key={label} className={`step-item step-${state}`}>
            <span className="step-circle">{stepNum < currentStep ? '\u2713' : stepNum}</span>
            <span className="step-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
