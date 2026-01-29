import React from 'react';

interface PresetButtonsProps {
  active: string;
  onChange: (preset: string) => void;
  visible?: boolean;
}

const PRESETS = [
  { label: 'Default', value: 'default' },
  { label: 'Bot View', value: 'bot-view' },
  { label: 'Sector', value: 'sector-view' },
  { label: 'Heat Map', value: 'heat-map' },
];

export default function PresetButtons({ active, onChange, visible }: PresetButtonsProps) {
  if (visible === false) return null;

  return (
    <div className="preset-buttons market-panel">
      {PRESETS.map(({ label, value }) => (
        <button
          key={value}
          className={active === value ? 'active' : ''}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
