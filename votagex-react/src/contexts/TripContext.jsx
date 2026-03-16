import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { saveTrip as storageSaveTrip, getTrips as storageGetTrips, updateTrip as storageUpdateTrip, joinTrip as storageJoinTrip, deleteTrip as storageDeleteTrip, subscribeTrips } from '../services/storage';
import { getCurrentUser } from '../services/firebase';

const TripContext = createContext(null);

const INITIAL_TRIP_FORM = {
  name: '',
  description: '',
  coverImage: null,
  startDate: '',
  endDate: '',
  profileName: '',
  profileImage: null,
  activities: [],
  memberCount: 1,
  budget: ''
};

export function TripProvider({ children }) {
  const [tripForm, setTripForm] = useState({ ...INITIAL_TRIP_FORM });
  const [trips, setTrips] = useState([]);
  const [currentTrip, setCurrentTrip] = useState(null);

  // Realtime subscription to Firestore
  useEffect(() => {
    try {
      const unsub = subscribeTrips((tripsData) => setTrips(tripsData));
      return () => unsub();
    } catch {
      storageGetTrips().then(t => setTrips(t));
    }
  }, []);

  const resetTripForm = useCallback(() => {
    const savedName = localStorage.getItem('votagex_username') || '';
    const savedImage = localStorage.getItem('votagex_userimage') || '';
    setTripForm({
      ...INITIAL_TRIP_FORM,
      profileName: savedName,
      profileImage: savedImage || null
    });
  }, []);

  const updateTripForm = useCallback((field, value) => {
    setTripForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const addActivity = useCallback((activity) => {
    setTripForm(prev => ({
      ...prev,
      activities: [...prev.activities, { ...activity, id: 'act_' + Date.now() }]
    }));
  }, []);

  const updateActivity = useCallback((index, activity) => {
    setTripForm(prev => {
      const newActivities = [...prev.activities];
      newActivities[index] = activity;
      return { ...prev, activities: newActivities };
    });
  }, []);

  const removeActivity = useCallback((index) => {
    setTripForm(prev => ({
      ...prev,
      activities: prev.activities.filter((_, i) => i !== index)
    }));
  }, []);

  const saveTripForm = useCallback(async () => {
    const data = { ...tripForm };
    data.members = [{ name: data.profileName, image: data.profileImage }];
    const currentUser = getCurrentUser();
    if (currentUser) {
      data.ownerUid = currentUser.uid;
      data.memberUids = [currentUser.uid];
    }

    if (data.profileName) localStorage.setItem('votagex_username', data.profileName);

    const saved = await storageSaveTrip(data);
    await loadTrips();
    return saved;
  }, [tripForm]);

  const loadTrips = useCallback(async () => {
    const t = await storageGetTrips();
    setTrips(t);
    return t;
  }, []);

  const updateExistingTrip = useCallback(async (tripId, data) => {
    await storageUpdateTrip(tripId, data);
    await loadTrips();
  }, [loadTrips]);

  const joinExistingTrip = useCallback(async (tripId, member) => {
    const currentUser = getCurrentUser();
    await storageJoinTrip(tripId, member, currentUser?.uid);
    await loadTrips();
  }, [loadTrips]);

  const deleteExistingTrip = useCallback(async (tripId) => {
    await storageDeleteTrip(tripId);
    await loadTrips();
  }, [loadTrips]);

  return (
    <TripContext.Provider value={{
      tripForm,
      trips,
      currentTrip,
      resetTripForm,
      updateTripForm,
      addActivity,
      updateActivity,
      removeActivity,
      saveTripForm,
      loadTrips,
      updateExistingTrip,
      joinExistingTrip,
      deleteExistingTrip,
      setCurrentTrip
    }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTrips() {
  const context = useContext(TripContext);
  if (!context) throw new Error('useTrips must be used within TripProvider');
  return context;
}
