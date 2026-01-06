// Application Page
// Hosts the Application Wizard

import { useNavigate } from 'react-router-dom';
import { ApplicationWizard } from '@/components/application/ApplicationWizard';

export function Application() {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate('/');
  };

  return <ApplicationWizard onClose={handleClose} />;
}
