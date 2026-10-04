import React, { useState, useMemo } from 'react';
import { StopEntity, LiveLocationEntity } from '@nammabus/shared-types';

export interface InteractiveMapProps {
  stops: StopEntity[];
  currentLocation?: LiveLocationEntity | null;
  selectedStopId?: string | null;
  busNumber?: string;
  isTrackingActive?: boolean;
  isGpsStale?: boolean;
  onStopSelect?: (stop: StopEntity) => void;
  height?: string | number;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  stops = [],
  currentLocation,
  selectedStopId,
  busNumber = 'NB-01',
  isTrackingActive = true,
  isGpsStale = false,
  onStopSelect,
  height = '360px',
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [viewOffset, setViewOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Map coordinates projection
  const bounds = useMemo(() => {
    if (stops.length === 0) {
      return { minLat: 12.9, maxLat: 13.1, minLng: 77.5, maxLng: 77.7 };
    }
    const lats = stops.map((s) => s.latitude);
    const lngs = stops.map((s) => s.longitude);
    if (currentLocation) {
      lats.push(currentLocation.latitude);
      lngs.push(currentLocation.longitude);
    }
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    // Add 15% padding
    const latPad = (maxLat - minLat || 0.02) * 0.15;
    const lngPad = (maxLng - minLng || 0.02) * 0.15;
    return {
      minLat: minLat - latPad,
      maxLat: maxLat + latPad,
      minLng: minLng - lngPad,
      maxLng: maxLng + lngPad,
    };
  }, [stops, currentLocation]);

  const projectToView = (lat: number, lng: number) => {
    const latSpan = bounds.maxLat - bounds.minLat || 0.01;
    const lngSpan = bounds.maxLng - bounds.minLng || 0.01;
    // Map to 1000 x 600 internal coordinate space
    const x = ((lng - bounds.minLng) / lngSpan) * 880 + 60;
    // Invert Y for latitude (higher lat = lower y in SVG)
    const y = ((bounds.maxLat - lat) / latSpan) * 480 + 60;
    return { x, y };
  };

  const projectedStops = useMemo(() => {
    return stops.map((s) => ({
      ...s,
      point: projectToView(s.latitude, s.longitude),
    }));
  }, [stops, bounds]);

  const projectedBus = useMemo(() => {
    if (!currentLocation) return null;
    return projectToView(currentLocation.latitude, currentLocation.longitude);
  }, [currentLocation, bounds]);

  const routePathD = useMemo(() => {
    if (projectedStops.length < 2) return '';
    return projectedStops.reduce((acc, curr, idx) => {
      if (idx === 0) return `M ${curr.point.x} ${curr.point.y}`;
      // Smooth quadratic curve between stops
      const prev = projectedStops[idx - 1];
      const midX = (prev.point.x + curr.point.x) / 2;
      const midY = (prev.point.y + curr.point.y) / 2;
      return `${acc} Q ${prev.point.x} ${prev.point.y}, ${midX} ${midY} T ${curr.point.x} ${curr.point.y}`;
    }, '');
  }, [projectedStops]);

  // Touch & Mouse Drag handlers for panning
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - viewOffset.x, y: e.clientY - viewOffset.y });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setViewOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleRecenter = () => {
    setViewOffset({ x: 0, y: 0 });
    setZoomLevel(1);
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        backgroundColor: '#0a0f1d',
        borderRadius: 'var(--nb-radius-lg, 16px)',
        overflow: 'hidden',
        border: '1px solid var(--nb-border-subtle, rgba(255, 255, 255, 0.08))',
        boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.6), 0 8px 24px rgba(0, 0, 0, 0.3)',
        touchAction: 'none',
        userSelect: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Grid line background overlay for radar/tech aesthetics */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle, rgba(59, 130, 246, 0.08) 1px, transparent 1px), linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          pointerEvents: 'none',
        }}
      />

      {/* Interactive SVG Canvas */}
      <svg
        viewBox="0 0 1000 600"
        style={{
          width: '100%',
          height: '100%',
          transform: `translate3d(${viewOffset.x}px, ${viewOffset.y}px, 0) scale(${zoomLevel})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <defs>
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity="0.8" />
            <stop offset="50%" stopColor="hsl(38, 96%, 53%)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="hsl(158, 64%, 48%)" stopOpacity="0.8" />
          </linearGradient>
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Route Polyline Glow */}
        {routePathD && (
          <>
            <path
              d={routePathD}
              fill="none"
              stroke="rgba(59, 130, 246, 0.25)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={routePathD}
              fill="none"
              stroke="url(#routeGradient)"
              strokeWidth="4"
              strokeDasharray="8 4"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#neonGlow)"
            />
          </>
        )}

        {/* Stops Markers */}
        {projectedStops.map((stop, idx) => {
          const isSelected = selectedStopId === stop.id;
          return (
            <g
              key={stop.id}
              onClick={(e) => {
                e.stopPropagation();
                onStopSelect?.(stop);
              }}
              style={{ cursor: 'pointer' }}
            >
              {/* Geofence boundary circle */}
              <circle
                cx={stop.point.x}
                cy={stop.point.y}
                r={isSelected ? 32 : 18}
                fill={isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.04)'}
                stroke={isSelected ? 'hsl(217, 91%, 60%)' : 'rgba(255, 255, 255, 0.18)'}
                strokeWidth={isSelected ? '2' : '1'}
                strokeDasharray={isSelected ? '4 3' : undefined}
              />
              {/* Inner Node */}
              <circle
                cx={stop.point.x}
                cy={stop.point.y}
                r={isSelected ? 9 : 6}
                fill={isSelected ? '#3b82f6' : '#94a3b8'}
                stroke="#0a0f1d"
                strokeWidth="2"
              />
              {/* Stop Number Badge */}
              <circle
                cx={stop.point.x - 12}
                cy={stop.point.y - 12}
                r="8"
                fill="#1e293b"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="1"
              />
              <text
                x={stop.point.x - 12}
                y={stop.point.y - 9}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill="#f8fafc"
              >
                {idx + 1}
              </text>
              {/* Stop Name Label */}
              <text
                x={stop.point.x}
                y={stop.point.y + (isSelected ? 34 : 26)}
                textAnchor="middle"
                fontSize={isSelected ? '12' : '10'}
                fontWeight={isSelected ? '700' : '500'}
                fill={isSelected ? '#60a5fa' : '#cbd5e1'}
                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
              >
                {stop.name}
              </text>
            </g>
          );
        })}

        {/* Live Bus Marker */}
        {projectedBus && isTrackingActive && (
          <g transform={`translate(${projectedBus.x}, ${projectedBus.y})`}>
            {/* Animated Radar Pulse Rings (120fps CSS transform) */}
            <circle
              r="28"
              fill="rgba(245, 158, 11, 0.15)"
              stroke="hsl(38, 96%, 53%)"
              strokeWidth="1.5"
              style={{
                animation: 'nb-bus-pulse 1.8s infinite cubic-bezier(0.16, 1, 0.3, 1)',
                transformOrigin: '0 0',
              }}
            />
            {/* Bus Base Body */}
            <circle
              r="16"
              fill="hsl(38, 96%, 53%)"
              stroke="#0a0f1d"
              strokeWidth="3"
              filter="url(#neonGlow)"
            />
            {/* Bus Emoji / Icon */}
            <text
              textAnchor="middle"
              y="5"
              fontSize="14"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              🚌
            </text>
            {/* Bus Identifier Badge */}
            <g transform="translate(0, -26)">
              <rect
                x="-36"
                y="-14"
                width="72"
                height="18"
                rx="9"
                fill="#0f172a"
                stroke="hsl(38, 96%, 53%)"
                strokeWidth="1.5"
              />
              <text
                textAnchor="middle"
                y="-1"
                fill="#fbbf24"
                fontSize="10"
                fontWeight="800"
                letterSpacing="0.04em"
              >
                {busNumber}
              </text>
            </g>
          </g>
        )}
      </svg>

      {/* Status Alert Overlay */}
      {isGpsStale && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(239, 68, 68, 0.88)',
            color: '#ffffff',
            padding: '6px 14px',
            borderRadius: '9999px',
            fontSize: '0.78rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span style={{ fontSize: '0.85rem' }}>⚠️</span>
          <span>STALE GPS: Signal delayed</span>
        </div>
      )}

      {/* Floating Controls */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <button
          onClick={() => setZoomLevel((z) => Math.min(z + 0.3, 2.5))}
          title="Zoom In"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'rgba(30, 41, 59, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#f8fafc',
            fontSize: '18px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
          }}
        >
          +
        </button>
        <button
          onClick={() => setZoomLevel((z) => Math.max(z - 0.3, 0.7))}
          title="Zoom Out"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'rgba(30, 41, 59, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#f8fafc',
            fontSize: '18px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
          }}
        >
          -
        </button>
        <button
          onClick={handleRecenter}
          title="Recenter Map"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'rgba(30, 41, 59, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#60a5fa',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
          }}
        >
          🎯
        </button>
      </div>

      {/* Legend Badge */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          padding: '6px 10px',
          fontSize: '0.72rem',
          color: 'var(--nb-text-secondary, #94a3b8)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24' }} />
          Bus
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
          Stop
        </span>
      </div>
    </div>
  );
};
