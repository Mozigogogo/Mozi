'use client';

import React from 'react';
import NavBar from '@/components/NavBar';

export default function VipRechargeHeader({ title }) {
  return (
    <NavBar
      title={title}
      backgroundColor="#fff"
      showBorder={false}
      fixed={true}
      color="black"
    />
  );
}

