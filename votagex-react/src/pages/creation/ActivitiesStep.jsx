import { useState, useMemo } from 'react';
import { useTrips } from '../../contexts/TripContext';
import { CATEGORY_CONFIG } from '../../constants/categories';
import PageHeader from '../../components/common/PageHeader';
import TravelCard from '../../components/common/TravelCard';
import ActivityCard from '../../components/common/ActivityCard';
import ActivityModal from '../../components/modals/ActivityModal';
import ActivityDetailModal from '../../components/modals/ActivityDetailModal';

export default function ActivitiesStep({ onNext, onBack }) {
  const { tripForm, addActivity, updateActivity, removeActivity } = useTrips();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [detailIndex, setDetailIndex] = useState(-1);

  // Group activities by category
  const groupedActivities = useMemo(() => {
    const groups = {};
    tripForm.activities.forEach((act, originalIndex) => {
      const cat = act.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({ ...act, _origIndex: originalIndex });
    });
    return groups;
  }, [tripForm.activities]);

  const handleAddClick = () => {
    setEditingIndex(-1);
    setShowAddModal(true);
  };

  const handleEditClick = (index) => {
    setEditingIndex(index);
    setShowAddModal(true);
  };

  const handleDetailClick = (index) => {
    setDetailIndex(index);
    setShowDetailModal(true);
  };

  const handleSave = (activity, index) => {
    if (index >= 0) {
      updateActivity(index, activity);
    } else {
      addActivity(activity);
    }
    setShowAddModal(false);
    setEditingIndex(-1);
  };

  const handleDeleteFromDetail = () => {
    removeActivity(detailIndex);
    setShowDetailModal(false);
    setDetailIndex(-1);
  };

  const handleEditFromDetail = () => {
    setShowDetailModal(false);
    setEditingIndex(detailIndex);
    setDetailIndex(-1);
    setShowAddModal(true);
  };

  return (
    <div className="slide" style={{ width: '100%' }}>
      <div className="page5-layout">
        <PageHeader onBack={onBack} />
        <TravelCard />

        {/* Activity Header Row */}
        <div className="activity-header-row">
          <h2 className="activity-heading">กิจกรรม</h2>
          <button className="td-btn-add" onClick={handleAddClick}>
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none"><path d="M2.23525 5.96695C2.66958 4.11534 4.11534 2.66958 5.96696 2.23525C7.30417 1.92158 8.69583 1.92158 10.033 2.23525C11.8847 2.66958 13.3304 4.11534 13.7647 5.96696C14.0784 7.30417 14.0784 8.69583 13.7647 10.033C13.3304 11.8847 11.8847 13.3304 10.033 13.7648C8.69583 14.0784 7.30417 14.0784 5.96696 13.7647C4.11534 13.3304 2.66958 11.8847 2.23525 10.033C1.92158 8.69583 1.92158 7.30417 2.23525 5.96695Z" fill="#363853" fillOpacity="0.15" stroke="white" strokeWidth="1.5"/><path d="M9.66665 8.00016H6.33331M7.99998 9.66683L7.99998 6.3335" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
            เพิ่มกิจกรรม
          </button>
        </div>

        {/* Activity List grouped by category */}
        <div className="page5-activities">
          {tripForm.activities.length > 0 ? (
            <div className="activity-list">
              {Object.entries(groupedActivities).map(([cat, activities]) => {
                const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
                return (
                  <div key={cat} className="activity-section">
                    <span className="activity-section-label">{cfg.label}</span>
                    <div className="activity-section-row">
                      {activities.map((act) => (
                        <ActivityCard
                          key={act.id || act._origIndex}
                          activity={act}
                          showRemove
                          onRemove={() => removeActivity(act._origIndex)}
                          onClick={() => handleDetailClick(act._origIndex)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="page5-empty">
              <p>ยังไม่มีกิจกรรม</p>
              <p style={{ fontSize: 12, color: '#999' }}>กดปุ่ม "เพิ่ม" เพื่อเพิ่มกิจกรรม</p>
            </div>
          )}
        </div>

        <div className="spacer"></div>

        <div className="page2-bottom-fade">
          <button className="btn-gradient" onClick={onNext}>ถัดไป</button>
        </div>
      </div>

      {/* Activity Add/Edit Modal */}
      {showAddModal && (
        <ActivityModal
          tripForm={tripForm}
          editingActivity={editingIndex >= 0 ? tripForm.activities[editingIndex] : null}
          editingIndex={editingIndex}
          onSave={handleSave}
          onClose={() => { setShowAddModal(false); setEditingIndex(-1); }}
        />
      )}

      {/* Activity Detail Modal */}
      {showDetailModal && detailIndex >= 0 && (
        <ActivityDetailModal
          activity={tripForm.activities[detailIndex]}
          onClose={() => { setShowDetailModal(false); setDetailIndex(-1); }}
          onEdit={handleEditFromDetail}
          onDelete={handleDeleteFromDetail}
        />
      )}
    </div>
  );
}
