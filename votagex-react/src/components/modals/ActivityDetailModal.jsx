import { useState } from 'react';
import { CATEGORY_CONFIG } from '../../constants/categories';
import { convertCurrency } from '../../constants/currencies';
import { formatDateThai } from '../../utils/dates';
import { formatNumberComma } from '../../utils/numbers';
import useModalClose from '../../hooks/useModalClose';
import ConfirmModal from './ConfirmModal';

const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', JPY: '¥', GBP: '£',
  KRW: '₩', CNY: '¥', AUD: '$', SGD: '$'
};

export default function ActivityDetailModal({ activity, onClose, onEdit, onDelete }) {
  const { isClosing, handleClose } = useModalClose(onClose);
  const [showConfirm, setShowConfirm] = useState(false);
  if (!activity) return null;

  const cfg = CATEGORY_CONFIG[activity.category] || CATEGORY_CONFIG.other;
  const cur = activity.targetCurrency || 'JPY';
  const symbol = CURRENCY_SYMBOLS[cur] || '';

  const converted = activity.targetCurrency && activity.amount > 0
    ? convertCurrency(activity.amount, activity.targetCurrency)
    : '';

  const handleDelete = () => {
    setShowConfirm(true);
  };

  return (
    <div className={`modal-overlay active${isClosing ? ' closing' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="modal-sheet modal-detail-sheet">
        <div>
          {/* Header */}
          <div className="detail-header">
            <div className="detail-header-row">
              <span className="detail-title">{activity.name}</span>
              <button className="modal-close-btn" onClick={handleClose}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#222B45" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <p className="detail-desc">{activity.description || cfg.defaultDesc || ''}</p>

            {/* Category + Travel Link + Edit + Delete */}
            <div className="detail-categories">
              <div className="detail-cat-item">
                <span className="detail-cat-icon" dangerouslySetInnerHTML={{ __html: cfg.icon }} />
                <span className="detail-cat-label">ประเภท</span>
              </div>

              {activity.travelLink ? (
                <a href={activity.travelLink} target="_blank" rel="noopener noreferrer" className="detail-cat-item clickable">
                  <span className="detail-cat-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2.23525 5.96695C2.66958 4.11534 4.11534 2.66958 5.96695 2.23525C7.30417 1.92158 8.69583 1.92158 10.033 2.23525C11.8847 2.66958 13.3304 4.11534 13.7647 5.96696C14.0784 7.30417 14.0784 8.69583 13.7647 10.033C13.3304 11.8847 11.8847 13.3304 10.033 13.7647C8.69583 14.0784 7.30417 14.0784 5.96696 13.7647C4.11534 13.3304 2.66958 11.8847 2.23525 10.033C1.92158 8.69583 1.92158 7.30417 2.23525 5.96695Z" fill="#2463EB" fillOpacity="0.15" stroke="#2463EB"/>
                      <path d="M6.78788 7.53041C6.9234 7.19161 7.19185 6.92315 7.53066 6.78763L8.88914 6.24424C9.43334 6.02656 9.9734 6.56661 9.75571 7.11082L9.21232 8.4693C9.0768 8.8081 8.80834 9.07656 8.46954 9.21208L7.11106 9.75547C6.56686 9.97315 6.0268 9.4331 6.24448 8.88889L6.78788 7.53041Z" fill="#2463EB" fillOpacity="0.15" stroke="#2463EB" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span className="detail-cat-label">เดินทาง</span>
                </a>
              ) : (
                <div className="detail-cat-item">
                  <span className="detail-cat-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2.23525 5.96695C2.66958 4.11534 4.11534 2.66958 5.96695 2.23525C7.30417 1.92158 8.69583 1.92158 10.033 2.23525C11.8847 2.66958 13.3304 4.11534 13.7647 5.96696C14.0784 7.30417 14.0784 8.69583 13.7647 10.033C13.3304 11.8847 11.8847 13.3304 10.033 13.7647C8.69583 14.0784 7.30417 14.0784 5.96696 13.7647C4.11534 13.3304 2.66958 11.8847 2.23525 10.033C1.92158 8.69583 1.92158 7.30417 2.23525 5.96695Z" fill="#2463EB" fillOpacity="0.15" stroke="#2463EB"/>
                      <path d="M6.78788 7.53041C6.9234 7.19161 7.19185 6.92315 7.53066 6.78763L8.88914 6.24424C9.43334 6.02656 9.9734 6.56661 9.75571 7.11082L9.21232 8.4693C9.0768 8.8081 8.80834 9.07656 8.46954 9.21208L7.11106 9.75547C6.56686 9.97315 6.0268 9.4331 6.24448 8.88889L6.78788 7.53041Z" fill="#2463EB" fillOpacity="0.15" stroke="#2463EB" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span className="detail-cat-label">เดินทาง</span>
                </div>
              )}

              <div className="detail-action-item" onClick={() => onEdit?.()}>
                <span className="detail-action-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8.92421 4.85382L11.3178 2.4602C11.6125 2.16554 12.0121 2 12.4289 2C13.2966 2 14.0001 2.70346 14.0001 3.57123C14.0001 3.98794 13.8345 4.38759 13.5399 4.68225L11.1463 7.07587C10.1057 8.11647 8.80182 8.8547 7.37412 9.21162L6.91149 9.32728C6.76734 9.36332 6.63677 9.23274 6.6728 9.08859L6.78846 8.62596C7.14539 7.19827 7.88361 5.89442 8.92421 4.85382Z" fill="#363853" fillOpacity="0.15"/>
                    <path d="M13.6297 4.59239C12.5187 4.96274 11.0373 3.48137 11.4077 2.37034M11.3178 2.4602L8.92421 4.85382C7.88361 5.89442 7.14539 7.19827 6.78846 8.62596L6.6728 9.08859C6.63677 9.23274 6.76734 9.36332 6.91149 9.32728L7.37412 9.21162C8.80182 8.8547 10.1057 8.11647 11.1463 7.07587L13.5399 4.68225C13.8345 4.38759 14.0001 3.98794 14.0001 3.57123C14.0001 2.70346 13.2966 2 12.4289 2C12.0121 2 11.6125 2.16554 11.3178 2.4602Z" stroke="#363853"/>
                    <path d="M8 2C7.31778 2 6.63556 2.07842 5.96696 2.23525C4.11534 2.66958 2.66958 4.11534 2.23525 5.96695C1.92158 7.30417 1.92158 8.69583 2.23525 10.033C2.66958 11.8847 4.11534 13.3304 5.96696 13.7648C7.30417 14.0784 8.69583 14.0784 10.033 13.7648C11.8847 13.3304 13.3304 11.8847 13.7648 10.033C13.9216 9.36443 14 8.68221 14 7.99998" stroke="#363853" strokeLinecap="round"/>
                  </svg>
                </span>
                <span className="detail-action-label">แก้ไข</span>
              </div>

              <div className="detail-action-item delete" onClick={handleDelete}>
                <span className="detail-action-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3.33333 4.6884H12.6667V8.11722C12.6667 9.16726 12.5189 10.212 12.2279 11.2202C11.8265 12.6105 10.671 13.6464 9.25448 13.8858L9.1493 13.9036C8.3884 14.0321 7.61158 14.0321 6.85067 13.9036L6.74551 13.8858C5.32896 13.6464 4.17345 12.6105 3.7721 11.2202C3.48106 10.212 3.33333 9.16726 3.33333 8.11724V4.6884Z" fill="#E62E05" fillOpacity="0.15"/>
                    <path d="M2 4.1884C1.72386 4.1884 1.5 4.41225 1.5 4.6884C1.5 4.96454 1.72386 5.1884 2 5.1884V4.6884V4.1884ZM14 5.1884C14.2761 5.1884 14.5 4.96454 14.5 4.6884C14.5 4.41225 14.2761 4.1884 14 4.1884V4.6884V5.1884ZM3.33333 4.6884V4.1884H2.83333V4.6884H3.33333ZM12.6667 4.6884H13.1667V4.1884H12.6667V4.6884ZM12.2279 11.2202L12.7083 11.3589L12.2279 11.2202ZM9.1493 13.9036L9.23262 14.3966H9.23262L9.1493 13.9036ZM6.85067 13.9036L6.93399 13.4106L6.93398 13.4106L6.85067 13.9036ZM6.74551 13.8858L6.6622 14.3788H6.6622L6.74551 13.8858ZM3.7721 11.2202L3.29171 11.3589L3.7721 11.2202ZM9.25448 13.8858L9.17117 13.3928V13.3928L9.25448 13.8858ZM5.22836 3.65959L5.68222 3.86938V3.86938L5.22836 3.65959ZM5.87868 2.78741L5.54499 2.41505L5.54499 2.41505L5.87868 2.78741ZM6.85195 2.20464L7.02595 2.67339V2.67339L6.85195 2.20464ZM9.14805 2.20464L9.32205 1.73589V1.73589L9.14805 2.20464ZM10.7716 3.65959L11.2255 3.44981V3.44981L10.7716 3.65959ZM2 4.6884V5.1884H14V4.6884V4.1884H2V4.6884ZM9.25448 13.8858L9.17117 13.3928L9.06599 13.4106L9.1493 13.9036L9.23262 14.3966L9.33779 14.3788L9.25448 13.8858ZM6.85067 13.9036L6.93398 13.4106L6.82882 13.3928L6.74551 13.8858L6.6622 14.3788L6.76736 14.3966L6.85067 13.9036ZM12.6667 4.6884H12.1667V8.11722H12.6667H13.1667V4.6884H12.6667ZM3.33333 8.11724H3.83333V4.6884H3.33333H2.83333V8.11724H3.33333ZM12.6667 8.11722H12.1667C12.1667 9.12037 12.0255 10.1184 11.7475 11.0815L12.2279 11.2202L12.7083 11.3589C13.0123 10.3056 13.1667 9.21414 13.1667 8.11722H12.6667ZM9.1493 13.9036L9.06599 13.4106C8.36024 13.5298 7.63974 13.5298 6.93399 13.4106L6.85067 13.9036L6.76736 14.3966C7.58341 14.5345 8.41656 14.5345 9.23262 14.3966L9.1493 13.9036ZM6.74551 13.8858L6.82882 13.3928C5.60349 13.1857 4.60105 12.289 4.25248 11.0815L3.7721 11.2202L3.29171 11.3589C3.74585 12.932 5.05444 14.1071 6.6622 14.3788L6.74551 13.8858ZM3.7721 11.2202L4.25248 11.0815C3.97446 10.1184 3.83333 9.12038 3.83333 8.11724H3.33333H2.83333C2.83333 9.21415 2.98765 10.3056 3.29171 11.3589L3.7721 11.2202ZM9.25448 13.8858L9.33779 14.3788C10.9455 14.1071 12.2541 12.9321 12.7083 11.3589L12.2279 11.2202L11.7475 11.0815C11.3989 12.289 10.3965 13.1857 9.17117 13.3928L9.25448 13.8858ZM5 4.6884H5.5C5.5 4.40911 5.5613 4.13099 5.68222 3.86938L5.22836 3.65959L4.7745 3.44981C4.5939 3.84053 4.5 4.26159 4.5 4.6884H5ZM5.22836 3.65959L5.68222 3.86938C5.80324 3.60755 5.98238 3.36588 6.21237 3.15978L5.87868 2.78741L5.54499 2.41505C5.21783 2.70823 4.95501 3.05929 4.7745 3.44981L5.22836 3.65959ZM5.87868 2.78741L6.21237 3.15978C6.44246 2.95358 6.71851 2.78751 7.02595 2.67339L6.85195 2.20464L6.67796 1.73589C6.25744 1.89198 5.87205 2.12196 5.54499 2.41505L5.87868 2.78741ZM6.85195 2.20464L7.02595 2.67339C7.33341 2.55926 7.66454 2.5 8 2.5V2V1.5C7.54753 1.5 7.09844 1.57981 6.67796 1.73589L6.85195 2.20464ZM8 2V2.5C8.33546 2.5 8.66659 2.55926 8.97406 2.67339L9.14805 2.20464L9.32205 1.73589C8.90156 1.57981 8.45247 1.5 8 1.5V2ZM9.14805 2.20464L8.97406 2.67339C9.28149 2.78751 9.55754 2.95358 9.78763 3.15978L10.1213 2.78741L10.455 2.41505C10.1279 2.12197 9.74256 1.89198 9.32205 1.73589L9.14805 2.20464ZM10.1213 2.78741L9.78763 3.15978C10.0176 3.36588 10.1968 3.60755 10.3178 3.86938L10.7716 3.65959L11.2255 3.44981C11.045 3.05929 10.7822 2.70823 10.455 2.41505L10.1213 2.78741ZM10.7716 3.65959L10.3178 3.86938C10.4387 4.131 10.5 4.40911 10.5 4.6884H11H11.5C11.5 4.26159 11.4061 3.84053 11.2255 3.44981L10.7716 3.65959ZM3.33333 4.6884V5.1884H12.6667V4.6884V4.1884H3.33333V4.6884Z" fill="#E62E05"/>
                    <path d="M6.66675 8V10.6667M9.33341 8V10.6667" stroke="#E62E05" strokeLinecap="round"/>
                  </svg>
                </span>
                <span className="detail-action-label">ลบรายการ</span>
              </div>
            </div>
          </div>

          {/* Detail Content */}
          <div className="detail-scroll">
            {/* Time (for place, food, shopping - not hotel) */}
            {cfg.hasTime && !cfg.hasDate && (
              <div className="detail-info-card">
                <span className="detail-info-label">เวลา</span>
                <div className={`detail-info-value${!activity.time ? ' empty' : ''}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#222B45" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {activity.time || 'เลือกเวลา'}
                </div>
              </div>
            )}

            {/* Hotel: check-in time + dates */}
            {cfg.hasDate && (
              <>
                <div className="detail-info-card">
                  <span className="detail-info-label">เวลาเช็คอิน</span>
                  <div className={`detail-info-value${!activity.time ? ' empty' : ''}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#222B45" strokeWidth="1.5" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {activity.time || 'เลือกเวลา'}
                  </div>
                </div>
                <div className="detail-info-card">
                  <span className="detail-info-label">วันเข้าพัก</span>
                  <div className={`detail-info-value${(!activity.checkIn && !activity.checkOut) ? ' empty' : ''}`}>
                    {activity.checkIn ? formatDateThai(activity.checkIn) : '--'} - {activity.checkOut ? formatDateThai(activity.checkOut) : '--'}
                  </div>
                </div>
              </>
            )}

            {/* Expense */}
            {cfg.hasAmount && (
              <div className="detail-info-card">
                <span className="detail-info-label">ระบุจำนวนเงินที่ใช้ไป</span>
                <div className="modal-expense-details">
                  <div className="modal-expense-row">
                    <span>{activity.amount > 0 ? formatNumberComma(activity.amount) : 'เงินที่ใช้ไป'}</span>
                    <span>THB (฿)</span>
                  </div>
                  <div className="modal-swap-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#222B45" strokeWidth="1.5" strokeLinecap="round">
                      <polyline points="7 16 3 12 7 8" />
                      <polyline points="17 8 21 12 17 16" />
                      <line x1="3" y1="12" x2="21" y2="12" />
                    </svg>
                  </div>
                  <div className="modal-expense-row">
                    <span>{converted || 'เงินที่แปลง'}</span>
                    <span>{cur} ({symbol})</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="detail-bottom">
            <button className="btn-gradient-save" onClick={handleClose}>ปิด</button>
          </div>
        </div>
      </div>
      {showConfirm && (
        <ConfirmModal
          icon="delete"
          message="ต้องการลบกิจกรรมนี้ใช่ไหม ?"
          confirmText="ลบกิจกรรม"
          onConfirm={() => { setShowConfirm(false); onDelete?.(); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
