import { FEATURE_KEYS, getPlan, PLAN_CODES, SUBSCRIPTION_STATUSES } from "../config/plans.js";

export function getPlanCode(workspace) {
  return getPlan(workspace?.planCode || PLAN_CODES.FREE).code;
}

export function getSubscriptionStatus(workspace) {
  return workspace?.subscription?.status || (getPlanCode(workspace) === PLAN_CODES.FREE ? SUBSCRIPTION_STATUSES.FREE : `ACTIVE_${getPlanCode(workspace).toUpperCase()}`);
}

export function getCurrentPlan(workspace) {
  return getPlan(getPlanCode(workspace));
}

export function getUsage(workspace, resource) {
  return Array.isArray(workspace?.[resource]) ? workspace[resource].length : 0;
}

export function getLimit(workspace, resource) {
  return getCurrentPlan(workspace).limits[resource];
}

export function isUnlimited(limit) {
  return limit === -1;
}

export function canCreate(workspace, resource) {
  const limit = getLimit(workspace, resource);
  return limit === undefined || isUnlimited(limit) || getUsage(workspace, resource) < limit;
}

export function canAddTeamMember(workspace, currentCount) {
  const limit = getCurrentPlan(workspace).limits.teamMembers;
  return limit === undefined || isUnlimited(limit) || Number(currentCount) < limit;
}

export function canConnectDevice(workspace, currentCount) {
  const limit = getCurrentPlan(workspace).limits.devices;
  return limit === undefined || isUnlimited(limit) || Number(currentCount) < limit;
}

export function assertCanCreate(workspace, resource) {
  const plan = getCurrentPlan(workspace);
  const limit = plan.limits[resource];
  const usage = getUsage(workspace, resource);
  if (limit !== undefined && !isUnlimited(limit) && usage >= limit) {
    const error = new Error("PLAN_LIMIT_REACHED");
    error.resource = resource;
    error.planCode = plan.code;
    error.limit = limit;
    error.usage = usage;
    throw error;
  }
}

export function hasFeature(workspace, feature) {
  return getCurrentPlan(workspace).featureKeys.includes(feature);
}

export function hasAdvancedDashboard(workspace) {
  return hasFeature(workspace, FEATURE_KEYS.ADVANCED_DASHBOARD);
}

export function limitText(limit) {
  return isUnlimited(limit) ? "ilimitado" : String(limit);
}

export function planLimitMessage(error) {
  const resourceNames = { orders: "demandas", clients: "clientes", transactions: "registros financeiros" };
  const resource = resourceNames[error.resource] || "registros";
  return `O plano ${getPlan(error.planCode).name} atingiu o limite de ${error.limit} ${resource} (${error.usage}/${error.limit}). Conheça os planos superiores para continuar.`;
}
