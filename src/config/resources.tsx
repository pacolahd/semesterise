import { DashboardOutlined, UserOutlined, FormOutlined, AppstoreOutlined, DeploymentUnitOutlined, BookOutlined } from "@ant-design/icons";
import { IResourceItem } from "@refinedev/core";

export const resources: IResourceItem[] = [
  /**
   * A resource in refine performs these actions"
   * List-> get all  records (Read)
   * Show-> get a single record (Read)
   * create-> create a new record (Create)
   * edit-> update a record (Update)
   * delete-> delete a record (Delete)
   */

  {
    name: "dashboard",
    list: "/",
    meta: {
      label: "Dashboard",
      icon: <AppstoreOutlined />,
    },
  },

  //   {
  //     name: "notes",
  //     list: "/notes",
  //     show: "/notes/show/:id",
  //     create: "/notes/new",
  //     meta: {
  //       label: "Notes",
  //       icon: <FormOutlined />,
  //       canDelete: true,
  //     },
  //   },

  {
    name: "engagements",
    list: "/engagements",
    edit: "/engagements/edit/:id",
    show: "/engagements/show/:id",
    create: "/engagements/create",
    meta: {
      label: "Engagements",
      icon: <DeploymentUnitOutlined />,
      canDelete: true,
    },
  },
];