import api from './axios';

export interface Department {
  id: string;
  name: string;
  code?: string;
  slug: string;
  description?: string;
  status: 'ACTIVE' | 'DISABLED' | 'ARCHIVED';
  parentDepartmentId?: string | null;
  parentDepartment?: { id: string; name: string; slug: string } | null;
  managerId?: string | null;
  manager?: { id: string; fullName: string; email: string; role: string; avatar?: string } | null;
  unitsCount?: number;
  rolesCount?: number;
  directUsersCount?: number;
  totalMembersCount?: number;
  createdAt: string;
  updatedAt: string;
  childDepartments?: any[];
  teams?: any[];
  roles?: any[];
  auditLogs?: any[];
}

export interface Unit {
  id: string;
  name: string;
  code?: string;
  slug: string;
  description?: string;
  status: 'ACTIVE' | 'DISABLED' | 'ARCHIVED';
  unitType: 'UNIT' | 'TEAM' | 'DIVISION';
  departmentId: string;
  department?: { id: string; name: string; slug: string; status: string } | null;
  managerId?: string | null;
  manager?: { id: string; fullName: string; email: string; role: string; avatar?: string } | null;
  parentTeamId?: string | null;
  parentTeam?: { id: string; name: string; slug: string } | null;
  membersCount?: number;
  childUnitsCount?: number;
  createdAt: string;
  updatedAt: string;
  members?: any[];
  childTeams?: any[];
  representedRoles?: any[];
  auditLogs?: any[];
}

export interface StateItem {
  id: string;
  name: string;
  code: string;
  status: string;
  heroImage?: string | null;
  description?: string | null;
  region?: string | null;
  popularCourses?: string[];
  districtsCount: number;
  collegesCount?: number;
  examsCount?: number;
  scholarshipsCount?: number;
  updatesCount?: number;
  activeAssignmentsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StateDetail {
  id: string;
  name: string;
  code: string;
  type: string;
  status: string;
  heroImage?: string | null;
  description?: string | null;
  region?: string | null;
  popularCourses: string[];
  slug: string;
  metrics: {
    totalColleges: number;
    governmentColleges: number;
    privateColleges: number;
    scholarshipsCount: number;
    examsCount: number;
    districtsCount: number;
    updatesCount: number;
  };
  districts: {
    id: string;
    name: string;
    code?: string | null;
    status: string;
    collegesCount: number;
  }[];
}

export interface StateUpdateItem {
  id: string;
  title: string;
  slug: string;
  content: string;
  image?: string | null;
  publishDate: string;
  stateId: string;
  stateName?: string;
  status: string;
  type?: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
  state?: { id: string; name: string; code: string };
}

export interface DistrictItem {
  id: string;
  name: string;
  code?: string;
  stateId: string;
  status: string;
  collegesCount?: number;
  assignments?: any[];
}

export interface GeographicAssignment {
  id: string;
  stateId: string;
  state: { id: string; name: string; code: string };
  districtId?: string | null;
  district?: { id: string; name: string; code?: string } | null;
  responsibleUserId: string;
  responsibleUser: { id: string; fullName: string; email: string; mobile?: string; role: string; avatar?: string; designation?: string };
  backupUserId?: string | null;
  backupUser?: { id: string; fullName: string; email: string; mobile?: string; role: string; avatar?: string; designation?: string } | null;
  assignedRole: string;
  status: 'ACTIVE' | 'DISABLED' | 'ARCHIVED';
  effectiveFrom: string;
  effectiveUntil?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const organizationApi = {
  // Departments
  getDepartments: async (params?: { search?: string; status?: string; parentDepartmentId?: string }) => {
    const res = await api.get('/organization/departments', { params });
    return res.data;
  },

  getDepartmentById: async (id: string) => {
    const res = await api.get(`/organization/departments/${id}`);
    return res.data;
  },

  createDepartment: async (data: {
    name: string;
    slug?: string;
    code?: string;
    description?: string;
    parentDepartmentId?: string;
    managerId?: string;
    status?: string;
  }) => {
    const res = await api.post('/organization/departments', data);
    return res.data;
  },

  updateDepartment: async (
    id: string,
    data: {
      name?: string;
      slug?: string;
      code?: string;
      description?: string;
      parentDepartmentId?: string | null;
      managerId?: string | null;
      status?: string;
    },
  ) => {
    const res = await api.put(`/organization/departments/${id}`, data);
    return res.data;
  },

  updateDepartmentStatus: async (id: string, status: string, reason?: string) => {
    const res = await api.patch(`/organization/departments/${id}/status`, { status, reason });
    return res.data;
  },

  deleteDepartment: async (id: string) => {
    const res = await api.delete(`/organization/departments/${id}`);
    return res.data;
  },

  // Units & Teams
  getUnits: async (params?: {
    departmentId?: string;
    parentTeamId?: string;
    search?: string;
    status?: string;
    unitType?: string;
  }) => {
    const res = await api.get('/organization/units', { params });
    return res.data;
  },

  getUnitById: async (id: string) => {
    const res = await api.get(`/organization/units/${id}`);
    return res.data;
  },

  createUnit: async (data: {
    name: string;
    departmentId: string;
    slug?: string;
    code?: string;
    description?: string;
    unitType?: string;
    managerId?: string;
    parentTeamId?: string;
    status?: string;
  }) => {
    const res = await api.post('/organization/units', data);
    return res.data;
  },

  updateUnit: async (
    id: string,
    data: {
      name?: string;
      slug?: string;
      code?: string;
      description?: string;
      unitType?: string;
      managerId?: string | null;
      parentTeamId?: string | null;
      status?: string;
    },
  ) => {
    const res = await api.put(`/organization/units/${id}`, data);
    return res.data;
  },

  updateUnitStatus: async (id: string, status: string, reason?: string) => {
    const res = await api.patch(`/organization/units/${id}/status`, { status, reason });
    return res.data;
  },

  assignUnitManager: async (unitId: string, managerId: string) => {
    const res = await api.post(`/organization/units/${unitId}/manager`, { managerId });
    return res.data;
  },

  assignUnitMember: async (
    unitId: string,
    data: {
      userId: string;
      memberRole?: string;
      isPrimary?: boolean;
      effectiveFrom?: string;
      effectiveUntil?: string;
    },
  ) => {
    const res = await api.post(`/organization/units/${unitId}/members`, data);
    return res.data;
  },

  removeUnitMember: async (unitId: string, userId: string) => {
    const res = await api.delete(`/organization/units/${unitId}/members/${userId}`);
    return res.data;
  },

  deleteUnit: async (id: string) => {
    const res = await api.delete(`/organization/units/${id}`);
    return res.data;
  },

  // Geography & Responsibility (Public state/district listings for forms & panels)
  getStates: async (params?: { search?: string; status?: string; region?: string }): Promise<StateItem[]> => {
    const res = await api.get('/organization/geography/states', { params });
    return res.data;
  },

  getStateById: async (idOrSlug: string): Promise<StateDetail> => {
    const res = await api.get(`/organization/geography/states/${idOrSlug}`);
    return res.data;
  },

  createState: async (data: {
    name: string;
    code: string;
    status?: string;
    heroImage?: string;
    description?: string;
    region?: string;
    popularCourses?: string[];
  }) => {
    const res = await api.post('/organization/geography/states', data);
    return res.data;
  },

  updateState: async (
    id: string,
    data: {
      name?: string;
      code?: string;
      status?: string;
      heroImage?: string;
      description?: string;
      region?: string;
      popularCourses?: string[];
    },
  ) => {
    const res = await api.patch(`/organization/geography/states/${id}`, data);
    return res.data;
  },

  deleteState: async (id: string) => {
    const res = await api.delete(`/organization/geography/states/${id}`);
    return res.data;
  },

  // State Updates
  getStateUpdates: async (params?: { stateId?: string; state?: string; status?: string }): Promise<StateUpdateItem[]> => {
    const res = await api.get('/organization/geography/updates', { params });
    return res.data;
  },

  createStateUpdate: async (data: {
    title: string;
    content: string;
    stateId: string;
    image?: string;
    publishDate?: string;
    status?: string;
    type?: string;
    author?: string;
  }) => {
    const res = await api.post('/organization/geography/updates', data);
    return res.data;
  },

  updateStateUpdate: async (
    id: string,
    data: {
      title?: string;
      content?: string;
      image?: string;
      publishDate?: string;
      status?: string;
      type?: string;
      author?: string;
    },
  ) => {
    const res = await api.patch(`/organization/geography/updates/${id}`, data);
    return res.data;
  },

  deleteStateUpdate: async (id: string) => {
    const res = await api.delete(`/organization/geography/updates/${id}`);
    return res.data;
  },

  getDistricts: async (stateId: string): Promise<DistrictItem[]> => {
    const res = await api.get(`/organization/geography/districts`, { params: { stateId } });
    return res.data;
  },

  createDistrict: async (data: { name: string; stateId: string; code?: string; status?: string }) => {
    const res = await api.post('/organization/geography/districts', data);
    return res.data;
  },

  updateDistrict: async (id: string, data: { name?: string; code?: string; status?: string }) => {
    const res = await api.put(`/organization/geography/districts/${id}`, data);
    return res.data;
  },

  deleteDistrict: async (id: string) => {
    const res = await api.delete(`/organization/geography/districts/${id}`);
    return res.data;
  },

  getAssignments: async (params?: {
    stateId?: string;
    districtId?: string;
    responsibleUserId?: string;
    status?: string;
    search?: string;
  }) => {
    const res = await api.get('/organization/geography/assignments', {
      params,
    });
    return res.data;
  },

  getAssignmentHistory: async (stateId: string, districtId?: string) => {
    const res = await api.get('/organization/geography/assignments/history', {
      params: { stateId, districtId },
    });
    return res.data;
  },

  createAssignment: async (data: {
    stateId: string;
    districtId?: string | null;
    responsibleUserId: string;
    backupUserId?: string | null;
    assignedRole?: string;
    status?: string;
    effectiveFrom?: string;
    effectiveUntil?: string;
    notes?: string;
  }) => {
    const res = await api.post('/organization/geography/assignments', data);
    return res.data;
  },

  updateAssignment: async (
    id: string,
    data: {
      responsibleUserId?: string;
      backupUserId?: string | null;
      assignedRole?: string;
      status?: string;
      effectiveFrom?: string;
      effectiveUntil?: string;
      notes?: string;
    },
  ) => {
    const res = await api.put(`/organization/geography/assignments/${id}`, data);
    return res.data;
  },

  seedGeography: async () => {
    const res = await api.post('/organization/geography/seed', {});
    return res.data;
  },
};
