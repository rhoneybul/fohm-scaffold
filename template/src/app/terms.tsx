import { LegalPage } from '@/components/legal-page';
import { TERMS } from '@/lib/legal';

export default function Terms() {
  return <LegalPage title="Terms of use" sections={TERMS} />;
}
