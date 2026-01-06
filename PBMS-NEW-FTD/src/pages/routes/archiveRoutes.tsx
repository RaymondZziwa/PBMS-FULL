import { FaArchive } from 'react-icons/fa';
import ArchiveSalesRecords from '../../pages/archives/sales';
import ArchiveExpenseRecords from '../../pages/archives/expenses';

export const ArchiveRoutes = [
  {
    name: "Sales Records",
    icon: FaArchive,
    path: "/archives/sales",
    component: ArchiveSalesRecords,
    routes: [],
  },
   {
    name: "Expense Records",
    icon: FaArchive,
    path: "/archives/expenses",
    component: ArchiveExpenseRecords,
    routes: [],
  },
];
