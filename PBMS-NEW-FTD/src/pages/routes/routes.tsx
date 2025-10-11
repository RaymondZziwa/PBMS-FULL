import {
    FaTachometerAlt,
    FaChartBar,
    FaUsers,
    FaShoppingCart,
    FaLaptop,
    FaShoppingBasket,
    FaMoneyCheckAlt,
    FaMoneyBillWave,
    FaPalette,
    FaClipboardList,
    FaCog,
    FaBoxes,
    FaTicketAlt,
    FaSeedling,
    FaProjectDiagram,
    FaReceipt
  } from 'react-icons/fa';
import { SystemConfigRoutes } from './systemConfigRoutes';
import { ExhibitionRoutes } from './exhibitionRoutes';
import { BudgetRoutes } from './budgetRoutes';
import { InventoryRoutes } from './inventoryRoutes';
import { RequisitionRoutes } from './requisitionRoutes';
import { SalesRoutes } from './salesRoutes';
import { ChequeManagementRoutes } from './chequeManagementRoutes';
import { EventTicketRoutes } from './eventTicketRoutes';
import { HumanResourceRoutes } from './humanResourceRoutes';
import { AssetRoutes } from './assetRoutes';
import { ProcurementRoutes } from './procurementRoutes';
import { ProjectsRoutes } from './projectsRoutes';
import { FarmRoutes } from './farmRoutes';
import { ExpensesRoutes } from './expensesRoutes';
  
  export const Routes = [
    {
      name: "Dashboard",
      icon: FaTachometerAlt,
      path: "/dashboard",
      routes: [],
      requiredPermission: "view_dashboard"
    },
    {
      name: "Reports",
      icon: FaChartBar,
      path: "/reports",
      routes: [],
      requiredPermission: "access_reports_module"
      },
      {
        name: "Inventory",
        icon: FaBoxes, 
        routes: InventoryRoutes,
        requiredPermission: "access_inventory_module"
    },
      // {
      //   name: "Requisitions",
      //   icon: FaClipboardList,
      //   routes: RequisitionRoutes,
      //   requiredPermission: "access_requisitions_module"
      // },
      // {
      //   name: "Budgets",
      //   icon: FaMoneyBillWave,
      //   routes: BudgetRoutes,
      //   requiredPermission: "access_budget_module"
      // },
      // {
      //   name: "Procurement",
      //   icon: FaShoppingBasket,
      //   routes: ProcurementRoutes,
      //   requiredPermission: "access_procurement_module"
      // },
      {
        name: "Sales",
        icon: FaShoppingCart,
        routes: SalesRoutes,
        requiredPermission: "access_sales_module"
    },
      {
        name: "Expenses",
        icon: FaReceipt,
        routes: ExpensesRoutes,
        requiredPermission: "access_sales_module"
      },
      // {
      //   name: "Farm",
      //   icon: FaSeedling,
      //   routes: FarmRoutes,
      //   requiredPermission: "access_farm_module"
      // },
      {
        name: "Projects",
        icon: FaProjectDiagram,
        routes: ProjectsRoutes,
        requiredPermission: "access_project_module"
      },
    {
      name: "Human Resource",
      icon: FaUsers,
      routes: HumanResourceRoutes,
      requiredPermission: "access_hr_module"
    },
    
    // {
    //   name: "Assets",
    //   icon: FaLaptop,
    //   routes: AssetRoutes,
    //   requiredPermission: "access_assets_module"
    // },
    // {
    //   name: "Cheque Management",
    //   icon: FaMoneyCheckAlt,
    //   routes: ChequeManagementRoutes,
    //   requiredPermission: "access_cheque_management_module"
    // },
    {
      name: "Exhibition",
      icon: FaPalette,
      routes: ExhibitionRoutes,
      requiredPermission: "access_exhibition_module"
    },
   
    // {
    //   name: "Event Ticket",
    //   icon: FaTicketAlt,
    //   path: "/events/tickets",
    //   routes: EventTicketRoutes,
    //   requiredPermission: "access_ticket_module"
    // },
      {
        name: "System Configuration",
        icon: FaCog,
        routes: SystemConfigRoutes,
        requiredPermission: "create_and_modify_roles",
      },
  ];