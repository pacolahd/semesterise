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
        name: 'dashboard',
        list: '/',
        meta: {
            label: 'Dashboard',
            icon: <AppstoreOutlined />
        }
    },

    {
        name: 'courses',
        list: '/courses',
        meta: {
            label: 'Courses',
            icon: <BookOutlined />
        }
    },

    {
        name: 'notes',
        list: '/notes',
        show: '/notes/:id',
        create: '/notes/new',
        meta: {
            label: 'Notes',
            icon: <FormOutlined />
        }
    },

    {
        name: 'engagements',
        list: '/engagements',
        show: '/engagements/:id',
        create: '/engagements/new',
        meta: {
            label: 'Engagements',
            icon: <DeploymentUnitOutlined />
        }
    },
   

]