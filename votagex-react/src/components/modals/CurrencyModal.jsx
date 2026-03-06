import { useState, useEffect } from 'react';
import { CURRENCIES, getRate, fetchRates } from '../../constants/currencies';
import useModalClose from '../../hooks/useModalClose';

export default function CurrencyModal({ selected, onSelect, onClose }) {
  const { isClosing, handleClose } = useModalClose(onClose);
  const [search, setSearch] = useState('');
  const [, setRatesLoaded] = useState(false);

  useEffect(() => {
    fetchRates().then(() => setRatesLoaded(true));
  }, []);

  const filtered = CURRENCIES.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (code) => {
    onSelect(code);
    handleClose();
  };

  return (
    <div className={`modal-overlay active${isClosing ? ' closing' : ''}`} style={{ zIndex: 1200 }} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="modal-sheet currency-sheet">
        <div className="members-sheet-header">
          <div>
            <h3 className="members-sheet-title">เลือกสกุลเงิน</h3>
            <p className="members-sheet-desc">เลือกสกุลเงินที่ต้องการแปลง</p>
          </div>
          <button className="modal-close-btn" onClick={handleClose}>
            <svg viewBox="0 0 32 32" fill="none" width="24" height="24">
              <path d="M19.1921 12.793L12.8027 19.1823" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19.1998 19.1908L12.7998 12.7908" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path opacity="0.4" fillRule="evenodd" clipRule="evenodd" d="M3.6665 16.0001C3.6665 25.2494 6.7505 28.3334 15.9998 28.3334C25.2492 28.3334 28.3332 25.2494 28.3332 16.0001C28.3332 6.75075 25.2492 3.66675 15.9998 3.66675C6.7505 3.66675 3.6665 6.75075 3.6665 16.0001Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="currency-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="ค้นหาสกุลเงิน..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="members-sheet-divider"></div>

        <div className="members-sheet-list">
          {filtered.map((c, idx) => {
            const rate = getRate(c.code);
            const isSelected = selected === c.code;
            return (
              <div key={c.code}>
                {idx > 0 && <div className="member-row-divider"></div>}
                <div
                  className={`currency-row${isSelected ? ' selected' : ''}`}
                  onClick={() => handleSelect(c.code)}
                >
                  <span className="currency-flag">{c.flag}</span>
                  <div className="currency-info">
                    <span className="currency-code">{c.code} ({c.symbol})</span>
                    <span className="currency-name">{c.name}</span>
                  </div>
                  <span className="currency-rate">1 ฿ = {rate < 1 ? rate.toFixed(4) : rate < 100 ? rate.toFixed(2) : Math.round(rate)} {c.symbol}</span>
                  {isSelected && (
                    <svg className="currency-check" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
