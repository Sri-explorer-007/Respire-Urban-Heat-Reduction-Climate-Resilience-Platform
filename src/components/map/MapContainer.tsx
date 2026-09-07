import React from 'react';
import { MapPin } from 'lucide-react';

export const MapContainer: React.FC = () => {
  return (
    <div className="placeholder-card" style={{ height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <MapPin size={48} color="#3B82F6" style={{ marginBottom: '16px' }} />
      <h3>Ward Heat & Vulnerability Map Foundation</h3>
      <p style={{ maxWidth: '480px', fontSize: '0.9rem' }}>
        Modular map container interface ready for zone polygon visualization, temperature layers, and risk overlays.
      </p>
    </div>
  );
};
