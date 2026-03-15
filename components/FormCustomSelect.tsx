'use client';

import { useState } from 'react';
import { CustomSelect } from '@/components/CustomSelect';

interface FormCustomSelectProps {
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}

export function FormCustomSelect({ name, defaultValue = '', options, placeholder, required, disabled, id }: FormCustomSelectProps) {
  const [value, setValue] = useState(defaultValue);

  return (
    <>
      <input type="hidden" name={name} value={value} required={required} id={id} />
      <CustomSelect
        value={value}
        onChange={(val) => setValue(val)}
        options={options}
        placeholder={placeholder}
        disabled={disabled}
      />
    </>
  );
}
