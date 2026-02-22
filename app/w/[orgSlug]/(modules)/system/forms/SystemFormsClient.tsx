'use client';

import React from 'react';
import FormsView from '@/components/system/FormsView';
import {
  createSystemFormAction,
  toggleFormActiveAction,
  deleteSystemFormAction,
} from '@/app/actions/system-forms';
import type { SystemFormDTO } from '@/app/actions/system-forms';

export default function SystemFormsClient({
  orgSlug,
  initialForms = [],
}: {
  orgSlug: string;
  initialForms?: SystemFormDTO[];
}) {
  return (
    <FormsView
      orgSlug={orgSlug}
      initialForms={initialForms}
      createFormAction={createSystemFormAction}
      toggleActiveAction={toggleFormActiveAction}
      deleteFormAction={deleteSystemFormAction}
    />
  );
}
