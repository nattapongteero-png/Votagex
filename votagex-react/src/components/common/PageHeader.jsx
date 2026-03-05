export default function PageHeader({ onBack }) {
  return (
    <div className="page-header-bg">
      <img src="/assets/illustratorheader.png" alt="" className="page-header-img" />
      <div className="page-header-overlay">
        <button className="btn-back-pill" onClick={onBack}>ย้อนกลับ</button>
      </div>
    </div>
  );
}
