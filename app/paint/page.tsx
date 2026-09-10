import {BreadcrumbListSchema} from '@/components/schema/BreadcrumbList';
import PaintStudio from '@/components/paint/PaintStudio';

export const metadata = {
  title: 'Paint in the air',
  description: 'Draw with your hand in front of the camera, or with a mouse. Hand tracking runs on your own device.',
};

export default function PaintPage() {
  return (
    <>
      <BreadcrumbListSchema items={[{name: 'Home', url: '/'}, {name: 'Paint', url: '/paint'}]} />
      <PaintStudio />
    </>
  );
}
