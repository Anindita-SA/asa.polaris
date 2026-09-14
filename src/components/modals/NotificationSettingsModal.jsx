import React from 'react';
import SettingsPanel from '../panels/SettingsPanel';

const NotificationSettingsModal = ({ isOpen, onClose }) => {
  return <SettingsPanel open={isOpen} onClose={onClose} initialSection="reminders" />;
};

export default NotificationSettingsModal;
