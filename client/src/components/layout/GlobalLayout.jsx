import { Outlet } from 'react-router-dom';
import GlobalNavbar from './GlobalNavbar';
import FloatingExtensionButton from './FloatingExtensionButton';

export default function GlobalLayout() {
  return (
    <>
      <GlobalNavbar />
      <Outlet />
      <FloatingExtensionButton />
    </>
  );
}
