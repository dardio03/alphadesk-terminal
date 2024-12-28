import React, { useState, useCallback } from 'react';
import { OrderBookSettingsProps, OrderBookSettings as Settings } from '../types/exchange';
import './OrderBookSettings.css';

const OrderBookSettings: React.FC<OrderBookSettingsProps> = ({
  onSettingsChange,
  settings
}) => {
  const [localSettings, setLocalSettings] = useState<Settings>(settings);

  const handleGroupingChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSettings = {
      ...localSettings,
      grouping: parseFloat(event.target.value)
    };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  }, [localSettings, onSettingsChange]);

  const handlePrecisionChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSettings = {
      ...localSettings,
      precision: parseInt(event.target.value, 10)
    };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  }, [localSettings, onSettingsChange]);

  const handleThemeChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSettings = {
      ...localSettings,
      theme: event.target.value as 'light' | 'dark'
    };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  }, [localSettings, onSettingsChange]);

  return (
    <div className="order-book-settings">
      <div className="settings-group">
        <label htmlFor="grouping">Price Grouping:</label>
        <select
          id="grouping"
          value={localSettings.grouping}
          onChange={handleGroupingChange}
        >
          <option value="0.01">0.01</option>
          <option value="0.1">0.1</option>
          <option value="1">1.0</option>
          <option value="10">10.0</option>
          <option value="100">100.0</option>
        </select>
      </div>

      <div className="settings-group">
        <label htmlFor="precision">Price Precision:</label>
        <select
          id="precision"
          value={localSettings.precision}
          onChange={handlePrecisionChange}
        >
          <option value="0">0</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
        </select>
      </div>

      <div className="settings-group">
        <label htmlFor="theme">Theme:</label>
        <select
          id="theme"
          value={localSettings.theme}
          onChange={handleThemeChange}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
    </div>
  );
};

export default OrderBookSettings;