import { LegalPage } from '@/components/legal-page';
import { privacy } from '@/lib/legal';
import { useStore } from '@/lib/store';

export default function Privacy() {
  const { integrations } = useStore();
  return <LegalPage title="Privacy policy" sections={privacy(integrations)} />;
}
