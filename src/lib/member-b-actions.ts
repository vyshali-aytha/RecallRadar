import 'server-only';

import { pool } from './db';
import {
  createAppUser as createAppUserCore,
  createDistributor as createDistributorCore,
  createInventory as createInventoryCore,
  createInventoryLocation as createInventoryLocationCore,
  createRecall as createRecallCore,
  createRecallImpact as createRecallImpactCore,
  createShipment as createShipmentCore,
  deleteAppUser as deleteAppUserCore,
  deleteDistributor as deleteDistributorCore,
  deleteInventory as deleteInventoryCore,
  deleteInventoryLocation as deleteInventoryLocationCore,
  deleteRecall as deleteRecallCore,
  deleteRecallImpact as deleteRecallImpactCore,
  deleteShipment as deleteShipmentCore,
  getAllAppUsers as getAllAppUsersCore,
  getAllDistributors as getAllDistributorsCore,
  getAllInventory as getAllInventoryCore,
  getAllInventoryLocations as getAllInventoryLocationsCore,
  getAllRecallImpacts as getAllRecallImpactsCore,
  getAllRecalls as getAllRecallsCore,
  getAllShipments as getAllShipmentsCore,
  getAppUserById as getAppUserByIdCore,
  getDistributorById as getDistributorByIdCore,
  getInventoryById as getInventoryByIdCore,
  getInventoryLocationById as getInventoryLocationByIdCore,
  getRecallById as getRecallByIdCore,
  getRecallImpactById as getRecallImpactByIdCore,
  getShipmentById as getShipmentByIdCore,
  type AppUserInput,
  type DistributorInput,
  type InventoryInput,
  type InventoryLocationInput,
  type RecallImpactInput,
  type RecallInput,
  type ShipmentInput,
  updateAppUser as updateAppUserCore,
  updateDistributor as updateDistributorCore,
  updateInventory as updateInventoryCore,
  updateInventoryLocation as updateInventoryLocationCore,
  updateRecall as updateRecallCore,
  updateRecallImpact as updateRecallImpactCore,
  updateShipment as updateShipmentCore,
} from './member-b-core';

export type { AppUserInput, DistributorInput, InventoryInput, InventoryLocationInput, RecallImpactInput, RecallInput, ShipmentInput } from './member-b-core';

export async function createDistributor(input: DistributorInput) {
  return createDistributorCore(pool, input);
}

export async function getAllDistributors() {
  return getAllDistributorsCore(pool);
}

export async function getDistributorById(distributorId: number) {
  return getDistributorByIdCore(pool, distributorId);
}

export async function updateDistributor(distributorId: number, input: Partial<DistributorInput>) {
  return updateDistributorCore(pool, distributorId, input);
}

export async function deleteDistributor(distributorId: number) {
  return deleteDistributorCore(pool, distributorId);
}

export async function createShipment(input: ShipmentInput) {
  return createShipmentCore(pool, input);
}

export async function getAllShipments() {
  return getAllShipmentsCore(pool);
}

export async function getShipmentById(shipmentId: number) {
  return getShipmentByIdCore(pool, shipmentId);
}

export async function updateShipment(shipmentId: number, input: Partial<ShipmentInput>) {
  return updateShipmentCore(pool, shipmentId, input);
}

export async function deleteShipment(shipmentId: number) {
  return deleteShipmentCore(pool, shipmentId);
}

export async function createInventoryLocation(input: InventoryLocationInput) {
  return createInventoryLocationCore(pool, input);
}

export async function getAllInventoryLocations() {
  return getAllInventoryLocationsCore(pool);
}

export async function getInventoryLocationById(locationId: number) {
  return getInventoryLocationByIdCore(pool, locationId);
}

export async function updateInventoryLocation(locationId: number, input: Partial<InventoryLocationInput>) {
  return updateInventoryLocationCore(pool, locationId, input);
}

export async function deleteInventoryLocation(locationId: number) {
  return deleteInventoryLocationCore(pool, locationId);
}

export async function createInventory(input: InventoryInput) {
  return createInventoryCore(pool, input);
}

export async function getAllInventory() {
  return getAllInventoryCore(pool);
}

export async function getInventoryById(inventoryId: number) {
  return getInventoryByIdCore(pool, inventoryId);
}

export async function updateInventory(inventoryId: number, input: Partial<InventoryInput>) {
  return updateInventoryCore(pool, inventoryId, input);
}

export async function deleteInventory(inventoryId: number) {
  return deleteInventoryCore(pool, inventoryId);
}

export async function createAppUser(input: AppUserInput) {
  return createAppUserCore(pool, input);
}

export async function getAllAppUsers() {
  return getAllAppUsersCore(pool);
}

export async function getAppUserById(userId: number) {
  return getAppUserByIdCore(pool, userId);
}

export async function updateAppUser(userId: number, input: Partial<AppUserInput>) {
  return updateAppUserCore(pool, userId, input);
}

export async function deleteAppUser(userId: number) {
  return deleteAppUserCore(pool, userId);
}

export async function createRecall(input: RecallInput) {
  return createRecallCore(pool, input);
}

export async function getAllRecalls() {
  return getAllRecallsCore(pool);
}

export async function getRecallById(recallId: number) {
  return getRecallByIdCore(pool, recallId);
}

export async function updateRecall(recallId: number, input: Partial<RecallInput>) {
  return updateRecallCore(pool, recallId, input);
}

export async function deleteRecall(recallId: number) {
  return deleteRecallCore(pool, recallId);
}

export async function createRecallImpact(input: RecallImpactInput) {
  return createRecallImpactCore(pool, input);
}

export async function getAllRecallImpacts() {
  return getAllRecallImpactsCore(pool);
}

export async function getRecallImpactById(recallImpactId: number) {
  return getRecallImpactByIdCore(pool, recallImpactId);
}

export async function updateRecallImpact(recallImpactId: number, input: Partial<RecallImpactInput>) {
  return updateRecallImpactCore(pool, recallImpactId, input);
}

export async function deleteRecallImpact(recallImpactId: number) {
  return deleteRecallImpactCore(pool, recallImpactId);
}

export default {
  createDistributor,
  getAllDistributors,
  getDistributorById,
  updateDistributor,
  deleteDistributor,
  createShipment,
  getAllShipments,
  getShipmentById,
  updateShipment,
  deleteShipment,
  createInventoryLocation,
  getAllInventoryLocations,
  getInventoryLocationById,
  updateInventoryLocation,
  deleteInventoryLocation,
  createInventory,
  getAllInventory,
  getInventoryById,
  updateInventory,
  deleteInventory,
  createAppUser,
  getAllAppUsers,
  getAppUserById,
  updateAppUser,
  deleteAppUser,
  createRecall,
  getAllRecalls,
  getRecallById,
  updateRecall,
  deleteRecall,
  createRecallImpact,
  getAllRecallImpacts,
  getRecallImpactById,
  updateRecallImpact,
  deleteRecallImpact,
};

