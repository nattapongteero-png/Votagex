import { useState, useEffect } from 'react';
import { CATEGORY_CONFIG } from '../../constants/categories';
import { convertCurrency, convertToTHB } from '../../constants/currencies';
import { getTripDays, formatDateThaiShort, formatISODate } from '../../utils/dates';
import { formatNumberComma, stripCommas } from '../../utils/numbers';
import useModalClose from '../../hooks/useModalClose';

const CURRENCY_OPTIONS = [
  { code: 'JPY', symbol: '¥' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'KRW', symbol: '₩' },
  { code: 'CNY', symbol: '¥' },
  { code: 'AUD', symbol: '$' },
  { code: 'SGD', symbol: '$' }
];

export default function ActivityModal({ tripForm, editingActivity, editingIndex, onSave, onClose }) {
  const { isClosing, handleClose } = useModalClose(onClose);
  const [category, setCategory] = useState('place');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tripDay, setTripDay] = useState('');
  const [time, setTime] = useState('');
  const [amount, setAmount] = useState('');
  const [foreignAmount, setForeignAmount] = useState('');
  const [currency, setCurrency] = useState('JPY');
  const [travelLink, setTravelLink] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [nameError, setNameError] = useState(false);
  const [dayError, setDayError] = useState(false);

  const isEditing = editingIndex >= 0;
  const cfg = CATEGORY_CONFIG[category];
  const tripDays = getTripDays(tripForm.startDate, tripForm.endDate);
  const todayStr = formatISODate(new Date());

  // Populate form when editing
  useEffect(() => {
    if (editingActivity) {
      setCategory(editingActivity.category || 'place');
      setName(editingActivity.name || '');
      setDescription(editingActivity.description || '');
      setTripDay(editingActivity.tripDay || '');
      setTime(editingActivity.time || '');
      setAmount(editingActivity.amount ? String(editingActivity.amount) : '');
      setForeignAmount('');
      setCurrency(editingActivity.targetCurrency || 'JPY');
      setTravelLink(editingActivity.travelLink || '');
      setCheckIn(editingActivity.checkIn || '');
      setCheckOut(editingActivity.checkOut || '');

      // Calculate foreign amount if editing
      if (editingActivity.amount && editingActivity.targetCurrency) {
        const converted = convertCurrency(editingActivity.amount, editingActivity.targetCurrency);
        setForeignAmount(converted);
      }
    } else {
      // Reset form for new activity
      setCategory('place');
      setName('');
      setDescription('');
      setTripDay('');
      setTime('');
      setAmount('');
      setForeignAmount('');
      setCurrency('JPY');
      setTravelLink('');
      setCheckIn('');
      setCheckOut('');
    }
  }, [editingActivity]);

  const handleAmountChange = (val) => {
    const clean = stripCommas(val);
    setAmount(clean);
    const num = parseFloat(clean);
    if (!isNaN(num) && num > 0) {
      setForeignAmount(convertCurrency(num, currency));
    } else {
      setForeignAmount('');
    }
  };

  const handleForeignAmountChange = (val) => {
    const clean = stripCommas(val);
    setForeignAmount(clean);
    const num = parseFloat(clean);
    if (!isNaN(num) && num > 0) {
      const thb = convertToTHB(num, currency);
      setAmount(String(Math.round(thb)));
    } else {
      setAmount('');
    }
  };

  const handleCurrencyChange = (newCurrency) => {
    setCurrency(newCurrency);
    const num = parseFloat(stripCommas(amount));
    if (!isNaN(num) && num > 0) {
      setForeignAmount(convertCurrency(num, newCurrency));
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    setNameError(false);

    // Validate day selection
    if (tripDays.length > 0) {
      if (cfg.hasDate) {
        // Hotel: require both check-in and check-out dates
        if (!checkIn || !checkOut) { setDayError(true); return; }
      } else {
        // Other categories: require tripDay
        if (!tripDay) { setDayError(true); return; }
      }
    }
    setDayError(false);

    const activity = {
      name: name.trim(),
      category,
      time: time || '',
      amount: parseFloat(stripCommas(amount)) || 0,
      targetCurrency: currency || '',
      description: description.trim(),
      travelLink: travelLink.trim(),
      checkIn: checkIn || '',
      checkOut: checkOut || '',
      tripDay: tripDay || ''
    };

    onSave(activity, isEditing ? editingIndex : -1);
  };

  return (
    <div className={`modal-overlay active${isClosing ? ' closing' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="modal-sheet modal-add-activity">
        {/* Header */}
        <div className="modal-add-header">
          <div className="modal-add-header-row">
            <h3 className="modal-add-title">{isEditing ? 'แก้ไข Activity' : 'เพิ่ม Activity'}</h3>
            <button className="modal-close-btn" onClick={handleClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#222B45" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <p className="modal-add-desc">วางแผนทริปต่างประเทศของคุณให้สมบูรณ์แบบ! เพิ่มกิจกรรมที่คุณสนใจ</p>
        </div>

        {/* Category Chips */}
        <div className="chip-group">
          {Object.entries(CATEGORY_CONFIG).map(([key, cat]) => (
            <button
              key={key}
              className={`chip${category === key ? ' active' : ''}`}
              onClick={() => setCategory(key)}
            >
              <span className="chip-icon" dangerouslySetInnerHTML={{ __html: cat.icon }} />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Scrollable Form */}
        <div className="modal-add-scroll">
          {/* Activity Name */}
          <div className="modal-section-card">
            <span className="modal-section-label">ชื่อกิจกรรม</span>
            <input
              type="text"
              className="modal-section-input"
              placeholder="รายละเอียด"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(false); }}
              style={nameError ? { boxShadow: '0 0 0 2px #EF4444' } : undefined}
            />
          </div>

          {/* Description */}
          <div className="modal-section-card">
            <span className="modal-section-label">คำอธิบาย</span>
            <input
              type="text"
              className="modal-section-input"
              placeholder="เพิ่มคำอธิบายกิจกรรม"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Day Selector (not for hotel) */}
          {tripDays.length > 0 && !cfg.hasDate && (
            <div className="modal-section-card" style={dayError && !tripDay ? { boxShadow: '0 0 0 2px #EF4444' } : undefined}>
              <span className="modal-section-label">เลือกวัน <span style={{ color: '#EF4444' }}>*</span></span>
              <div className="modal-day-selector">
                {tripDays.map((date, i) => {
                  const isPast = date < todayStr;
                  return (
                    <button
                      key={date}
                      type="button"
                      className={`day-chip${tripDay === date ? ' active' : ''}${isPast ? ' disabled' : ''}`}
                      disabled={isPast}
                      onClick={() => { if (!isPast) { setTripDay(tripDay === date ? '' : date); setDayError(false); } }}
                    >
                      <span className="day-chip-num">Day {i + 1}</span>
                      <span className="day-chip-date">{formatDateThaiShort(date)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Time (for place, food, shopping - not hotel) */}
          {cfg.hasTime && !cfg.hasDate && (
            <div className="modal-section-card">
              <span className="modal-section-label">เวลา</span>
              <div className="modal-time-row">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="เลือกเวลา"
                />
              </div>
            </div>
          )}

          {/* Hotel-specific fields */}
          {cfg.hasDate && tripDays.length > 0 && (
            <>
              {/* Check-in Time */}
              <div className="modal-section-card">
                <span className="modal-section-label">เวลาเช็คอิน</span>
                <div className="modal-time-row">
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="เลือกเวลา"
                  />
                </div>
              </div>

              {/* Check-in Date */}
              <div className="modal-section-card" style={dayError && !checkIn ? { boxShadow: '0 0 0 2px #EF4444' } : undefined}>
                <span className="modal-section-label">เช็คอิน <span style={{ color: '#EF4444' }}>*</span></span>
                <div className="modal-day-selector">
                  {tripDays.map((date, i) => {
                    const isPast = date < todayStr;
                    return (
                      <button
                        key={date}
                        type="button"
                        className={`day-chip${checkIn === date ? ' active' : ''}${isPast ? ' disabled' : ''}`}
                        disabled={isPast}
                        onClick={() => { if (!isPast) { setCheckIn(checkIn === date ? '' : date); setDayError(false); } }}
                      >
                        <span className="day-chip-num">Day {i + 1}</span>
                        <span className="day-chip-date">{formatDateThaiShort(date)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Check-out Date */}
              <div className="modal-section-card" style={dayError && !checkOut ? { boxShadow: '0 0 0 2px #EF4444' } : undefined}>
                <span className="modal-section-label">เช็คเอาท์ <span style={{ color: '#EF4444' }}>*</span></span>
                <div className="modal-day-selector">
                  {tripDays.map((date, i) => {
                    const isPast = date < todayStr;
                    return (
                      <button
                        key={date}
                        type="button"
                        className={`day-chip${checkOut === date ? ' active' : ''}${isPast ? ' disabled' : ''}`}
                        disabled={isPast}
                        onClick={() => { if (!isPast) { setCheckOut(checkOut === date ? '' : date); setDayError(false); } }}
                      >
                        <span className="day-chip-num">Day {i + 1}</span>
                        <span className="day-chip-date">{formatDateThaiShort(date)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Amount with Currency Conversion */}
          {cfg.hasAmount && (
            <div className="modal-section-card">
              <span className="modal-section-label">ระบุจำนวนค่าใช้จ่าย (ไม่จำเป็น)</span>
              <div className="modal-expense-details">
                <div className="modal-expense-row">
                  <input
                    type="text"
                    placeholder="เงินที่ใช้ไป"
                    inputMode="decimal"
                    value={amount ? formatNumberComma(amount) : ''}
                    onChange={(e) => handleAmountChange(e.target.value)}
                  />
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
                  <input
                    type="text"
                    placeholder="เงินที่แปลง"
                    inputMode="decimal"
                    value={foreignAmount}
                    onChange={(e) => handleForeignAmountChange(e.target.value)}
                  />
                  <select value={currency} onChange={(e) => handleCurrencyChange(e.target.value)}>
                    {CURRENCY_OPTIONS.map(c => (
                      <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Travel Link */}
          <div className="modal-section-card">
            <span className="modal-section-label">ลิงก์การเดินทาง</span>
            <input
              type="url"
              className="modal-section-input"
              placeholder="วางลิงก์ Google Maps..."
              value={travelLink}
              onChange={(e) => setTravelLink(e.target.value)}
            />
          </div>
        </div>

        {/* Bottom Save Button */}
        <div className="modal-add-bottom">
          <button className="btn-gradient-save" onClick={handleSave}>บันทึก</button>
        </div>
      </div>
    </div>
  );
}
