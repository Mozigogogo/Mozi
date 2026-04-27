import { headers } from 'next/headers';
import HomeClient from '../HomeClient';

function isProbablyMobile(ua = '') {
  const s = String(ua);
  return /Android|iPhone|iPad|iPod|Mobile/i.test(s);
}

export default function AppHomePage() {
  const ua = headers().get('user-agent') || '';
  const initialIsPC = !isProbablyMobile(ua);
  return <HomeClient initialIsPC={initialIsPC} />;
}

