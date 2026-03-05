import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrips } from '../../contexts/TripContext';
import ProfileStep from './ProfileStep';
import TripNameStep from './TripNameStep';
import DatesStep from './DatesStep';
import ActivitiesStep from './ActivitiesStep';
import MembersStep from './MembersStep';

const STEPS = [ProfileStep, TripNameStep, DatesStep, ActivitiesStep, MembersStep];

export default function CreationFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const { saveTripForm, tripForm } = useTrips();

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate(-1);
    }
  };

  const handleSave = async () => {
    const saved = await saveTripForm();
    navigate('/home');
    return saved;
  };

  const StepComponent = STEPS[currentStep];

  return (
    <div className="app-container">
      <div className="pageview">
        {/* Dots Indicator */}
        <div className="dots-indicator visible">
          {STEPS.map((_, i) => (
            <div key={i} className={`dot ${i === currentStep ? 'active' : ''}`} />
          ))}
        </div>

        <StepComponent
          onNext={goNext}
          onBack={goBack}
          onSave={handleSave}
          tripForm={tripForm}
        />
      </div>
    </div>
  );
}
