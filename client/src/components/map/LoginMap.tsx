import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ILoginRecord } from '../../types';

interface Props {
  logins: ILoginRecord[];
  onSelectLogin?: (record: ILoginRecord) => void;
}

export const LoginMap: React.FC<Props> = ({ logins, onSelectLogin }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize map centered around default coords (India/Global view)
      const map = L.map(mapContainerRef.current, {
        center: [22.5, 78.5],
        zoom: 4,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      // Dark / Modern tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers whenever logins change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    const bounds: L.LatLngTuple[] = [];

    // Filter logins with valid coordinates
    const geoLogins = logins.filter(
      (l) =>
        l.approximateCoordinates &&
        typeof l.approximateCoordinates.lat === 'number' &&
        typeof l.approximateCoordinates.lng === 'number' &&
        !(l.approximateCoordinates.lat === 0 && l.approximateCoordinates.lng === 0)
    );

    geoLogins.forEach((record) => {
      const lat = record.approximateCoordinates.lat;
      const lng = record.approximateCoordinates.lng;
      bounds.push([lat, lng]);

      let pinColor = '#10b981'; // green for success
      if (record.loginStatus === 'failed') pinColor = '#ef4444'; // red
      else if (record.loginStatus === 'otp_required') pinColor = '#f59e0b'; // amber

      // Custom pulse HTML marker
      const customIcon = L.divIcon({
        className: 'custom-pulse-marker',
        html: `
          <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 20px; height: 20px; border-radius: 50%; background-color: ${pinColor}; opacity: 0.3; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${pinColor}; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      const dateStr = new Date(record.loginTimestamp).toLocaleString();
      const popupContent = `
        <div style="font-family: inherit; font-size: 13px; min-width: 180px; color: #1e293b;">
          <div style="font-weight: 700; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
            <span>${record.city}, ${record.country}</span>
            <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: ${pinColor}20; color: ${pinColor}; text-transform: uppercase; font-weight: 800;">
              ${record.loginStatus}
            </span>
          </div>
          <div style="color: #64748b; font-size: 11px; margin-bottom: 2px;">
            <strong>IP:</strong> ${record.ipAddress}
          </div>
          <div style="color: #64748b; font-size: 11px; margin-bottom: 2px;">
            <strong>Device:</strong> ${record.browserName} (${record.operatingSystem})
          </div>
          <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">
            <strong>Date:</strong> ${dateStr}
          </div>
          <div style="border-top: 1px dashed #cbd5e1; padding-top: 4px; font-size: 10px; color: #94a3b8;">
            Approximate IP Geolocation (~City level)
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => {
        if (onSelectLogin) onSelectLogin(record);
      });

      markersGroup.addLayer(marker);
    });

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 12 });
    }
  }, [logins, onSelectLogin]);

  return (
    <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-gray-200 dark:border-cyber-border shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Floating accuracy badge */}
      <div className="absolute bottom-3 left-3 z-20 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-cyber-surface/90 backdrop-blur-md border border-gray-200 dark:border-cyber-border text-xs text-gray-600 dark:text-gray-300 shadow-md flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>Approximate IP Geolocation (Privacy Protected)</span>
      </div>
    </div>
  );
};

