'use client';

import { useState } from 'react';
import { ServiceSection, type Service } from '@/components/home/HomeSections';
import { RegisterFormSection } from '@/components/home/RegisterSection';
import type { RegisterBlock } from '@/lib/data/register-defaults';

export function ServicesAndRegister({
  services,
  blocks,
}: {
  services: Service[];
  blocks: RegisterBlock[];
}) {
  const [picked, setPicked] = useState<{ id?: number; title: string }>({ title: '' });

  return (
    <div className="dichvu-register-stack">
      <ServiceSection
        services={services}
        selectedServiceId={picked.id}
        onSelectService={(s) => {
          setPicked({ id: s.id, title: s.title_top });
          window.requestAnimationFrame(() => {
            document.getElementById('form-dang-ky')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }}
      />
      <RegisterFormSection
        blocks={blocks}
        services={services}
        selectedService={picked.title}
        selectedServiceId={picked.id}
        onServiceChange={(title, id) => setPicked({ title, id })}
      />
    </div>
  );
}
