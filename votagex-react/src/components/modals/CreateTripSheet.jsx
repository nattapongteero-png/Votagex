import { useNavigate } from 'react-router-dom';
import { useTrips } from '../../contexts/TripContext';
import useModalClose from '../../hooks/useModalClose';

export default function CreateTripSheet({ onClose }) {
  const { isClosing, handleClose } = useModalClose(onClose);
  const navigate = useNavigate();
  const { resetTripForm } = useTrips();

  const handleCreate = () => {
    resetTripForm();
    onClose();
    navigate('/create');
  };

  return (
    <>
      <div className={`create-trip-backdrop active${isClosing ? ' closing' : ''}`} onClick={handleClose}></div>
      <div className={`modal-sheet${isClosing ? ' closing-sheet' : ''}`} style={{ padding: '24px 20px', textAlign: 'center' }}>
        <div className="logout-sheet-handle" style={{ marginBottom: 16 }}></div>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#222B45' }}>สร้างทริปใหม่</h3>
        <p style={{ fontSize: 13, color: '#999', marginBottom: 20 }}>วันที่เลือกยังไม่มีทริป มาสร้างทริปใหม่กัน!</p>
        <button className="btn-gradient" onClick={handleCreate}>Create Journey</button>
      </div>
    </>
  );
}
