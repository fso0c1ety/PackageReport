import type { PortalConfig } from "../types";

const route = (portal: string, section: string) => `/portal/${portal}?section=${section}`;
const nav = (portal: string, items: Array<[string, string]>) => items.map(([id, label], index) => ({ id, label, route: route(portal, id), mobile: index < 5 }));

export const teacherPortalConfig: PortalConfig = {
  id: "education-teacher", version: 1, name: "Teacher Portal", templateIds: ["kindergarten_nursery"], portalType: "teacher", jobRoles: ["teacher", "educator"], defaultRoute: "/portal/teacher",
  navigation: nav("teacher", [["home","Home"],["groups","My Classes"],["children","My Children"],["attendance","Attendance"],["meals","Meals"],["activities","Daily Activities"],["documents","Documents"],["profile","Profile"]]),
  widgets: [{ id:"groups",type:"record_list",title:"Today's Class",entity:"Groups"},{ id:"children",type:"metric",title:"Children",entity:"Children"},{ id:"attendance",type:"metric",title:"Attendance",entity:"Attendance"}],
  quickActions: [], entityScopes: { Groups:["Groups"],Children:["Children"],Attendance:["Attendance"],Meals:["Meals"],Documents:["Documents"] },
  recordScopes: { Groups:{scope:"assigned_to_me",field:"Educator"},Children:{scope:"assigned_to_me",field:"classTeacherUserId"},Attendance:{scope:"assigned_to_me",field:"classTeacherUserId"},Meals:{scope:"assigned_to_me",field:"educatorUserId"},Documents:{scope:"assigned_to_me",field:"classTeacherUserId"} },
  visibleFields: { Groups:["Name","Age Range","Educator","Assistant","Room","Status"],Children:["Full Name","Date of Birth","Group","Allergies","Photo","Status"],Attendance:["Child","Date","Arrival Time","Departure Time","Present / Absent"],Meals:["Date","Breakfast","Lunch","Snack","Assigned Groups"],Documents:["Child","Document Type","Upload Date","Expiry Date","File","Status"] },
  hiddenFields: { Children:["Medical Notes"] }, permittedActions: {}, featureFlags: { calendar:true,documents:true,notifications:true },
};

export const parentPortalConfig: PortalConfig = {
  id:"education-parent",version:1,name:"Parent Portal",templateIds:["kindergarten_nursery"],portalType:"parent",jobRoles:["parent"],defaultRoute:"/portal/parent",
  navigation:nav("parent",[["home","Home"],["children","My Children"],["attendance","Attendance"],["meals","Meals"],["documents","Documents"],["payments","Payments"],["profile","Profile"]]),
  widgets:[{id:"children",type:"record_list",title:"My Children",entity:"Children"},{id:"attendance",type:"record_list",title:"Today's Report",entity:"Attendance"},{id:"payments",type:"record_list",title:"Payments",entity:"Payments"}],quickActions:[],
  entityScopes:{Children:["Children"],Attendance:["Attendance"],Meals:["Meals"],Documents:["Documents"],Payments:["Payments"]},
  recordScopes:{Children:{scope:"custom",field:"linkedParentUserId",rule:{field:"linkedParentUserId",value:"$current_user"}},Attendance:{scope:"custom",field:"linkedParentUserId",rule:{field:"linkedParentUserId",value:"$current_user"}},Meals:{scope:"custom",field:"linkedParentUserId",rule:{field:"linkedParentUserId",value:"$current_user"}},Documents:{scope:"custom",field:"linkedParentUserId",rule:{field:"linkedParentUserId",value:"$current_user"}},Payments:{scope:"custom",field:"linkedParentUserId",rule:{field:"linkedParentUserId",value:"$current_user"}}},
  visibleFields:{Children:["Full Name","Date of Birth","Group","Allergies","Photo","Status"],Attendance:["Child","Date","Arrival Time","Departure Time","Notes","Present / Absent"],Meals:["Date","Breakfast","Lunch","Snack","Allergens"],Documents:["Child","Document Type","Upload Date","Expiry Date","File","Status"],Payments:["Child","Month","Amount","Discount","Paid Amount","Remaining Amount","Due Date","Payment Status"]},hiddenFields:{Children:["Medical Notes"],Payments:["Parent"]},permittedActions:{},featureFlags:{documents:true,notifications:true},
};

export const doctorPortalConfig: PortalConfig = {
  id:"dental-doctor",version:1,name:"Doctor Portal",templateIds:["dental_clinic"],portalType:"doctor",jobRoles:["doctor","dentist"],defaultRoute:"/portal/doctor",
  navigation:nav("doctor",[["home","Home"],["patients","My Patients"],["appointments","My Appointments"],["treatments","Treatment Plans"],["documents","Documents"],["profile","Profile"]]),
  widgets:[{id:"appointments",type:"record_list",title:"Appointments",entity:"Appointments"},{id:"patients",type:"metric",title:"Assigned Patients",entity:"Patients"},{id:"treatments",type:"record_list",title:"Treatments",entity:"Treatments"}],quickActions:[],entityScopes:{Patients:["Patients"],Appointments:["Appointments"],Treatments:["Treatments"]},
  recordScopes:{Patients:{scope:"assigned_to_me",field:"assignedDoctorUserId"},Appointments:{scope:"assigned_to_me",field:"Dentist"},Treatments:{scope:"assigned_to_me",field:"Dentist"}},visibleFields:{Patients:["Name","Phone","Email","Birthday","Medical Notes","Documents"],Appointments:["Name","Patient","Date","Dentist","Treatment","Status"],Treatments:["Name","Patient","Dentist","Procedure","Date","Files","Status"]},hiddenFields:{Treatments:["Cost"]},permittedActions:{},featureFlags:{calendar:true,documents:true,notifications:true},
};

export const patientPortalConfig: PortalConfig = {
  id:"dental-patient",version:1,name:"Patient Portal",templateIds:["dental_clinic"],portalType:"patient",jobRoles:["patient"],defaultRoute:"/portal/patient",
  navigation:nav("patient",[["home","Home"],["appointments","My Appointments"],["treatments","My Treatment Plan"],["documents","Shared Documents"],["invoices","Invoices"],["profile","Profile"]]),widgets:[{id:"appointments",type:"record_list",title:"Appointments",entity:"Appointments"},{id:"treatments",type:"record_list",title:"Treatment Plan",entity:"Treatments"},{id:"invoices",type:"record_list",title:"Invoices",entity:"Dental Billing"}],quickActions:[],entityScopes:{Appointments:["Appointments"],Treatments:["Treatments"],"Dental Billing":["Dental Billing"]},
  recordScopes:{Appointments:{scope:"custom",field:"linkedPatientUserId",rule:{field:"linkedPatientUserId",value:"$current_user"}},Treatments:{scope:"custom",field:"linkedPatientUserId",rule:{field:"linkedPatientUserId",value:"$current_user"}},"Dental Billing":{scope:"custom",field:"linkedPatientUserId",rule:{field:"linkedPatientUserId",value:"$current_user"}}},visibleFields:{Appointments:["Date","Treatment","Status"],Treatments:["Procedure","Date","Files","Status"],"Dental Billing":["Amount","Paid","Balance","Due Date","Status"]},hiddenFields:{Appointments:["Dentist","Patient"],Treatments:["Dentist","Patient","Cost"],"Dental Billing":["Patient","Treatment"]},permittedActions:{},featureFlags:{calendar:true,documents:true,notifications:true},
};

export const clientPortalConfig: PortalConfig = {
  id:"freight-client",version:1,name:"Client Portal",templateIds:["freight_broker"],portalType:"client",jobRoles:["client"],defaultRoute:"/portal/client",
  navigation:nav("client",[["home","Home"],["loads","My Shipments"],["documents","Documents"],["invoices","Invoices"],["profile","Profile"]]),widgets:[{id:"loads",type:"record_list",title:"Shipments",entity:"Loads"},{id:"documents",type:"record_list",title:"Documents",entity:"Documents"},{id:"invoices",type:"record_list",title:"Invoices",entity:"Invoices"}],quickActions:[],entityScopes:{Loads:["Loads"],Documents:["Documents"],Invoices:["Invoices"]},
  recordScopes:{Loads:{scope:"my_company",field:"clientCompanyId"},Documents:{scope:"my_company",field:"clientCompanyId"},Invoices:{scope:"my_company",field:"clientCompanyId"}},visibleFields:{Loads:["Load ID","Pickup","Delivery","Pickup Date","Delivery Date","POD","Status"],Documents:["Load","Document Type","File","Expiry Date","Status"],Invoices:["Load","Amount","Invoice Date","Due Date","PDF","Status"]},hiddenFields:{Loads:["Carrier","Buy Rate","Sell Rate","Profit","Dispatcher","Carrier Paid"],Invoices:["Client"]},permittedActions:{},featureFlags:{documents:true,notifications:true},
};
