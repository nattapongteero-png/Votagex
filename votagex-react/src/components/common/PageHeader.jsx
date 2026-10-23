export default function PageHeader({ onBack }) {
  return (
    <div className="page-header-bg">
      <div className="page-header-overlay">
        <button className="btn-back-round" aria-label="ย้อนกลับ" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
