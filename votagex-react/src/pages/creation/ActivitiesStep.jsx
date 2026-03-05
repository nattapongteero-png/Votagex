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
          <button className="btn-add-pill" onClick={handleAddClick}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            เพิ่ม
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
                    <div className="activity-section-header">
                      <span className="activity-section-icon" dangerouslySetInnerHTML={{ __html: cfg.icon }} />
                      <span className="activity-section-label">{cfg.label}</span>
                    </div>
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
