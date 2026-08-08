import { Outlet } from 'react-router-dom';
import GlobalNavbar from './GlobalNavbar';

export default function GlobalLayout() {
  return (
    <>
      <GlobalNavbar />
      <Outlet />
    </>
  );
}
