import { LegalPage } from '@/components/legal-page';
import { PRIVACY } from '@/lib/legal';

export default function Privacy() {
  return <LegalPage title="Privacy policy" sections={PRIVACY} />;
}
