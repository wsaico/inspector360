'use client';

import { useState } from 'react';
import { useInspectionForm } from '@/context/inspection-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CHECKLIST_TEMPLATE, getChecklistGroupedByCategory } from '@/lib/checklist-template';
import { CHECKLIST_CATEGORIES, ChecklistItem } from '@/types';
import { CheckCircle2, XCircle, MinusCircle, Package } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function Step3Checklist() {
  const { formData, updateChecklist } = useInspectionForm();
  const [selectedEquipment, setSelectedEquipment] = useState(0);
  const grouped = getChecklistGroupedByCategory();

  const currentEquipment = formData.equipment[selectedEquipment];
  const currentChecklist = formData.checklists[currentEquipment?.code] || {};

  const handleStatusChange = (itemCode: string, status: ChecklistItem['status']) => {
    updateChecklist(currentEquipment.code, itemCode, {
      status,
      observations: currentChecklist[itemCode]?.observations || '',
    });
  };

  const getProgress = () => {
    const total = 50;
    const completed = Object.keys(currentChecklist).length;
    return Math.round((completed / total) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Selector de Equipo */}
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Equipo</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          {formData.equipment.map((eq, index) => (
            <Button
              key={eq.code}
              variant={selectedEquipment === index ? 'default' : 'outline'}
              onClick={() => setSelectedEquipment(index)}
            >
              <Package className="mr-2 h-4 w-4" />
              {eq.code}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Progreso */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progreso del Checklist</span>
            <span className="text-sm font-bold">{getProgress()}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${getProgress()}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Checklist por Categoría */}
      {Object.entries(grouped).map(([category, items]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{CHECKLIST_CATEGORIES[category as keyof typeof CHECKLIST_CATEGORIES]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item) => {
              const value = currentChecklist[item.code];
              return (
                <div key={item.code} className="space-y-2 rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{item.code}</p>
                      <p className="text-sm">{item.description}</p>
                    </div>
                    {value?.status && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      variant={value?.status === 'conforme' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange(item.code, 'conforme')}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Conforme
                    </Button>
                    <Button
                      size="sm"
                      variant={value?.status === 'no_conforme' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange(item.code, 'no_conforme')}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      No Conforme
                    </Button>
                    <Button
                      size="sm"
                      variant={value?.status === 'no_aplica' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange(item.code, 'no_aplica')}
                    >
                      <MinusCircle className="mr-2 h-4 w-4" />
                      No Aplica
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
